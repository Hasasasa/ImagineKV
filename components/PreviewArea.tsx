import React, { useEffect, useState } from 'react';
import {
  Download, LayoutGrid, AlertCircle, Image as ImageIcon, Loader2, Play, RefreshCw,
  Trash2, X as XIcon, GripVertical, ChevronDown, FileText, CheckCircle2, Clock,
  Sparkles,
} from 'lucide-react';
import { BatchItem, GenerationConfig, AspectRatio } from '../types';
import { downloadImage } from '../utils/imageUtils';
import logoUrl from '../logo/logo.png';

interface PreviewAreaProps {
  batchQueue: BatchItem[];
  setBatchQueue: (items: BatchItem[]) => void;
  isGenerating: boolean;
  isAnalyzing: boolean;
  error: string | null;
  config: GenerationConfig;
  onBatchGenerate: () => void;
  onRegenerate: (id: string) => void;
  onOpenGallery: () => void;
  onPreviewImage: (id: string) => void;
}

const formatMs = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

const LiveTimer: React.FC<{ startedAt: number }> = ({ startedAt }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono tabular-nums">{formatMs(now - startedAt)}</span>;
};

const arToCss = (ar: AspectRatio) => ar.replace(':', ' / ');

const AnalyzingOverlay: React.FC<{ startedAt: number }> = ({ startedAt }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 select-none px-6 text-center">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <img src={logoUrl} alt="ImagineKV" className="w-24 h-24 object-contain animate-rock" />
        <Sparkles className="absolute -top-3 -right-3 w-5 h-5 text-amber-400 animate-pulse" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-bold text-slate-800">AI 正在分析产品图</p>
        <p className="text-xs text-slate-500 max-w-sm">解析图像、设计方案、提取 10 张海报的提示词，请稍等</p>
      </div>
      <div className="text-xs font-mono tabular-nums text-slate-500 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        {formatMs(now - startedAt)}
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-700 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-700 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-700 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};

