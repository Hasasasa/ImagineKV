import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { BatchItem } from '../types';
import { downloadImage } from '../utils/imageUtils';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BatchItem[];
  currentId: string | null;
  onNavigate: (id: string) => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ isOpen, onClose, items, currentId, onNavigate }) => {
  const viewable = useMemo(() => items.filter(i => !!i.imageUrl), [items]);
  const index = useMemo(() => viewable.findIndex(i => i.id === currentId), [viewable, currentId]);
  const current = index >= 0 ? viewable[index] : null;
  const hasPrev = viewable.length > 1;
  const hasNext = viewable.length > 1;

  const goPrev = () => {
    if (!hasPrev || viewable.length === 0) return;
    const next = (index - 1 + viewable.length) % viewable.length;
    onNavigate(viewable[next].id);
  };
  const goNext = () => {
    if (!hasNext || viewable.length === 0) return;
    const next = (index + 1) % viewable.length;
    onNavigate(viewable[next].id);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, index, viewable.length]);

  if (!isOpen || !current) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
      >
        <X className="w-6 h-6" />
      </button>

      {hasPrev && (
        <button
          onClick={goPrev}
          title="上一张 (←)"
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
      )}

      {hasNext && (
        <button
          onClick={goNext}
          title="下一张 (→)"
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      )}

      {viewable.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 md:top-8 px-3 py-1.5 bg-white/10 text-white rounded-full text-xs font-mono tabular-nums">
          {index + 1} / {viewable.length}
        </div>
      )}

      <div className="relative w-full h-full flex flex-col items-center justify-center" onClick={onClose}>
        <img
          key={current.id}
          src={current.imageUrl}
          alt={current.title}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        />

        <div className="mt-6 flex flex-col items-center gap-2 animate-in slide-in-from-bottom-4 duration-300 delay-100" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-white font-bold text-lg text-center max-w-2xl truncate px-4">{current.title}</h3>
          <button
            onClick={() => downloadImage(current.imageUrl!, `${current.title.replace(/\s+/g, '-')}.png`)}
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
