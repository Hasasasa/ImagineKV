export enum AspectRatio {
  Square = "1:1",
  Portrait = "3:4",
  Landscape = "4:3",
  Wide = "16:9",
  Tall = "9:16",
}

export enum ImageSize {
  OneK = "1K",
  TwoK = "2K",
  FourK = "4K",
}

export interface GenerationConfig {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  model: string;
  brandName?: string;
  customRequirements?: string;
  // 新增参数定义
  language: 'zh' | 'en'; // 1. 语言
  visualStyle?: string;  // 2. 视觉风格
  typographyStyle?: string; // 3. 文字排版效果
}

export interface GeneratedImage {
  url: string;
  timestamp: number;
}

export interface BatchItem {
  id: string;
  title: string;
  prompt: string; // 完整的 prompt (含 negative)
  status: 'idle' | 'pending' | 'success' | 'error';
  imageUrl?: string;
  error?: string;
}