const PreviewArea: React.FC<PreviewAreaProps> = ({
  batchQueue,
  setBatchQueue,
  isGenerating,
  isAnalyzing,
  error,
  config,
  onBatchGenerate,
  onRegenerate,
  onOpenGallery,
  onPreviewImage,
}) => {
  const [analyzeStartedAt, setAnalyzeStartedAt] = useState<number>(0);
  useEffect(() => {
    if (isAnalyzing) setAnalyzeStartedAt(Date.now());
    else setAnalyzeStartedAt(0);
  }, [isAnalyzing]);


  const total = batchQueue.length;
  const succeeded = batchQueue.filter(i => i.status === 'success').length;
  const hasAnyImage = batchQueue.some(i => !!i.imageUrl);
  const pendingExists = batchQueue.filter(i => i.status === 'idle' || i.status === 'error').length;
  const allDone = total > 0 && batchQueue.every(i => i.status === 'success');

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<Record<string, boolean>>({});

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const next = [...batchQueue];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setBatchQueue(next);
  };

  const updateItem = (id: string, patch: Partial<BatchItem>) => {
    setBatchQueue(batchQueue.map(i => (i.id === id ? { ...i, ...patch } : i)));
  };

  const removeItem = (id: string) => {
    setBatchQueue(batchQueue.filter(i => i.id !== id));
  };

  const clearAll = () => {
    if (hasAnyImage) {
      if (!confirm('队列里已有生成结果，清空会丢失所有图像，确定吗？')) return;
    }
    setBatchQueue([]);
  };

  const cta = (() => {
    if (isAnalyzing) return { label: '正在分析方案...', icon: <Loader2 className="w-4 h-4 animate-spin" />, disabled: true };
    if (isGenerating) return { label: '正在批量生成...', icon: <Loader2 className="w-4 h-4 animate-spin" />, disabled: true };
    if (total === 0) return { label: '等待方案生成', icon: <Play className="w-4 h-4" />, disabled: true };
    if (allDone) return { label: '全部完成', icon: <CheckCircle2 className="w-4 h-4" />, disabled: true };
    if (pendingExists > 0 && succeeded > 0) return { label: `继续生成剩余 ${pendingExists} 张`, icon: <Play className="w-4 h-4 fill-current" />, disabled: false };
    return { label: `开始批量生成 (${total})`, icon: <Play className="w-4 h-4 fill-current" />, disabled: false };
  })();

  return (
    <section className="flex-1 flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm min-h-[600px] w-full">
      <div className="px-4 border-b border-slate-100 flex gap-3 justify-between items-center bg-slate-50/50 h-[65px] shrink-0">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-slate-400" />
          <h3 className="font-bold text-slate-800">方案 & 画廊</h3>
          {total > 0 && (
            <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
              {succeeded}/{total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-rose-500 font-bold hover:underline px-2"
            >
              清空
            </button>
          )}
          {hasAnyImage && (
            <button
              onClick={onOpenGallery}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 px-2 py-1"
            >
              <LayoutGrid className="w-4 h-4" /> 全屏预览
            </button>
          )}
          <button
            onClick={onBatchGenerate}
            disabled={cta.disabled}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md ${
              cta.disabled
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-black text-white hover:bg-slate-800 shadow-slate-200'
            }`}
          >
            {cta.icon}
            {cta.label}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/20 relative">
        {isAnalyzing ? (
          <AnalyzingOverlay startedAt={analyzeStartedAt || Date.now()} />
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
            <AlertCircle className="w-12 h-12 text-rose-200" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : total === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 select-none">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
              <FileText className="w-10 h-10 opacity-20" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest">还没有方案</p>
            <p className="text-xs text-slate-400 max-w-xs text-center">在左侧上传产品图，点击「生成批量海报方案」，方案会在这里展示</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {batchQueue.map((item, idx) => {
              const isOpen = !!expandedId[item.id];
              const isPending = item.status === 'pending';
              const isSuccess = item.status === 'success';
              const isError = item.status === 'error';
              return (
                <div
                  key={item.id}
                  draggable={!isGenerating && !isPending}
                  onDragStart={(e) => {
                    setDragIndex(idx);
                    e.dataTransfer.effectAllowed = 'move';
                    try { e.dataTransfer.setData('text/plain', String(idx)); } catch {}
                  }}
                  onDragOver={(e) => {
                    if (isGenerating) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (overIndex !== idx) setOverIndex(idx);
                  }}
                  onDragLeave={() => { if (overIndex === idx) setOverIndex(null); }}
                  onDrop={(e) => {
                    if (isGenerating) return;
                    e.preventDefault();
                    const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'));
                    if (!Number.isNaN(from)) reorder(from, idx);
                    setDragIndex(null);
                    setOverIndex(null);
                  }}
                  onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                  className={`relative group bg-white rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-all flex flex-col ${
                    dragIndex === idx ? 'opacity-40' : ''
                  } ${
                    overIndex === idx && dragIndex !== null && dragIndex !== idx
                      ? 'border-indigo-400 ring-2 ring-indigo-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div
                    className="relative bg-slate-50 overflow-hidden"
                    style={{ aspectRatio: arToCss(config.aspectRatio) }}
                  >
                    {isSuccess && item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => onPreviewImage(item.id)}
                      />
                    ) : isPending ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-50 to-slate-100">
                        <Loader2 className="w-10 h-10 animate-spin text-slate-800" />
                        <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Generating</div>
                        {item.startedAt && (
                          <div className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <LiveTimer startedAt={item.startedAt} />
                          </div>
                        )}
                      </div>
                    ) : isError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 bg-rose-50/50 text-center">
                        <AlertCircle className="w-9 h-9 text-rose-400" />
                        <div className="text-[10px] text-rose-600 font-medium line-clamp-3 break-all">{item.error}</div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col pt-10 px-3 pb-3">
                        <textarea
                          value={item.prompt}
                          onChange={(e) => updateItem(item.id, { prompt: e.target.value })}
                          placeholder="在此编辑提示词..."
                          className="flex-1 w-full bg-white/70 backdrop-blur-sm border border-slate-200 rounded-lg p-2.5 text-[11px] leading-relaxed text-slate-600 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white resize-none custom-scrollbar outline-none"
                        />
                      </div>
                    )}

                    {!isPending && (
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <div className="w-6 h-6 rounded-md bg-white/90 backdrop-blur border border-slate-200 flex items-center justify-center cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="h-6 px-2 rounded-md bg-white/90 backdrop-blur border border-slate-200 flex items-center text-[10px] font-mono font-bold text-slate-500">
                          #{idx + 1}
                        </div>
                      </div>
                    )}

                    {!isPending && (
                      <button
                        onClick={() => removeItem(item.id)}
                        title="删除这一张"
                        className="absolute top-2 right-2 w-6 h-6 rounded-md bg-white/90 backdrop-blur border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isSuccess && typeof item.elapsedMs === 'number' && (
                      <div className="absolute bottom-2 right-2 h-6 px-2 rounded-md bg-black/60 text-white text-[10px] font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />{formatMs(item.elapsedMs)}
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex flex-col gap-2 border-t border-slate-100">
                    <input
                      type="text"
                      value={item.title}
                      disabled={isPending}
                      onChange={(e) => updateItem(item.id, { title: e.target.value })}
                      className="font-bold text-slate-900 bg-transparent border-none focus:ring-0 p-0 text-sm w-full disabled:opacity-50"
                    />

                    {!(item.status === 'idle') && (
                      <>
                        <button
                          onClick={() => setExpandedId((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                          className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider self-start"
                        >
                          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          {isOpen ? '收起提示词' : '查看/编辑提示词'}
                        </button>

                        {isOpen && (
                          <textarea
                            value={item.prompt}
                            disabled={isPending}
                            onChange={(e) => updateItem(item.id, { prompt: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] text-slate-600 focus:ring-2 focus:ring-indigo-500/20 h-32 resize-none custom-scrollbar disabled:opacity-50"
                          />
                        )}
                      </>
                    )}

                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 mt-1">
                      {isSuccess && item.imageUrl && (
                        <button
                          onClick={() => downloadImage(item.imageUrl!, `${item.title}.png`)}
                          title="下载"
                          className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-indigo-600"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onRegenerate(item.id)}
                        disabled={isGenerating || isPending}
                        title={isSuccess ? '重新生成' : isError ? '重试' : '单独生成这一张'}
                        className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
                        <span className="text-[11px] font-bold">{isSuccess ? '重新生成' : isError ? '重试' : '单独生成'}</span>
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={isPending}
                        title="删除"
                        className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default PreviewArea;
