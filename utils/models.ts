export type ModelKind = 'analysis' | 'formatting' | 'image';
export type ProtocolKind = 'gemini' | 'openai';

export const PROTOCOLS: ProtocolKind[] = ['gemini', 'openai'];
export const MODEL_KINDS: ModelKind[] = ['analysis', 'formatting', 'image'];

export const DEFAULT_MODELS: Record<ProtocolKind, Record<ModelKind, string>> = {
  gemini: {
    analysis: 'gemini-2.5-pro',
    formatting: 'gemini-2.5-flash',
    image: 'gemini-3-pro-image-preview',
  },
  openai: {
    analysis: 'google/gemini-3-flash-preview',
    formatting: 'google/gemini-3-flash-preview',
    image: 'google/gemini-3-pro-image-preview',
  },
};

export const MODEL_LABELS: Record<ModelKind, { title: string; desc: string }> = {
  analysis: { title: '图像分析', desc: '解析上传图片，生成设计报告与提示词' },
  formatting: { title: '提示词格式化', desc: '将分析结果格式化为结构化 JSON' },
  image: { title: '图像生成', desc: '最终出图使用的模型' },
};

export const PROTOCOL_LABELS: Record<ProtocolKind, { title: string; desc: string }> = {
  gemini: { title: 'Gemini 原生协议', desc: '官方 API 或兼容 generateContent 的中转' },
  openai: { title: 'OpenAI 兼容协议', desc: '中转站使用 /v1/chat/completions 等端点' },
};

export const modelStorageKey = (kind: ModelKind, protocol: ProtocolKind) =>
  `model_${kind}_${protocol}`;

const legacyKey = (kind: ModelKind) => `model_${kind}`;

export const getEffectiveProtocol = (): ProtocolKind => {
  try {
    const mode = localStorage.getItem('api_request_mode') || 'official';
    if (mode !== 'third_party') return 'gemini';
    const proto = localStorage.getItem('third_party_protocol') || 'gemini';
    return proto === 'openai' ? 'openai' : 'gemini';
  } catch {
    return 'gemini';
  }
};

export const getModel = (kind: ModelKind, protocol?: ProtocolKind): string => {
  const p = protocol || getEffectiveProtocol();
  try {
    const scoped = (localStorage.getItem(modelStorageKey(kind, p)) || '').trim();
    if (scoped) return scoped;
    if (p === 'gemini') {
      const legacy = (localStorage.getItem(legacyKey(kind)) || '').trim();
      if (legacy) return legacy;
    }
  } catch {}
  return DEFAULT_MODELS[p][kind];
};

export const setModel = (kind: ModelKind, protocol: ProtocolKind, value: string) => {
  const v = (value || '').trim();
  const key = modelStorageKey(kind, protocol);
  if (v) localStorage.setItem(key, v);
  else localStorage.removeItem(key);
};
