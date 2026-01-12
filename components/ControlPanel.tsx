import React, { useRef, useState } from 'react';
import { Upload, X, Loader2, ListPlus, Trash2, Play, CheckCircle2, AlertCircle, ChevronDown, Monitor, Smartphone, Square, LayoutTemplate, Frame, BrainCircuit, FileText, Tag, MessageSquarePlus, Globe, Sparkles } from 'lucide-react';
import { AspectRatio, ImageSize, GenerationConfig, BatchItem } from '../types';
import PromptSplitter from './PromptSplitter';
import { ParsedPrompt } from '../utils/promptParser';
import { analyzeImageAndGeneratePromptsUnified } from '../services/apiService';
import { fileToBase64 } from '../utils/imageUtils';

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
  onGenerate: () => void;
  onBatchGenerate: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  batchQueue,
  setBatchQueue,
  selectedImage,
  setSelectedImage,
  config,
  setConfig,
  isGenerating,
  onBatchGenerate
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSplitterOpen, setIsSplitterOpen] = useState(false);
  const [splitterReportText, setSplitterReportText] = useState('');
  const [splitterParsedPrompts, setSplitterParsedPrompts] = useState<ParsedPrompt[]>([]);
  const [splitterRawText, setSplitterRawText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
      setBatchQueue([]);
    }
  };

  const handleSmartAnalyze = async () => {
      if (!selectedImage) return;
      setIsAnalyzing(true);
      try {
          const base64 = await fileToBase64(selectedImage);
          const result = await analyzeImageAndGeneratePromptsUnified(base64, selectedImage.type, {
              brandName: config.brandName,
              customRequirements: config.customRequirements,
              language: config.language,
              visualStyle: config.visualStyle,
              typographyStyle: config.typographyStyle,
              aspectRatio: config.aspectRatio,
          });
          setSplitterReportText(result.report);
          setSplitterParsedPrompts(result.prompts);
          setSplitterRawText(result.rawText);
          setIsSplitterOpen(true);
      } catch (e: any) {
          alert("分析失败: " + e.message);
      } finally {
          setIsAnalyzing(false);
      }
  };

  return (
    <aside className="w-full lg:w-[400px] flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      <PromptSplitter 
        isOpen={isSplitterOpen} 
        onClose={() => setIsSplitterOpen(false)} 
        onSelect={() => {}} 
        onImportBatch={(items) => {
          // 1. Update the generation queue
          setBatchQueue(items.map(it => ({ id: it.id, title: it.title, prompt: it.prompt, status: 'idle' })));
          // 2. Sync the local state so if the user re-opens the modal, they see their EDITED version, not the old AI one.
          setSplitterParsedPrompts(items);
        }} 
        initialText={splitterReportText} 
        initialPrompts={splitterParsedPrompts}
        rawText={splitterRawText}
      />

      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="font-bold text-slate-800">生成参数</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {/* Upload Section */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">第一步: 上传产品图</label>
          {!selectedImage ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-slate-50 transition-all group"
            >
              <Upload className="w-8 h-8 text-slate-300 group-hover:text-indigo-500 mb-2" />
              <span className="text-sm font-medium text-slate-600">点击上传图片</span>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 h-48">
              <img src={URL.createObjectURL(selectedImage)} className="w-full h-full object-contain" />
              <button onClick={() => setSelectedImage(null)} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Configuration */}
        <div className="space-y-4">
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

          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
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

          {selectedImage && (
            <button
              onClick={handleSmartAnalyze}
              disabled={isAnalyzing}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
              {isAnalyzing ? '智能分析中...' : '生成批量海报方案'}
            </button>
          )}
        </div>

        {/* Task Queue */}
        {batchQueue.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">待生成任务 ({batchQueue.length})</label>
              <div className="flex items-center gap-3">
                <button 
                    onClick={() => setIsSplitterOpen(true)}
                    className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"
                >
                    <FileText className="w-3 h-3" /> 查看方案
                </button>
                <button onClick={() => setBatchQueue([])} className="text-xs text-red-500 font-bold hover:underline">清空</button>
              </div>
            </div>
            <div className="space-y-2">
              {batchQueue.map((item, idx) => (
                <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between group">
                  <div className="truncate pr-2">
                    <span className="text-[10px] text-slate-400 font-mono mr-2">{idx+1}</span>
                    <span className="text-xs font-bold text-slate-700">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === 'pending' && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500"/>}
                    {item.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/>}
                    {item.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-500"/>}
                    <button onClick={() => setBatchQueue(batchQueue.filter(i => i.id !== item.id))} className="text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-5 bg-slate-50 border-t border-slate-200">
        <button
          onClick={onBatchGenerate}
          disabled={isGenerating || batchQueue.length === 0}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-xl ${
            isGenerating || batchQueue.length === 0 
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
            : 'bg-black text-white hover:bg-slate-800'
          }`}
        >
          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
          {isGenerating ? '正在批量生成...' : '立即执行批量生成'}
        </button>
      </div>
    </aside>
  );
};

export default ControlPanel;
