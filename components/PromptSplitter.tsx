import React, { useState, useEffect } from 'react';
import { X, Layers, Trash2, Plus, GripVertical, Sparkles, ChevronDown } from 'lucide-react';
import { parseBulkPrompts, ParsedPrompt } from '../utils/promptParser';
import logoUrl from '../logo/logo.png';

interface PromptSplitterProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (prompt: string) => void;
  onImportBatch: (prompts: ParsedPrompt[]) => void;
  initialText?: string;
  initialPrompts?: ParsedPrompt[];
  rawText?: string;
}

const PromptSplitter: React.FC<PromptSplitterProps> = ({ isOpen, onClose, onImportBatch, initialText, initialPrompts, rawText }) => {
  const [items, setItems] = useState<ParsedPrompt[]>([]);
  const [reportText, setReportText] = useState('');

  const normalizeEscapedNewlines = (text: string) =>
    text
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t');

  useEffect(() => {
    if (isOpen) {
        if (initialText) setReportText(normalizeEscapedNewlines(initialText));
        if (initialPrompts && initialPrompts.length > 0) {
            setItems(initialPrompts.map(p => ({
              ...p,
              title: normalizeEscapedNewlines(p.title || ''),
              prompt: normalizeEscapedNewlines(p.prompt || ''),
              negativePrompt: normalizeEscapedNewlines(p.negativePrompt || ''),
            })));
        } else if (initialText) {
             const parsed = parseBulkPrompts(normalizeEscapedNewlines(initialText));
             setItems(parsed.map(p => ({
               ...p,
               title: normalizeEscapedNewlines(p.title || ''),
               prompt: normalizeEscapedNewlines(p.prompt || ''),
               negativePrompt: normalizeEscapedNewlines(p.negativePrompt || ''),
             })));
        }
    }
  }, [isOpen, initialText, initialPrompts]);

  const handleItemChange = (index: number, field: keyof ParsedPrompt, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleDeleteItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleAddItem = () => {
    const newItem: ParsedPrompt = {
        id: `manual-${Date.now()}`,
        title: `新海报 ${items.length + 1}`,
        prompt: "在这里输入画面描述...",
        negativePrompt: ""
    };
    setItems([...items, newItem]);
  };

  const handleImport = () => {
    onImportBatch(items);
    onClose();
  };

  const renderReportContent = (text: string) => {
    if (!text) return <p className="text-gray-400 text-sm italic">暂无分析内容...</p>;

    text = normalizeEscapedNewlines(text);
    let cleanText = text.replace(/^#+\s*.*(Step 1|第一步|产品分析报告).*$/im, '').trim();

    // 截断“第二步/第三步”等后续说明（只保留产品分析报告部分）
    const cutMatch = cleanText.match(/(^|\n)\s*(---\s*\n)?\s*#+\s*(Step\s*2|Step\s*3|第二步|第三步)\b[\s\S]*$/im);
    if (cutMatch && typeof cutMatch.index === 'number') {
      cleanText = cleanText.slice(0, cutMatch.index).trim();
    }
    // 兜底：有些输出不会用 Markdown 标题，直接包含“第二步/第三步”行
    const plainCut = cleanText.search(/(^|\n)\s*(第二步|第三步)\s*[:：]/m);
    if (plainCut >= 0) {
      cleanText = cleanText.slice(0, plainCut).trim();
    }
    cleanText = cleanText.replace(/\n---\s*$/m, '').trim();
    cleanText = cleanText.replace(/^(\d+\.)\s*[\n\r]+(?=\S)/gm, '$1 ');
    cleanText = cleanText.replace(/(\*\*.*?\*\*[:：])\s*[\n\r]+(?=\S)/gm, '$1 ');
    cleanText = cleanText.replace(/([^\n])\s+([\-•\*]\s+)/g, '$1\n$2');
    cleanText = cleanText.replace(/([.!?;:。！？：]|\*\*)\s+(\d+\.\s)/g, '$1\n$2');

    return cleanText.split('\n').map((line, i) => {
        let trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        const parseBold = (str: string) => {
            const parts = str.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, idx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <span key={idx} className="font-bold text-slate-900">{part.slice(2, -2)}</span>;
                }
                return <span key={idx}>{part}</span>;
            });
        };

        if (/^([\-•\*]|\d+\.)\s+/.test(trimmed)) {
            const isBullet = /^[\-•\*]/.test(trimmed);
            const marker = isBullet ? '•' : trimmed.match(/^\d+\./)?.[0];
            const content = trimmed.replace(/^([\-•\*]|\d+\.)\s*/, '');
            return (
                <div key={i} className="flex items-start gap-2 mb-2 pl-1 group">
                    <span className={`mt-0.5 text-[10px] shrink-0 font-mono select-none ${isBullet ? 'text-slate-300' : 'text-indigo-600 font-bold'}`}>
                        {marker}
                    </span>
                    <div className="text-sm text-slate-600 leading-relaxed break-words">
                        {parseBold(content)}
                    </div>
                </div>
            );
        }
        
        if (/^\*\*.*?\*\*[:：]/.test(trimmed)) {
             return (
                <div key={i} className="mt-4 mb-1">
                    <p className="text-sm text-slate-800 leading-relaxed break-words">{parseBold(trimmed)}</p>
                </div>
            );
        }

        return <p key={i} className="text-sm text-slate-600 mb-2 leading-relaxed break-words text-justify">{parseBold(trimmed)}</p>;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-7xl bg-white rounded-3xl shadow-2xl flex flex-col h-[90vh] overflow-hidden">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="bg-white w-10 h-10 rounded-lg shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center">
                 <img src={logoUrl} alt="ImagineKV" className="w-12 h-12 object-contain -ml-1" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">
              海报生成方案确认
              <span className="ml-3 bg-indigo-50 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{items.length} 个任务</span>
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            <div className="w-full lg:w-1/3 p-6 border-r border-slate-100 bg-slate-50/30 overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-indigo-500 fill-current" />
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">产品分析报告</h4>
                </div>
                <div className="prose prose-slate max-w-none">
                    {renderReportContent(reportText)}
                </div>
            </div>

            <div className="w-full lg:w-2/3 p-6 overflow-y-auto custom-scrollbar bg-white">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-6">
                    {items.map((item, index) => (
                        <div key={item.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 group flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <GripVertical className="w-4 h-4 text-slate-300" />
                                <input 
                                    type="text" 
                                    value={item.title}
                                    onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                                    className="flex-1 font-bold text-slate-900 bg-transparent border-none focus:ring-0 p-0 text-sm"
                                />
                                <button onClick={() => handleDeleteItem(index)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                            <textarea 
                                value={item.prompt}
                                onChange={(e) => handleItemChange(index, 'prompt', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-600 focus:ring-2 focus:ring-indigo-500/20 h-32 resize-none custom-scrollbar"
                            />
                        </div>
                    ))}
                    <button onClick={handleAddItem} className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all min-h-[180px]">
                        <Plus className="w-6 h-6 mb-2" />
                        <span className="font-bold text-sm">手动添加任务</span>
                    </button>
                </div>

                {rawText && (
                  <details className="mt-4 border-t border-slate-100 pt-4 group">
                    <summary className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-slate-400 uppercase tracking-widest list-none hover:text-slate-600">
                      <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                      查看模型原始输出
                    </summary>
                    <div className="mt-4 p-4 bg-slate-900 rounded-xl font-mono text-[10px] text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                      {rawText}
                    </div>
                  </details>
                )}
            </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end items-center gap-3">
            <button onClick={onClose} className="px-5 py-3 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100">取消</button>
            <button
                onClick={handleImport}
                disabled={items.length === 0}
                className="px-8 py-3 bg-black text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:bg-slate-800 disabled:opacity-50"
            >
                <Layers className="w-4 h-4" />
                <span>确认并导入队列 ({items.length})</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default PromptSplitter;
