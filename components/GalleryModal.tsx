import React from 'react';
import { createPortal } from 'react-dom';
import { X, LayoutGrid, Download, Image as ImageIcon } from 'lucide-react';
import { BatchItem, GeneratedImage } from '../types';
import { downloadImage } from '../utils/imageUtils';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchQueue: BatchItem[];
  singleResult: GeneratedImage | null;
  referenceImage: File | null;
}

const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose, batchQueue, singleResult, referenceImage }) => {
  if (!isOpen) return null;

  const isBatchMode = batchQueue.length > 0;
  const successfulItems = isBatchMode 
    ? batchQueue.filter(item => item.status === 'success' && item.imageUrl)
    : (singleResult ? [{ id: 'single', title: '生成结果', prompt: 'Prompt', imageUrl: singleResult.url }] : []);

  return createPortal(
    <div className="fixed inset-0 z-[150] flex flex-col bg-gray-50 animate-in slide-in-from-bottom-10 duration-300">
      
      {/* Header */}
      <div className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black text-white rounded-full">
                <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-gray-900">作品画廊</h2>
                <p className="text-xs text-gray-500 font-medium">共 {successfulItems.length} 张生成图片</p>
            </div>
        </div>
        <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-black transition-colors"
        >
            <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-[90rem] mx-auto space-y-10">
            
            {/* Reference Image Section */}
            {referenceImage && (
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" /> 参考图片
                    </h3>
                    <div className="w-48 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                        <img 
                            src={URL.createObjectURL(referenceImage)} 
                            alt="Reference" 
                            className="w-full h-auto rounded-xl"
                        />
                    </div>
                </div>
            )}

            {/* Grid Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                    生成结果列表
                </h3>
                
                {/* items-start ensures cells don't stretch to height of tallest sibling, keeping borders tight to image */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-start">
                    {successfulItems.map((item: any) => (
                        <div key={item.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm group relative">
                            <div className="bg-gray-50 relative overflow-hidden">
                                <img 
                                    src={item.imageUrl} 
                                    alt={item.title} 
                                    className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                                />
                                {/* Overlay on hover */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end">
                                     <p className="text-white text-xs font-bold mb-3 line-clamp-2 drop-shadow-md">
                                        {item.title}
                                     </p>
                                     <button
                                        onClick={() => downloadImage(item.imageUrl!, `gallery-${item.title}.png`)}
                                        className="w-full bg-white text-black px-3 py-2 rounded-full font-bold text-xs shadow-lg flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                                    >
                                        <Download className="w-3 h-3" /> 下载
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {successfulItems.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <p className="text-gray-400 font-medium">暂无生成的图片</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GalleryModal;