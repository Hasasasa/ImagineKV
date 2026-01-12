import { GenerationConfig } from "../types";
import { getSystemPrompt } from "../utils/systemPrompts";
import { ParsedPrompt } from "../utils/promptParser";

const normalizeBaseUrl = (url: string) => url.trim().replace(/\/+$/, "");

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = 30000
) => {
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

const getThirdPartyConfig = () => {
  const apiKey = localStorage.getItem("custom_api_key") || "";
  const baseUrl = (localStorage.getItem("third_party_url") || "").trim();
  return { apiKey, baseUrl };
};

const stripJsonCodeFence = (text: string) => {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "").trim();
  }
  return trimmed;
};

const postChatCompletions = async (baseUrl: string, apiKey: string, body: any) => {
  const url = `${normalizeBaseUrl(baseUrl)}/v1/chat/completions`;
  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    30000
  );
  if (!res.ok) throw new Error(`第三方请求失败(${res.status}): ${await res.text()}`);
  return await res.json();
};

const postImagesGenerations = async (baseUrl: string, apiKey: string, body: any) => {
  const url = `${normalizeBaseUrl(baseUrl)}/v1/images/generations`;
  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    60000
  );
  if (!res.ok) throw new Error(`第三方请求失败(${res.status}): ${await res.text()}`);
  return await res.json();
};

const extractChatText = (json: any): string => {
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c: any) => (typeof c?.text === "string" ? c.text : ""))
      .filter(Boolean)
      .join("\n");
  }
  return "";
};

const mapAspectRatioToSize = (aspectRatio: string, imageSize: string) => {
  const isHigh = imageSize === "4K";
  const isMid = imageSize === "2K";

  const base = isHigh ? 2048 : isMid ? 1536 : 1024;
  const wide = isHigh ? 2048 : 1792;
  const tall = isHigh ? 2048 : 1792;

  switch (aspectRatio) {
    case "9:16":
      return `${base}x${tall}`;
    case "16:9":
      return `${wide}x${base}`;
    case "21:9":
      return `${wide}x${Math.floor(base * 0.75)}`;
    case "2:3":
      return `${base}x${Math.floor(base * 1.5)}`;
    case "3:2":
      return `${Math.floor(base * 1.5)}x${base}`;
    case "3:4":
      return `${base}x${Math.floor(base * (4 / 3))}`;
    case "4:3":
      return `${Math.floor(base * (4 / 3))}x${base}`;
    case "4:5":
      return `${base}x${Math.floor(base * 1.25)}`;
    case "5:4":
      return `${Math.floor(base * 1.25)}x${base}`;
    case "1:1":
    default:
      return `${base}x${base}`;
  }
};

export interface AnalysisResult {
  report: string;
  prompts: ParsedPrompt[];
  rawText: string;
}

export const analyzeImageAndGeneratePromptsOpenAI = async (
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
  if (!apiKey.trim()) throw new Error("请输入 API Key");
  if (!baseUrl) throw new Error("请输入第三方网址");

  const systemPrompt = getSystemPrompt(
    options?.brandName,
    options?.customRequirements,
    options?.language,
    options?.visualStyle,
    options?.typographyStyle,
    options?.aspectRatio
  );

  const dataUrl = `data:${mimeType};base64,${base64Image}`;
  const json1 = await postChatCompletions(baseUrl, apiKey, {
    model: "google/gemini-3-flash-preview",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: systemPrompt },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const rawText = extractChatText(json1);
  if (!rawText) throw new Error("无法生成分析结果");

  const formattingPrompt = `你是一个数据格式化助手。请将下方 Input Text 解析为 JSON，并且只返回 JSON：\n\n{\n  \"report\": \"string\",\n  \"prompts\": [{\"id\":\"string(optional)\",\"title\":\"string\",\"prompt\":\"string\",\"negativePrompt\":\"string(optional)\"}]\n}\n\n要求：\n- report 保留 Markdown\n- prompts 的 prompt 字段必须包含完整提示块内容\n\nInput Text:\n${rawText}`;

  const json2 = await postChatCompletions(baseUrl, apiKey, {
    model: "google/gemini-3-flash-preview",
    messages: [{ role: "user", content: formattingPrompt }],
  });

  const formattedText = extractChatText(json2);
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

export const generateImageContentOpenAI = async (
  prompt: string,
  _base64Image: string | null,
  _mimeType: string | null,
  config: GenerationConfig
): Promise<string> => {
  const { apiKey, baseUrl } = getThirdPartyConfig();
  if (!apiKey.trim()) throw new Error("请输入 API Key");
  if (!baseUrl) throw new Error("请输入第三方网址");

  const size = mapAspectRatioToSize(config.aspectRatio, config.imageSize);
  const json = await postImagesGenerations(baseUrl, apiKey, {
    model: config.model,
    prompt,
    size,
    response_format: "b64_json",
  });

  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("未返回图片数据（b64_json）");
  return `data:image/png;base64,${b64}`;
};
