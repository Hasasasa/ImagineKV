import { GoogleGenAI } from "@google/genai";

export type ApiTestMode = "official" | "third_party";

export interface ApiTestConfig {
  mode: ApiTestMode;
  apiKey: string;
  baseUrl: string;
  thirdPartyUrl: string;
  thirdPartyProtocol?: "gemini" | "openai";
}

const normalizeBaseUrl = (url: string) => url.trim().replace(/\/+$/, "");

const buildThirdPartyGenerateContentUrl = (baseUrl: string, model: string) =>
  `${normalizeBaseUrl(baseUrl)}/v1beta/models/${encodeURIComponent(model)}:generateContent`;

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const testApiConnection = async (config: ApiTestConfig): Promise<void> => {
  const apiKey = (config.apiKey || "").trim();
  if (!apiKey) throw new Error("请输入 API Key");

  if (config.mode === "third_party") {
    const thirdPartyUrl = (config.thirdPartyUrl || "").trim();
    if (!thirdPartyUrl) throw new Error("请输入第三方网址");

    if ((config.thirdPartyProtocol || "gemini") === "openai") {
      const url = `${normalizeBaseUrl(thirdPartyUrl)}/v1/chat/completions`;
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      if (!res.ok) throw new Error(`第三方请求失败(${res.status}): ${await res.text()}`);
      await res.json();
      return;
    }

    const res = await fetchWithTimeout(buildThirdPartyGenerateContentUrl(thirdPartyUrl, "gemini-3-flash-preview"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "ping" }] }],
        generationConfig: { maxOutputTokens: 8 },
      }),
    });

    if (!res.ok) throw new Error(`第三方请求失败(${res.status}): ${await res.text()}`);
    await res.json();
    return;
  }

  const baseUrl = normalizeBaseUrl(config.baseUrl || "https://generativelanguage.googleapis.com");
  const ai = new GoogleGenAI({ apiKey, baseUrl });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: [{ text: "ping" }] },
    config: { maxOutputTokens: 8 },
  });

  // 这里不强依赖 `text` 非空：有些情况下 SDK 可能返回空文本但请求已成功（例如输出被过滤/仅结构化返回等）。
  // 只要请求成功返回了 candidates 或 text 字段，就认为 API 可用。
  const hasCandidates = Array.isArray((response as any)?.candidates) && (response as any).candidates.length > 0;
  const hasTextField = typeof (response as any)?.text === "string";
  if (!hasCandidates && !hasTextField) throw new Error("未收到模型返回");
};
