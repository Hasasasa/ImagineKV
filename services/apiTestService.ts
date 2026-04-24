import { GoogleGenAI } from "@google/genai";
import { getModel } from "../utils/models";
import { fetchWithTimeout, ensureOk } from "../utils/http";

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
        timeoutMs: 60000,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: getModel('analysis'),
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      await ensureOk(res, url);
      await res.json();
      return;
    }

    const url = buildThirdPartyGenerateContentUrl(thirdPartyUrl, getModel('analysis'));
    const res = await fetchWithTimeout(url, {
      method: "POST",
      timeoutMs: 60000,
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

    await ensureOk(res, url);
    await res.json();
    return;
  }

  const baseUrl = normalizeBaseUrl(config.baseUrl || "https://generativelanguage.googleapis.com");
  const ai = new GoogleGenAI({ apiKey, httpOptions: { baseUrl } });
  const response = await ai.models.generateContent({
    model: getModel('analysis'),
    contents: { parts: [{ text: "ping" }] },
    config: { maxOutputTokens: 8 },
  });

  // 这里不强依赖 `text` 非空：有些情况下 SDK 可能返回空文本但请求已成功（例如输出被过滤/仅结构化返回等）。
  // 只要请求成功返回了 candidates 或 text 字段，就认为 API 可用。
  const hasCandidates = Array.isArray((response as any)?.candidates) && (response as any).candidates.length > 0;
  const hasTextField = typeof (response as any)?.text === "string";
  if (!hasCandidates && !hasTextField) throw new Error("未收到模型返回");
};
