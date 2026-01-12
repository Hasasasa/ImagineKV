import { GoogleGenAI, Schema, Type } from '@google/genai';
import { GenerationConfig } from '../types';
import { extractAnalysisReport, parseBulkPrompts, ParsedPrompt } from '../utils/promptParser';
import { getSystemPrompt } from '../utils/systemPrompts';

type AuthMode = 'apiKey' | 'bearer';

const getApiConfig = () => {
  const apiKey = localStorage.getItem('custom_api_key') || '';
  const baseUrl = localStorage.getItem('custom_base_url') || 'https://generativelanguage.googleapis.com';
  const authMode = (localStorage.getItem('custom_auth_mode') as AuthMode) || 'apiKey';
  return { apiKey, baseUrl, authMode };
};

export const ensureApiKey = async (): Promise<boolean> => {
  const { apiKey } = getApiConfig();
  return !!apiKey;
};

const normalizeApiBase = (baseUrl: string) => {
  const trimmed = (baseUrl || '').trim().replace(/\/+$/, '');
  return trimmed || 'https://generativelanguage.googleapis.com';
};

const getV1BetaBase = (baseUrl: string) => {
  const normalized = normalizeApiBase(baseUrl);
  return normalized.endsWith('/v1beta') ? normalized : `${normalized}/v1beta`;
};

const isOfficialGoogleApiBase = (baseUrl: string) => {
  try {
    const url = new URL(normalizeApiBase(baseUrl));
    return url.hostname.endsWith('generativelanguage.googleapis.com');
  } catch {
    return false;
  }
};

const shouldUseBearer = (authMode: AuthMode, baseUrl: string) => {
  if (authMode === 'bearer') return true;
  return !isOfficialGoogleApiBase(baseUrl);
};

type ContentPart =
  | { text: string }
  | { inlineData: { data: string; mimeType: string } };

type GenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string; inlineData?: { data?: string; mimeType?: string } }>;
    };
  }>;
  error?: unknown;
};

const generateContentViaFetch = async (args: {
  apiKey: string;
  baseUrl: string;
  model: string;
  parts: ContentPart[];
  generationConfig?: Record<string, unknown>;
}): Promise<GenerateContentResponse> => {
  const endpointBase = getV1BetaBase(args.baseUrl);
  const url = `${endpointBase}/models/${encodeURIComponent(args.model)}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: args.parts }],
      ...(args.generationConfig ? { generationConfig: args.generationConfig } : {}),
    }),
  });

  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok || json?.error) {
    const errPayload = json?.error ?? json;
    throw new Error(typeof errPayload === 'string' ? errPayload : JSON.stringify(errPayload));
  }
  return json as GenerateContentResponse;
};

const generateContent = async (args: {
  model: string;
  parts: ContentPart[];
  config?: Record<string, unknown>;
}): Promise<any> => {
  const { apiKey, baseUrl, authMode } = getApiConfig();
  if (!apiKey) throw new Error('请先填写 API Key');

  if (shouldUseBearer(authMode, baseUrl)) {
    return generateContentViaFetch({
      apiKey,
      baseUrl,
      model: args.model,
      parts: args.parts,
      generationConfig: args.config,
    });
  }

  const ai = new GoogleGenAI({ apiKey, baseUrl: normalizeApiBase(baseUrl) });
  return ai.models.generateContent({
    model: args.model,
    contents: { parts: args.parts as any },
    config: args.config as any,
  });
};

const getTextFromResponse = (resp: any) => {
  if (typeof resp?.text === 'string') return resp.text;
  const parts = resp?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((p: any) => (typeof p?.text === 'string' ? p.text : '')).join('');
};

export const testApiConnection = async (): Promise<void> => {
  await generateContent({
    model: 'gemini-2.5-flash',
    parts: [{ text: 'ping' }],
    config: { maxOutputTokens: 8 },
  });
};

export interface AnalysisResult {
  report: string;
  prompts: ParsedPrompt[];
  rawText: string;
}

export const analyzeImageAndGeneratePrompts = async (
  base64Image: string,
  mimeType: string,
  options?: {
    brandName?: string;
    customRequirements?: string;
    language?: 'zh' | 'en';
    visualStyle?: string;
    typographyStyle?: string;
    aspectRatio?: string;
  }
): Promise<AnalysisResult> => {
  const { apiKey, baseUrl, authMode } = getApiConfig();
  if (!apiKey) {
    throw new Error('请先点击右上角【配置 API】填写您的 API Key');
  }

  const systemPrompt = getSystemPrompt(
    options?.brandName,
    options?.customRequirements,
    options?.language,
    options?.visualStyle,
    options?.typographyStyle,
    options?.aspectRatio
  );

  const analysisResponse = await generateContent({
    model: 'gemini-3-flash-preview',
    parts: [{ text: systemPrompt }, { inlineData: { data: base64Image, mimeType } }],
    config: { maxOutputTokens: 8192 },
  });

  const rawText = getTextFromResponse(analysisResponse) || '';
  if (!rawText) throw new Error('无法生成分析结果');

  if (shouldUseBearer(authMode, baseUrl)) {
    const prompts = parseBulkPrompts(rawText);
    const report = extractAnalysisReport(rawText) || rawText;
    return { report, prompts, rawText };
  }

  const formattingSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      report: { type: Type.STRING },
      prompts: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            prompt: { type: Type.STRING },
            negativePrompt: { type: Type.STRING, nullable: true },
          },
          required: ['title', 'prompt'],
        },
      },
    },
    required: ['report', 'prompts'],
  };

  const ai = new GoogleGenAI({ apiKey, baseUrl: normalizeApiBase(baseUrl) });
  const formatterResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {
          text: `You are a data formatting assistant. Process the Input Text below.

1) Extract & Clean Report (STEP 1 only).
2) Extract all structured prompts. Keep full content.

Input Text:
${rawText}`,
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: formattingSchema,
    },
  });

  try {
    const jsonResult = JSON.parse((formatterResponse as any).text || '{}');
    const prompts = (jsonResult.prompts || []).map((p: any, idx: number) => ({
      id: p.id || `auto-${Date.now()}-${idx}`,
      title: p.title || `Image ${idx + 1}`,
      prompt: p.prompt || '',
      negativePrompt: p.negativePrompt || '',
    }));
    return { report: jsonResult.report || rawText, prompts, rawText };
  } catch {
    return { report: rawText, prompts: [], rawText };
  }
};

export const generateImageContent = async (
  prompt: string,
  base64Image: string | null,
  mimeType: string | null,
  config: GenerationConfig
): Promise<string> => {
  const parts: any[] = [];
  if (base64Image && mimeType) {
    parts.push({ inlineData: { data: base64Image, mimeType } });
  }
  parts.push({ text: prompt });

  const response = await generateContent({
    model: config.model,
    parts,
    config: {
      imageConfig: {
        aspectRatio: config.aspectRatio,
        imageSize: config.imageSize,
      },
    },
  });

  const contentParts = response?.candidates?.[0]?.content?.parts;
  if (Array.isArray(contentParts)) {
    for (const part of contentParts) {
      if (part?.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error('No image data found.');
};

