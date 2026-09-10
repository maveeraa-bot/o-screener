import React from 'react';
import { X, BookOpen, ExternalLink, Calculator, Layers } from 'lucide-react';
import { Language, translations } from '../utils/i18n';

interface FormulasDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: Language;
}

export const FormulasDocModal: React.FC<FormulasDocModalProps> = ({ isOpen, onClose, lang = 'tr' }) => {
  if (!isOpen) return null;
  const isTr = lang === 'tr';
  const t = translations[lang];

  return (
    <div
      id="formulas-doc-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div
        id="formulas-doc-modal-content"
        className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-auto text-slate-100 max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-900/60 text-emerald-400 border border-emerald-700/50">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-white">
                {isTr ? 'Sistem Formülleri ve Binance API Mimarisi' : 'System Formulas & Binance API Reference'}
              </h2>
              <p className="text-xs text-slate-400">
                {isTr
                  ? 'Binance Vadeli İşlemler resmi verisiyle doğrudan hesaplanan matematiksel formüller'
                  : 'Exact mathematical derivation from real Binance Futures data'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* Data Source */}
          <div className="space-y-2">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider text-emerald-400">
              <ExternalLink className="w-4 h-4" />
              {isTr ? '1. Gerçek Veri Akışı (Binance Vadeli REST API & WS)' : '1. Real Data Ingestion (Binance Futures REST API)'}
            </h3>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-400 space-y-1">
              <div>• GET https://fapi.binance.com/fapi/v1/ticker/price?symbol=&#123;SEMBOL&#125;</div>
              <div>• GET https://fapi.binance.com/futures/data/openInterestHist?symbol=&#123;SEMBOL&#125;&period=&#123;ZAMAN_DİLİMİ&#125;&limit=48</div>
              <div>• GET https://fapi.binance.com/fapi/v1/klines?symbol=&#123;SEMBOL&#125;&interval=&#123;ZAMAN_DİLİMİ&#125;&limit=48</div>
              <div>• GET https://fapi.binance.com/fapi/v1/openInterest?symbol=&#123;SEMBOL&#125;</div>
              <div>• WSS wss://fstream.binance.com/ws/!forceOrder@arr (Canlı Gerçek Likidasyonlar)</div>
            </div>
          </div>

          {/* Calculations */}
          <div className="space-y-3">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider text-sky-400">
              <Calculator className="w-4 h-4" />
              {isTr ? '2. Matematiksel Formüller (z-skorları ve Değişim Oranları)' : '2. Mathematical Formulas (z-scores & Deltas)'}
            </h3>
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="font-bold text-slate-200 block mb-1">
                  {isTr ? 'A) Açık Pozisyon Yüzdelik Değişimi (OI Değişim %)' : 'A) OI Change %'}
                </span>
                <code className="text-emerald-400 font-mono block">
                  OI Değişim % = (mevcut_OI - önceki_OI) / önceki_OI × 100
                </code>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="font-bold text-slate-200 block mb-1">
                  {isTr ? 'B) Göreceli Açık Pozisyon Sapması (Relative OI z-skoru)' : 'B) Relative OI (z-score)'}
                </span>
                <code className="text-emerald-400 font-mono block">
                  z = (mevcut_OI_değişimi - ortalama_değişim) / standart_sapma
                </code>
                <p className="text-xs text-slate-400 mt-1">
                  {isTr
                    ? 'Hareketli 24–48 barlık pencere üzerinde hesaplanır. Belirgin negatif z-skoru (örn. -1.85, -2.50), pozisyonların hızla tasfiye olduğunu ve sermaye çıkışını gösterir.'
                    : 'Derived across the rolling 20–48 bar window. Negative z-score (e.g. -1.85, -2.55) reflects anomalous rapid capital outflow.'}
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="font-bold text-slate-200 block mb-1">
                  {isTr ? 'C) Göreceli Fiyat Hareketi (Relative Price z-skoru)' : 'C) Relative Price (z-score)'}
                </span>
                <code className="text-emerald-400 font-mono block">
                  z = (mevcut_fiyat_değişimi - ortalama_fiyat_değişimi) / standart_sapma
                </code>
              </div>
            </div>
          </div>

          {/* Patterns & Alert Classifications */}
          <div className="space-y-3">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider text-amber-400">
              <Layers className="w-4 h-4" />
              {isTr ? '3. Formasyon ve Likidasyon Uyarı Motoru' : '3. Pattern & Liquidation Alert Engine'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="font-bold text-emerald-400 block mb-1">
                  🔄 {isTr ? 'Yükseliş Dönüş Formasyonu (Bullish Reversal)' : 'Bullish Reversal Pattern'}
                </span>
                <p className="text-slate-400">
                  {isTr ? (
                    <>
                      <strong className="text-slate-200">Satıcı Patlaması → Satıcı Çıkışı</strong> sıralaması. Güçlü satış baskısının tükendiğini, ardından short pozisyonların hızla kapatılarak yukarı dönüşün başladığını gösterir.
                    </>
                  ) : (
                    <>
                      <strong className="text-slate-200">Sell Burst Up → Sell Outflow</strong> sequence. Indicates strong
                      initial selling pressure exhausted, followed by rapid position unwinding and short-covering.
                    </>
                  )}
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="font-bold text-rose-400 block mb-1">
                  🔄 {isTr ? 'Düşüş Dönüş Formasyonu (Bearish Reversal)' : 'Bearish Reversal Pattern'}
                </span>
                <p className="text-slate-400">
                  {isTr ? (
                    <>
                      <strong className="text-slate-200">Alıcı Patlaması → Alıcı Çıkışı</strong> sıralaması. Agresif long girişlerinin tükendiğini, pozisyon tasfiyelerinin başlamasıyla piyasanın aşağı döneceğini işaret eder.
                    </>
                  ) : (
                    <>
                      <strong className="text-slate-200">Buy Burst Up → Buy Outflow</strong> sequence. Indicates aggressive
                      long openings exhausting, followed by rapid position unwinding and long-covering.
                    </>
                  )}
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="font-bold text-emerald-400 block mb-1">
                  ⚠️ {isTr ? 'Büyük Short Likidasyonu (S-OUT)' : 'Massive Shorts Liquidation (S-OUT)'}
                </span>
                <p className="text-slate-400">
                  {isTr ? (
                    <>
                      <strong className="text-slate-200">Fiyat Yükseliyor (+) & OI Düşüyor (-)</strong>. Short pozisyonlar patlıyor ve mecburi alımlarla fiyatı yukarı sürüklüyor.
                    </>
                  ) : (
                    <>
                      <strong className="text-slate-200">Price Rising (+) & OI Dropping (-)</strong>. Bears are exiting
                      their positions rapidly. Signal: Potentially Bullish.
                    </>
                  )}
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="font-bold text-rose-400 block mb-1">
                  ⚠️ {isTr ? 'Büyük Long Likidasyonu (B-OUT)' : 'Massive Longs Liquidation (B-OUT)'}
                </span>
                <p className="text-slate-400">
                  {isTr ? (
                    <>
                      <strong className="text-slate-200">Fiyat Düşüyor (-) & OI Düşüyor (-)</strong>. Long pozisyonlar tasfiye ediliyor (long squeeze) ve panik satışları devam ediyor.
                    </>
                  ) : (
                    <>
                      <strong className="text-slate-200">Price Falling (-) & OI Dropping (-)</strong>. Bulls are exiting
                      their positions rapidly. Signal: Potentially Bearish.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
          >
            {isTr ? 'Kapat' : 'Close Documentation'}
          </button>
        </div>
      </div>
    </div>
  );
};

