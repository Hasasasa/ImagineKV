import { GenerationConfig } from "../types";
import {
  analyzeImageAndGeneratePrompts,
  generateImageContent,
  AnalysisResult,
} from "./geminiService";
import {
  analyzeImageAndGeneratePromptsThirdParty,
  generateImageContentThirdParty,
} from "./thirdPartyGeminiService";
import {
  analyzeImageAndGeneratePromptsOpenAI,
  generateImageContentOpenAI,
} from "./openAIThirdPartyService";

export type ApiRequestMode = "official" | "third_party";
export type ThirdPartyProtocol = "gemini" | "openai";

export const getApiRequestMode = (): ApiRequestMode => {
  const raw = (localStorage.getItem("api_request_mode") || "official").trim();
  return raw === "third_party" ? "third_party" : "official";
};

export const getThirdPartyProtocol = (): ThirdPartyProtocol => {
  const raw = (localStorage.getItem("third_party_protocol") || "gemini").trim();
  return raw === "openai" ? "openai" : "gemini";
};

export const analyzeImageAndGeneratePromptsUnified = async (
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
  if (getApiRequestMode() === "third_party") {
    if (getThirdPartyProtocol() === "openai") {
      return analyzeImageAndGeneratePromptsOpenAI(base64Image, mimeType, options);
    }
    return analyzeImageAndGeneratePromptsThirdParty(base64Image, mimeType, options);
  }
  return analyzeImageAndGeneratePrompts(base64Image, mimeType, options);
};

export const generateImageContentUnified = async (
  prompt: string,
  base64Image: string | null,
  mimeType: string | null,
  config: GenerationConfig
): Promise<string> => {
  if (getApiRequestMode() === "third_party") {
    if (getThirdPartyProtocol() === "openai") {
      return generateImageContentOpenAI(prompt, base64Image, mimeType, config);
    }
    return generateImageContentThirdParty(prompt, base64Image, mimeType, config);
  }
  return generateImageContent(prompt, base64Image, mimeType, config);
};
