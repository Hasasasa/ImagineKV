import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GenerationConfig, BatchItem } from "../types";
import { getSystemPrompt } from "../utils/systemPrompts";
import { ParsedPrompt } from "../utils/promptParser";

// 获取配置辅助函数
const getApiConfig = () => {
  const apiKey = localStorage.getItem('custom_api_key') || '';
  const baseUrl = localStorage.getItem('custom_base_url') || 'https://generativelanguage.googleapis.com';
  return { apiKey, baseUrl };
};

export const ensureApiKey = async (): Promise<boolean> => {
  const { apiKey } = getApiConfig();
  if (apiKey) return true;
  
  // 如果没有 key，触发 UI 提示（这里简单返回 false，App UI 会显示未配置状态）
  return false;
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
    const { apiKey, baseUrl } = getApiConfig();
    
    if (!apiKey) {
        throw new Error("请先点击右上角【配置 API】填写您的 API Key");
    }

    // 初始化 AI 实例，使用自定义 Base URL
    const ai = new GoogleGenAI({ apiKey, baseUrl });

    // --- STEP 1: Creative Analysis & Generation ---
    const systemPrompt = getSystemPrompt(
      options?.brandName, 
      options?.customRequirements,
      options?.language,
      options?.visualStyle,
      options?.typographyStyle,
      options?.aspectRatio
    );

    const analysisResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { text: systemPrompt },
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType
                    }
                }
            ]
        },
        config: {
            maxOutputTokens: 8192,
        }
    });

    const rawText = analysisResponse.text || "";
    if (!rawText) throw new Error("无法生成分析结果");

    // --- STEP 2: Structural Formatting ---
    const formattingSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        report: {
          type: Type.STRING,
          description: "The cleaned product analysis report text.",
        },
        prompts: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              prompt: { 
                 type: Type.STRING, 
                 description: "The COMPLETE content of the prompt block. MUST include: 1. Visual description (生成提示词) 2. Design Concept (画面设计构思) 3. Layout Instructions (详细排版布局说明) 4. Logo & CTA details. Do NOT summarize or truncate." 
              },
              negativePrompt: { type: Type.STRING, nullable: true },
            },
            required: ["title", "prompt"],
          },
        },
      },
      required: ["report", "prompts"],
    };

    const formatterResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            text: `You are a data formatting assistant. Process the Input Text below.
            
            1. **Extract & Clean Report**: 
               - Extract the content from "STEP 1" (Product Analysis).
               - **CRITICAL**: Remove the main header lines like "# Step 1...", "Product Analysis Report", "# 第一步..." or "# 🛍️...". 
               - **START OUTPUT DIRECTLY** from the first content field, usually "**Brand Name**:" or "**品牌名称**:".
               - Keep all Markdown formatting (bolding **, bullet points -).
               - Stop before Step 2.
            
            2. **Extract Prompts**: 
               - Extract all 10 structured prompts.
               - **CRITICAL**: The 'prompt' field must contain EVERYTHING inside the prompt block (usually enclosed in { ... } or **{ ... }**).
               - Include "画面设计构思", "详细排版布局说明", "LOGO位置", "CTA按钮" etc.
               - Do NOT leave out the design concepts or layout instructions.
               - Keep the formatting (line breaks) within the prompt string.

            Input Text:
            ${rawText}`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: formattingSchema,
      }
    });

    try {
      const jsonResult = JSON.parse(formatterResponse.text || "{}");
      
      const prompts = (jsonResult.prompts || []).map((p: any, idx: number) => ({
        id: p.id || `auto-${Date.now()}-${idx}`,
        title: p.title || `Image ${idx + 1}`,
        prompt: p.prompt || "",
        negativePrompt: p.negativePrompt || ""
      }));

      return {
        report: jsonResult.report || rawText,
        prompts: prompts,
        rawText: rawText
      };

    } catch (e) {
      console.error("JSON Parsing failed", e);
      return { report: rawText, prompts: [], rawText: rawText };
    }
};

export const generateImageContent = async (
  prompt: string,
  base64Image: string | null,
  mimeType: string | null,
  config: GenerationConfig
): Promise<string> => {
  
  const { apiKey, baseUrl } = getApiConfig();
  if (!apiKey) throw new Error("请先点击右上角【配置 API】填写您的 API Key");

  const ai = new GoogleGenAI({ apiKey, baseUrl });
  const parts: any[] = [];

  if (base64Image && mimeType) {
    parts.push({
      inlineData: { data: base64Image, mimeType: mimeType },
    });
  }
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: config.model,
      contents: { parts: parts },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio,
          imageSize: config.imageSize,
        },
      },
    });

    const contentParts = response.candidates?.[0]?.content?.parts;
    if (contentParts) {
        for (const part of contentParts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error("No image data found.");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};