import React, { useState } from 'react';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import PreviewArea from './components/PreviewArea';
import GalleryModal from './components/GalleryModal';
import ImagePreviewModal from './components/ImagePreviewModal';
import SettingsModal from './components/SettingsModal';
import { GeneratedImage, GenerationConfig, AspectRatio, ImageSize, BatchItem } from './types';
import { generateImageContentUnified } from './services/apiService';
import { fileToBase64 } from './utils/imageUtils';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{url: string, title: string} | null>(null);
  const [result, setResult] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<GenerationConfig>({
    aspectRatio: AspectRatio.Square,
    imageSize: ImageSize.TwoK,
    model: 'gemini-3-pro-image-preview',
    brandName: '',
    customRequirements: '',
    language: 'zh',
    visualStyle: 'auto',
    typographyStyle: 'auto',
  });

  const getBase64Image = async (): Promise<{data: string | null, mime: string | null}> => {
    if (selectedImage) {
        const base64 = await fileToBase64(selectedImage);
        return { data: base64, mime: selectedImage.type };
    }
    return { data: null, mime: null };
  };

  const handleBatchGenerate = async () => {
    if (batchQueue.length === 0) return;
    setIsGenerating(true);
    setError(null);
    try {
        const { data: base64Image, mime } = await getBase64Image();
        setBatchQueue(prev => prev.map(item => item.status === 'idle' || item.status === 'error' ? { ...item, status: 'pending' } : item));
        
        const itemsToProcess = batchQueue.filter(item => item.status === 'idle' || item.status === 'error');
        const promises = itemsToProcess.map(async (item) => {
            try {
                const imageUrl = await generateImageContentUnified(item.prompt, base64Image, mime, config);
                setBatchQueue(currentQueue => currentQueue.map(i => i.id === item.id ? { ...i, status: 'success', imageUrl } : i));
            } catch (err: any) {
                setBatchQueue(currentQueue => currentQueue.map(i => i.id === item.id ? { ...i, status: 'error', error: err.message } : i));
            }
        });
        await Promise.all(promises);
    } catch (err: any) {
        setError("生成过程中止");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />
      
      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6 max-w-[1600px] mx-auto w-full overflow-hidden">
        <ControlPanel
          prompt={prompt}
          setPrompt={setPrompt}
          batchQueue={batchQueue}
          setBatchQueue={setBatchQueue}
          selectedImage={selectedImage}
          setSelectedImage={setSelectedImage}
          config={config}
          setConfig={setConfig}
          isGenerating={isGenerating}
          onGenerate={() => {}}
          onBatchGenerate={handleBatchGenerate}
        />
        
        <PreviewArea 
          singleResult={result} 
          batchQueue={batchQueue}
          isGenerating={isGenerating}
          error={error}
          onOpenGallery={() => setIsGalleryOpen(true)}
          onPreviewImage={(url, title) => setPreviewImage({url, title})}
        />
      </main>

      <GalleryModal 
        isOpen={isGalleryOpen} 
        onClose={() => setIsGalleryOpen(false)}
        batchQueue={batchQueue}
        singleResult={result}
        referenceImage={selectedImage}
      />

      <ImagePreviewModal 
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ''}
        title={previewImage?.title || ''}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
