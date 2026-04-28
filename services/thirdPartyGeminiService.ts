import { GenerationConfig } from "../types";
import { getSystemPrompt } from "../utils/systemPrompts";
import { ParsedPrompt } from "../utils/promptParser";
import { getModel } from "../utils/models";
import { fetchWithTimeout, ensureOk } from "../utils/http";
import { log, error as logError } from "../utils/logger";

const getThirdPartyConfig = () => {
  const apiKey = localStorage.getItem("custom_api_key") || "";
  const baseUrl = (localStorage.getItem("third_party_url") || "").trim();
  return { apiKey, baseUrl };
};

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, "");

const buildGenerateContentUrl = (baseUrl: string, model: string) =>
  `${normalizeBaseUrl(baseUrl)}/v1beta/models/${encodeURIComponent(model)}:generateContent`;

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
    throw new Error("请先点击右上角【配置 API】填写您的 API Key");
  }
  if (!baseUrl) {
    throw new Error("请先在 API 配置中选择第三方请求并填写第三方网址");
  }

  const systemPrompt = getSystemPrompt(
    options?.brandName,
    options?.customRequirements,
    options?.language,
    options?.visualStyle,
    options?.typographyStyle,
    options?.aspectRatio
  );

  const url1 = buildGenerateContentUrl(baseUrl, getModel('analysis'));
  const res1 = await fetchWithTimeout(url1, {
    method: "POST",
    timeoutMs: 120000,
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
  });
  await ensureOk(res1, url1);
  const json1 = await res1.json();
  const rawText = extractText(json1);
  if (!rawText) throw new Error("无法生成分析结果");

  const url2 = buildGenerateContentUrl(baseUrl, getModel('formatting'));
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

  const res2 = await fetchWithTimeout(url2, {
    method: "POST",
    timeoutMs: 90000,
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
  });
  await ensureOk(res2, url2);
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
    throw new Error("请先点击右上角【配置 API】填写您的 API Key");
  }
  if (!baseUrl) {
    throw new Error("请先在 API 配置中选择第三方请求并填写第三方网址");
  }

  const parts: any[] = [];
  if (base64Image && mimeType) {
    parts.push({ inlineData: { data: base64Image, mimeType } });
  }
  parts.push({ text: prompt });

  const url = buildGenerateContentUrl(baseUrl, config.model);
  const reqId = Math.random().toString(36).slice(2, 8);
  const t0 = Date.now();
  log('Image', '→ request', {
    reqId,
    model: config.model,
    url,
    promptLen: prompt.length,
    promptPreview: prompt.slice(0, 80),
    hasInputImage: !!base64Image,
    aspectRatio: config.aspectRatio,
    imageSize: config.imageSize,
  });

  let res: Response;
  try {
    res = await fetchWithTimeout(url, {
      method: "POST",
      timeoutMs: 120000,
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
    });
  } catch (e: any) {
    logError('Image', '✗ fetch failed', { reqId, ms: Date.now() - t0, message: e?.message });
    throw e;
  }
  log('Image', '← response', { reqId, status: res.status, ms: Date.now() - t0 });

  try {
    await ensureOk(res, url);
  } catch (e: any) {
    logError('Image', '✗ non-2xx', { reqId, status: e?.status, ms: Date.now() - t0, body: (e?.body || '').slice(0, 500) });
    throw e;
  }

  const json = await res.json();
  const base64 = extractInlineImageBase64(json);
  log('Image', base64 ? '✓ got image' : '✗ no image in response', {
    reqId,
    ms: Date.now() - t0,
    base64Len: base64?.length || 0,
    topLevelKeys: Object.keys(json || {}),
    candidateKeys: Object.keys(json?.candidates?.[0]?.content?.parts?.[0] || {}),
  });
  if (!base64) throw new Error("未返回图片数据");
  return `data:image/png;base64,${base64}`;
};

