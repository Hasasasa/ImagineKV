import React, { useRef } from 'react';
import { Upload, X, Loader2, BrainCircuit, Tag, MessageSquarePlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { AspectRatio, ImageSize, GenerationConfig, BatchItem } from '../types';

interface ControlPanelProps {
  prompt: string;
  setPrompt: (val: string) => void;
  batchQueue: BatchItem[];
  setBatchQueue: (items: BatchItem[]) => void;
  selectedImage: File | null;
  setSelectedImage: (file: File | null) => void;
  config: GenerationConfig;
  setConfig: (config: GenerationConfig) => void;
  isGenerating: boolean;
  isAnalyzing: boolean;
  analyzeStatus: 'idle' | 'success' | 'error';
  analyzeElapsedMs: number | null;
  onAnalyze: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  batchQueue,
  setBatchQueue,
  selectedImage,
  setSelectedImage,
  config,
  setConfig,
  isAnalyzing,
  analyzeStatus,
  analyzeElapsedMs,
  onAnalyze,
}) => {
  const formatMs = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
      setBatchQueue([]);
    }
  };

  return (
    <aside className="w-full lg:w-[360px] shrink-0 flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      <div className="px-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 h-[65px] shrink-0">
        <h2 className="font-bold text-slate-800">生成参数</h2>
        {analyzeStatus === 'success' && analyzeElapsedMs != null ? (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            已生成 {batchQueue.length} 个方案 · {formatMs(analyzeElapsedMs)}
          </span>
        ) : analyzeStatus === 'error' && analyzeElapsedMs != null ? (
          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            分析失败 · {formatMs(analyzeElapsedMs)}
          </span>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">第一步: 上传产品图</label>
          {!selectedImage ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-slate-50 transition-all group"
            >
              <Upload className="w-7 h-7 text-slate-300 group-hover:text-indigo-500 mb-1.5" />
              <span className="text-sm font-medium text-slate-600">点击上传图片</span>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 h-36">
              <img src={URL.createObjectURL(selectedImage)} className="w-full h-full object-contain" />
              <button onClick={() => setSelectedImage(null)} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">第二步: 偏好设置</label>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-500 ml-1">比例</span>
              <select
                value={config.aspectRatio}
                onChange={e => setConfig({...config, aspectRatio: e.target.value as AspectRatio})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value={AspectRatio.Square}>1:1 方形</option>
                <option value={AspectRatio.Portrait23}>2:3 竖版</option>
                <option value={AspectRatio.Landscape32}>3:2 横版</option>
                <option value={AspectRatio.Portrait}>3:4 竖版</option>
                <option value={AspectRatio.Landscape}>4:3 横版</option>
                <option value={AspectRatio.Portrait45}>4:5 竖版</option>
                <option value={AspectRatio.Landscape54}>5:4 横版</option>
                <option value={AspectRatio.Tall}>9:16 竖屏</option>
                <option value={AspectRatio.Wide}>16:9 宽屏</option>
                <option value={AspectRatio.UltraWide}>21:9 超宽屏</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-500 ml-1">画质</span>
              <select
                value={config.imageSize}
                onChange={e => setConfig({...config, imageSize: e.target.value as ImageSize})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium"
              >
                <option value={ImageSize.OneK}>1K 标清</option>
                <option value={ImageSize.TwoK}>2K 高清</option>
                <option value={ImageSize.FourK}>4K 超清</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-500 ml-1">语言</span>
              <select
                value={config.language}
                onChange={e => setConfig({ ...config, language: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="zh">CN 中文</option>
                <option value="en">US English</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-500 ml-1">视觉风格</span>
              <select
                value={config.visualStyle || 'auto'}
                onChange={e => setConfig({ ...config, visualStyle: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="auto">✨ AI 智能推荐</option>
                <option value="杂志编辑风">📰 杂志编辑风</option>
                <option value="水彩艺术风">🎨 水彩艺术风</option>
                <option value="科技未来风">🧠 科技未来风</option>
                <option value="复古胶片风">📼 复古胶片风</option>
                <option value="极简北欧风">❄️ 极简北欧风</option>
                <option value="霓虹赛博风">🌃 霓虹赛博风</option>
                <option value="自然有机风">🌿 自然有机风</option>
              </select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <span className="text-xs font-medium text-slate-500 ml-1">文字排版效果</span>
              <select
                value={config.typographyStyle || 'auto'}
                onChange={e => setConfig({ ...config, typographyStyle: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="auto">✨ AI 智能推荐</option>
                <option value="手写体（艺术）">✍️ 手写体（艺术）</option>
                <option value="粗衬线（杂志）">🖋️ 粗衬线（杂志）</option>
                <option value="玻璃拟态（现代）">💧 玻璃拟态（现代）</option>
                <option value="3D浮雕（奢华）">🧊 3D 浮雕（奢华）</option>
                <option value="无衬线（赛博）">⚡ 无衬线（赛博）</option>
                <option value="极细线条（极简）">🪡 极细线条（极简）</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="品牌名称 (识别或填入)"
                value={config.brandName}
                onChange={e => setConfig({...config, brandName: e.target.value})}
                className="bg-transparent border-none text-sm w-full font-medium focus:ring-0 p-0"
              />
            </div>
            <div className="flex items-start gap-2">
              <MessageSquarePlus className="w-4 h-4 text-slate-400 mt-1" />
              <textarea
                placeholder="特殊要求..."
                value={config.customRequirements}
                onChange={e => setConfig({...config, customRequirements: e.target.value})}
                className="bg-transparent border-none text-sm w-full font-medium focus:ring-0 p-0 resize-none h-16"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <button
          onClick={onAnalyze}
          disabled={!selectedImage || isAnalyzing}
          className={`w-full py-3.5 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg ${
            !selectedImage || isAnalyzing
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-black text-white hover:bg-slate-800 shadow-slate-200'
          }`}
        >
          {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
          {isAnalyzing ? '正在分析...' : batchQueue.length > 0 ? '重新分析生成方案' : '分析生成方案'}
        </button>
      </div>
    </aside>
  );
};

export default ControlPanel;
