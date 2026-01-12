import React from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';
import { downloadImage } from '../utils/imageUtils';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, imageUrl, title }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main Content */}
      <div className="relative w-full h-full flex flex-col items-center justify-center" onClick={onClose}>
        
        <img 
            src={imageUrl} 
            alt={title} 
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()} 
        />
        
        <div className="mt-6 flex flex-col items-center gap-2 animate-in slide-in-from-bottom-4 duration-300 delay-100" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg text-center max-w-2xl truncate px-4">{title}</h3>
            <button
                onClick={() => downloadImage(imageUrl, `${title.replace(/\s+/g, '-')}.png`)}
                className="px-6 py-2 bg-white text-black rounded-full font-bold text-sm hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-lg"
            >
                <Download className="w-4 h-4" /> 下载原图
            </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default ImagePreviewModal;