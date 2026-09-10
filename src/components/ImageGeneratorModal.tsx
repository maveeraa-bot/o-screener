import React, { useState } from 'react';
import { ImageAspectRatio, ImageModel, ImageSize, AlertCardData, GeneratedImageResult } from '../types';
import { Sparkles, X, Download, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { Language, translations } from '../utils/i18n';

interface ImageGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAlert?: AlertCardData | null;
  history: GeneratedImageResult[];
  onSaveResult: (result: GeneratedImageResult) => void;
  lang?: Language;
}

export const ImageGeneratorModal: React.FC<ImageGeneratorModalProps> = ({
  isOpen,
  onClose,
  selectedAlert,
  history,
  onSaveResult,
  lang = 'tr',
}) => {
  const isTr = lang === 'tr';
  const t = translations[lang];

  const defaultPrompt = selectedAlert
    ? `A hyper-realistic, high-tech crypto trading terminal infographic illustrating a "${selectedAlert.title}" on ${selectedAlert.symbol}. Detailed HUD displaying Open Interest at ${selectedAlert.currentOi}K with ${selectedAlert.oiChangePct}% change, Relative OI z-score of ${selectedAlert.relativeOi}, glowing ${selectedAlert.isBullish ? 'emerald green bullish reversal arrows' : 'crimson red liquidation cascade'} metrics, dark cyberpunk bloom aesthetic, clean mathematical typography, 8K ultra fine resolution.`
    : 'A futuristic crypto futures order book and open interest liquidation heatmap visualization, glowing neon green and magenta data telemetry, ultra-detailed holographic charts, cinematic studio lighting.';

  const [prompt, setPrompt] = useState(defaultPrompt);
  const [model, setModel] = useState<ImageModel>('gemini-3-pro-image-preview');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>('16:9');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<GeneratedImageResult | null>(null);

  // Update prompt when selectedAlert changes
  React.useEffect(() => {
    if (selectedAlert) {
      setPrompt(
        `A hyper-realistic, high-tech crypto trading terminal infographic illustrating a "${selectedAlert.title}" on ${selectedAlert.symbol}. Detailed HUD displaying Open Interest at ${selectedAlert.currentOi}K with ${selectedAlert.oiChangePct}% change, Relative OI z-score of ${selectedAlert.relativeOi}, glowing ${selectedAlert.isBullish ? 'emerald green bullish reversal arrows' : 'crimson red liquidation cascade'} metrics, dark cyberpunk bloom aesthetic, clean mathematical typography, 8K ultra fine resolution.`
      );
    }
  }, [selectedAlert]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model,
          imageSize,
          aspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      const newResult: GeneratedImageResult = {
        id: `img-${Date.now()}`,
        timestamp: Date.now(),
        prompt,
        imageUrl: data.imageUrl,
        aspectRatio,
        imageSize,
        model,
      };

      setActiveResult(newResult);
      onSaveResult(newResult);
    } catch (err: any) {
      console.error('Image gen error:', err);
      setError(err.message || 'Error generating image.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (imgUrl: string) => {
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = `oi-alert-visual-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const aspectRatios: ImageAspectRatio[] = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];
  const imageSizes: ImageSize[] = ['1K', '2K', '4K'];

  return (
    <div
      id="image-generator-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="image-generator-modal-content"
        className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-purple-900/60 text-purple-400 border border-purple-700/50">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white">
                {isTr ? 'Yapay Zeka Piyasa Görselleştirici & Alert İnfografiği' : 'AI Market Visualizer & Alert Infographic'}
              </h2>
              <p className="text-xs text-slate-400">
                {isTr
                  ? 'Gemini Görüntü Modelleri ile yüksek çözünürlüklü piyasa grafik görseli üretin'
                  : 'Generate high-resolution market visual assets using Gemini Image Models'}
              </p>
            </div>
          </div>
          <button
            id="close-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800/80 rounded-lg text-rose-200 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-bold">{isTr ? 'Görsel Üretim Hatası' : 'Generation Error'}</p>
                <p>{error}</p>
                <p className="text-xs text-rose-300 mt-1">
                  {isTr
                    ? 'GEMINI_API_KEY anahtarının AI Studio Ayarlar paneli üzerinden girildiğinden emin olun.'
                    : 'Ensure GEMINI_API_KEY is configured in the AI Studio Settings > Secrets panel.'}
                </p>
              </div>
            </div>
          )}

          {/* Model Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              {isTr ? 'Gemini Görüntü Modeli' : 'Gemini Image Model'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModel('gemini-3-pro-image-preview')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  model === 'gemini-3-pro-image-preview'
                    ? 'border-purple-500 bg-purple-950/40 ring-1 ring-purple-500 text-white'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-purple-300">gemini-3-pro-image-preview</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/80 text-purple-200 font-mono">
                    {isTr ? 'Pro Stüdyo Kalitesi' : 'Studio Pro Quality'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {isTr
                    ? 'Gerçekçi kripto infografikleri, tipografi ve 1K/2K/4K yüksek çözünürlük için tavsiye edilir.'
                    : 'Recommended for photorealistic crypto charts, intricate typography, and 1K/2K/4K resolution.'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setModel('gemini-3.1-flash-image-preview')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  model === 'gemini-3.1-flash-image-preview'
                    ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500 text-white'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-blue-300">gemini-3.1-flash-image-preview</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/80 text-blue-200 font-mono">
                    {isTr ? 'Hızlı Flash Kalitesi' : 'Fast Flash Quality'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {isTr
                    ? 'Sosyal medya alert kartları ve hızlı konsept tasarımlar için ultra hızlı görsel üretimi.'
                    : 'Ultra-fast image generation for quick market concepts and social alert cards.'}
                </p>
              </button>
            </div>
          </div>

          {/* Affordance: Image Size (1K, 2K, 4K) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              {isTr ? 'Görsel Çözünürlüğü' : 'Image Resolution Size'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {imageSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setImageSize(size)}
                  className={`py-2 px-3 rounded-lg border font-mono text-xs sm:text-sm font-bold transition-all ${
                    imageSize === size
                      ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 ring-1 ring-emerald-500'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Affordance: Aspect Ratio (1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              {isTr ? 'En/Boy Oranı (Aspect Ratio)' : 'Aspect Ratio'}
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {aspectRatios.map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio)}
                  className={`py-2 px-1 text-center rounded-lg border font-mono text-xs font-semibold transition-all ${
                    aspectRatio === ratio
                      ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300 ring-1 ring-indigo-500'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {isTr ? 'Görsel Tanım Komutu (Prompt)' : 'Visual Description Prompt'}
              </label>
              {selectedAlert && (
                <button
                  type="button"
                  onClick={() =>
                    setPrompt(
                      `A hyper-realistic, high-tech crypto trading terminal infographic illustrating a "${selectedAlert.title}" on ${selectedAlert.symbol}. Detailed HUD displaying Open Interest at ${selectedAlert.currentOi}K with ${selectedAlert.oiChangePct}% change, Relative OI z-score of ${selectedAlert.relativeOi}, glowing ${selectedAlert.isBullish ? 'emerald green bullish reversal arrows' : 'crimson red liquidation cascade'} metrics, dark cyberpunk bloom aesthetic, clean mathematical typography, 8K ultra fine resolution.`
                    )
                  }
                  className="text-xs text-purple-400 hover:text-purple-300 underline"
                >
                  {isTr ? 'Alert Verisine Sıfırla' : 'Reset to Alert Data'}
                </button>
              )}
            </div>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-sans"
              placeholder={isTr ? 'Üretilmesini istediğiniz infografik veya konsepti tarif edin...' : 'Describe the image or infographic you want Gemini to generate...'}
            />

            {/* Quick Templates */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[11px] text-slate-400 mr-1">{isTr ? 'Şablonlar:' : 'Presets:'}</span>
              <button
                type="button"
                onClick={() =>
                  setPrompt(
                    'High-resolution crypto order book depth map showing massive short liquidation squeeze on Bitcoin futures, emerald luminescence, 3D volumetric candlestick landscape, clean terminal interface.'
                  )
                }
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {isTr ? 'Short Sıkışması' : 'Short Squeeze'}
              </button>
              <button
                type="button"
                onClick={() =>
                  setPrompt(
                    'Cryptocurrency Open Interest variation indicator chart on dark obsidian glass desk, glowing neon green z-score oscillator bars, professional quantitative finance dashboard.'
                  )
                }
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {isTr ? 'Kantitatif Panel' : 'Quant Dashboard'}
              </button>
              <button
                type="button"
                onClick={() =>
                  setPrompt(
                    'Bullish reversal pattern breakdown with Fibonacci spiral overlay and rapid OI decrease down burst, futuristic sci-fi trading exchange layout.'
                  )
                }
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {isTr ? 'Dönüş Formasyonu' : 'Reversal Setup'}
              </button>
            </div>
          </div>

          {/* Active Generation Result */}
          {activeResult && (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  {isTr ? 'Görsel Başarıyla Üretildi' : 'Image Generated Successfully'}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownload(activeResult.imageUrl)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-200 text-xs flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isTr ? 'İndir' : 'Download'}</span>
                  </button>
                </div>
              </div>
              <div className="flex justify-center bg-black/50 p-2 rounded-lg overflow-hidden max-h-96">
                <img
                  src={activeResult.imageUrl}
                  alt={activeResult.prompt}
                  referrerPolicy="no-referrer"
                  className="max-h-80 object-contain rounded"
                />
              </div>
            </div>
          )}

          {/* History Gallery */}
          {history.length > 0 && !activeResult && (
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {isTr ? 'Son Üretilen Görseller' : 'Recent Generated Images'}
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {history.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveResult(item)}
                    className="cursor-pointer group relative rounded-lg overflow-hidden border border-slate-800 hover:border-purple-500 transition-all aspect-video bg-black/40"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity">
                      {isTr ? 'Görüntüle' : 'View'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            {isTr ? 'Çözünürlük: ' : 'Size: '}<span className="text-slate-200">{imageSize}</span> • {isTr ? 'Oran: ' : 'Ratio: '}{' '}
            <span className="text-slate-200">{aspectRatio}</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              {isTr ? 'Kapat' : 'Close'}
            </button>
            <button
              id="submit-generate-image-btn"
              type="button"
              disabled={loading || !prompt.trim()}
              onClick={handleGenerate}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center space-x-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isTr ? `Üretiliyor (${imageSize})...` : `Generating ${imageSize}...`}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{isTr ? 'Yapay Zeka ile Üret' : 'Generate AI Image'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

