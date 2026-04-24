import React, { useState } from 'react';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import PreviewArea from './components/PreviewArea';
import GalleryModal from './components/GalleryModal';
import ImagePreviewModal from './components/ImagePreviewModal';
import SettingsModal from './components/SettingsModal';
import { GeneratedImage, GenerationConfig, AspectRatio, ImageSize, BatchItem } from './types';
import { analyzeImageAndGeneratePromptsUnified, generateImageContentUnified } from './services/apiService';
import { fileToBase64 } from './utils/imageUtils';
import { getModel } from './utils/models';
import { parseBulkPrompts } from './utils/promptParser';
import ErrorModal, { ErrorModalPayload, normalizeError } from './components/ErrorModal';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<ErrorModalPayload | null>(null);
  const [analyzeStatus, setAnalyzeStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [analyzeElapsedMs, setAnalyzeElapsedMs] = useState<number | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [result] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<GenerationConfig>({
    aspectRatio: AspectRatio.Square,
    imageSize: ImageSize.TwoK,
    model: getModel('image'),
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

  const runGenerate = async (
    items: BatchItem[],
    base64Image: string | null,
    mime: string | null
  ) => {
    const promises = items.map(async (item) => {
      try {
        const imageUrl = await generateImageContentUnified(item.prompt, base64Image, mime, config);
        setBatchQueue(current =>
          current.map(i =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'success',
                  imageUrl,
                  elapsedMs: i.startedAt ? Date.now() - i.startedAt : undefined,
                }
              : i
          )
        );
      } catch (err: any) {
        setBatchQueue(current =>
          current.map(i =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'error',
                  error: err?.message || String(err),
                  elapsedMs: i.startedAt ? Date.now() - i.startedAt : undefined,
                }
              : i
          )
        );
      }
    });
    await Promise.all(promises);
  };

  const handleBatchGenerate = async () => {
    if (batchQueue.length === 0) return;
    setIsGenerating(true);
    setError(null);
    try {
      const { data: base64Image, mime } = await getBase64Image();
      const now = Date.now();
      const itemsToProcess = batchQueue.filter(i => i.status === 'idle' || i.status === 'error');
      const ids = new Set(itemsToProcess.map(i => i.id));
      setBatchQueue(prev =>
        prev.map(i =>
          ids.has(i.id)
            ? { ...i, status: 'pending', startedAt: now, elapsedMs: undefined, error: undefined }
            : i
        )
      );
      const stamped = itemsToProcess.map(i => ({ ...i, startedAt: now }));
      await runGenerate(stamped, base64Image, mime);
    } catch (err: any) {
      setError('生成过程中止');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalyzeStatus('idle');
    setAnalyzeElapsedMs(null);
    const startedAt = Date.now();
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
      let prompts = result.prompts;
      if ((!prompts || prompts.length === 0) && result.rawText) {
        prompts = parseBulkPrompts(result.rawText);
      }
      if (!prompts || prompts.length === 0) {
        throw new Error('未能从分析结果中提取到任何方案，请检查原始输出或调整模型。');
      }
      setBatchQueue(
        prompts.map((p) => ({
          id: p.id,
          title: p.title,
          prompt: p.prompt,
          status: 'idle',
        }))
      );
      setAnalyzeStatus('success');
      setAnalyzeElapsedMs(Date.now() - startedAt);
    } catch (e: any) {
      console.error('[Analyze] 分析失败', e);
      setAnalyzeError(normalizeError(e, '分析失败'));
      setAnalyzeStatus('error');
      setAnalyzeElapsedMs(Date.now() - startedAt);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRegenerateItem = async (id: string) => {
    const item = batchQueue.find(i => i.id === id);
    if (!item) return;
    const { data: base64Image, mime } = await getBase64Image();
    const now = Date.now();
    setBatchQueue(prev =>
      prev.map(i =>
        i.id === id
          ? { ...i, status: 'pending', startedAt: now, elapsedMs: undefined, imageUrl: undefined, error: undefined }
          : i
      )
    );
    await runGenerate([{ ...item, startedAt: now }], base64Image, mime);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 p-6 max-w-[1600px] mx-auto w-full overflow-hidden">
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
          isAnalyzing={isAnalyzing}
          analyzeStatus={analyzeStatus}
          analyzeElapsedMs={analyzeElapsedMs}
          onAnalyze={handleAnalyze}
        />

        <PreviewArea
          batchQueue={batchQueue}
          setBatchQueue={setBatchQueue}
          isGenerating={isGenerating}
          isAnalyzing={isAnalyzing}
          error={error}
          config={config}
          onBatchGenerate={handleBatchGenerate}
          onRegenerate={handleRegenerateItem}
          onOpenGallery={() => setIsGalleryOpen(true)}
          onPreviewImage={(id) => setPreviewItemId(id)}
        />

        <ErrorModal
          open={!!analyzeError}
          onClose={() => setAnalyzeError(null)}
          payload={analyzeError}
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
        isOpen={!!previewItemId}
        onClose={() => setPreviewItemId(null)}
        items={batchQueue}
        currentId={previewItemId}
        onNavigate={(id) => setPreviewItemId(id)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default App;
