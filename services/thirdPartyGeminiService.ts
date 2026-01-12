import { GenerationConfig } from "../types";
import { getSystemPrompt } from "../utils/systemPrompts";
import { ParsedPrompt } from "../utils/promptParser";

const getThirdPartyConfig = () => {
  const apiKey = localStorage.getItem("custom_api_key") || "";
  const baseUrl = (localStorage.getItem("third_party_url") || "").trim();
  return { apiKey, baseUrl };
};

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, "");

const buildGenerateContentUrl = (baseUrl: string, model: string) =>
  `${normalizeBaseUrl(baseUrl)}/v1beta/models/${encodeURIComponent(model)}:generateContent`;

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit, timeoutMs = 30000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error(`第三方请求超时（${Math.round(timeoutMs / 1000)}s），请检查网络/第三方网关或调低输出量`);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
};

const extractText = (json: any): string => {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p: any) => p?.text).filter(Boolean).join("\n");
};

const extractInlineImageBase64 = (json: any): string | null => {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const part of parts) {
    const data = part?.inlineData?.data;
    if (typeof data === "string" && data.length > 0) return data;
  }
  return null;
};

const stripJsonCodeFence = (text: string) => {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "").trim();
  }
  return trimmed;
};

export interface AnalysisResult {
  report: string;
  prompts: ParsedPrompt[];
  rawText: string;
}

export const analyzeImageAndGeneratePromptsThirdParty = async (
  base64Image: string,
  mimeType: string,
  options?: {
    brandName?: string;
    customRequirements?: string;
    language?: "zh" | "en";
    visualStyle?: string;
    typographyStyle?: string;
    aspectRatio?: string;
  }
): Promise<AnalysisResult> => {
  const { apiKey, baseUrl } = getThirdPartyConfig();
  if (!apiKey) {
    throw new Error("璇峰厛鐐瑰嚮鍙充笂瑙掋€愰厤缃?API銆戝～鍐欐偍鐨?API Key");
  }
  if (!baseUrl) {
    throw new Error("璇峰厛鍦?API 閰嶇疆涓€夋嫨绗涓夋柟璇锋眰骞跺～鍐欑涓夋柟 URL");
  }

  const systemPrompt = getSystemPrompt(
    options?.brandName,
    options?.customRequirements,
    options?.language,
    options?.visualStyle,
    options?.typographyStyle,
    options?.aspectRatio
  );

  const url1 = buildGenerateContentUrl(baseUrl, "gemini-3-flash-preview");
  const res1 = await fetchWithTimeout(
    url1,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { inlineData: { data: base64Image, mimeType } },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 8192 },
      }),
    },
    120000
  );
  if (!res1.ok) throw new Error(`第三方请求失败(${res1.status}): ${await res1.text()}`);
  const json1 = await res1.json();
  const rawText = extractText(json1);
  if (!rawText) throw new Error("鏃犳硶鐢熸垚鍒嗘瀽缁撴灉");

  const url2 = buildGenerateContentUrl(baseUrl, "gemini-2.5-flash");
  const formattingPrompt = `You are a data formatting assistant. Process the Input Text below.

Return ONLY a JSON object with this shape:
{
  "report": "string",
  "prompts": [{"id":"string(optional)","title":"string","prompt":"string","negativePrompt":"string(optional)"}]
}

Rules:
- Keep all Markdown formatting in report.
- Extract all 10 structured prompts if present.
- The 'prompt' field must contain EVERYTHING inside the prompt block (including design concepts and layout instructions).

Input Text:
${rawText}`;

  const res2 = await fetchWithTimeout(
    url2,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: formattingPrompt }] }],
        generationConfig: {
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    },
    90000
  );
  if (!res2.ok) throw new Error(`第三方请求失败(${res2.status}): ${await res2.text()}`);
  const json2 = await res2.json();
  const formattedText = extractText(json2);

  try {
    const parsed = JSON.parse(stripJsonCodeFence(formattedText || ""));
    const prompts = (parsed.prompts || []).map((p: any, idx: number) => ({
      id: p.id || `auto-${Date.now()}-${idx}`,
      title: p.title || `Image ${idx + 1}`,
      prompt: p.prompt || "",
      negativePrompt: p.negativePrompt || "",
    }));
    return { report: parsed.report || rawText, prompts, rawText };
  } catch {
    return { report: rawText, prompts: [], rawText };
  }
};

export const generateImageContentThirdParty = async (
  prompt: string,
  base64Image: string | null,
  mimeType: string | null,
  config: GenerationConfig
): Promise<string> => {
  const { apiKey, baseUrl } = getThirdPartyConfig();
  if (!apiKey) {
    throw new Error("璇峰厛鐐瑰嚮鍙充笂瑙掋€愰厤缃?API銆戝～鍐欐偍鐨?API Key");
  }
  if (!baseUrl) {
    throw new Error("璇峰厛鍦?API 閰嶇疆涓€夋嫨绗涓夋柟璇锋眰骞跺～鍐欑涓夋柟 URL");
  }

  const parts: any[] = [];
  if (base64Image && mimeType) {
    parts.push({ inlineData: { data: base64Image, mimeType } });
  }
  parts.push({ text: prompt });

  const url = buildGenerateContentUrl(baseUrl, config.model);
  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          imageConfig: {
            aspectRatio: config.aspectRatio,
            imageSize: config.imageSize,
          },
        },
      }),
    },
    120000
  );
  if (!res.ok) throw new Error(`第三方请求失败(${res.status}): ${await res.text()}`);
  const json = await res.json();
  const base64 = extractInlineImageBase64(json);
  if (!base64) throw new Error("No image data found.");
  return `data:image/png;base64,${base64}`;
};
