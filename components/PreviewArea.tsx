
import React from 'react';
// Added Loader2 to fix the 'Cannot find name Loader2' error
import { Download, LayoutGrid, AlertCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { GeneratedImage, BatchItem } from '../types';
import { downloadImage } from '../utils/imageUtils';

interface PreviewAreaProps {
  singleResult: GeneratedImage | null;
  batchQueue: BatchItem[];
  isGenerating: boolean;
  error: string | null;
  onOpenGallery: () => void;
  onPreviewImage: (url: string, title: string) => void;
}

const PreviewArea: React.FC<PreviewAreaProps> = ({ 
    batchQueue, 
    isGenerating, 
    error,
    onOpenGallery,
    onPreviewImage
}) => {
  const successfulImages = batchQueue.filter(item => item.imageUrl || item.status === 'pending');
  const hasContent = successfulImages.length > 0;

  return (
    <section className="flex-1 flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm min-h-[600px]">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-slate-400" />
          <h3 className="font-bold text-slate-800">创作画廊</h3>
        </div>
        {hasContent && (
          <button onClick={onOpenGallery} className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700">
            <LayoutGrid className="w-4 h-4" /> 全屏预览
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/20">
        {error ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
            <AlertCircle className="w-12 h-12 text-rose-200" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : !hasContent && !isGenerating ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 select-none">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
              <ImageIcon className="w-10 h-10 opacity-20" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest">等待生成作品</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {batchQueue.map((item) => (
              <div key={item.id} className="relative group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all">
                {item.status === 'pending' && (
                  <div className="absolute inset-0 bg-slate-100/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">Generating...</span>
                  </div>
                )}
                
                <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover cursor-pointer" 
                      onClick={() => onPreviewImage(item.imageUrl!, item.title)}
                    />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-slate-200" />
                  )}
                </div>

                {item.imageUrl && (
                  <div className="p-3 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 truncate flex-1">{item.title}</span>
                    <button 
                      onClick={() => downloadImage(item.imageUrl!, `${item.title}.png`)}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PreviewArea;
