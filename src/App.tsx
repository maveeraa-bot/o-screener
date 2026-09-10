import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCardData, BarAnalysis, GeneratedImageResult, Timeframe, TrackedAlertOutcome, LiquidationStreamData, TelegramStatus } from './types';
import { processMarketBars, detectAlerts } from './utils/oiEngine';
import { playAlertChime } from './utils/audioAlert';
import { loadStoredAlertOutcomes, registerNewAlertsForTracking, evaluateCheckpoints, saveStoredAlertOutcomes } from './utils/forwardTrackingEngine';
import { Language, translations } from './utils/i18n';
import { Header } from './components/Header';
import { MarketStatsBar } from './components/MarketStatsBar';
import { LiveOIChart } from './components/LiveOIChart';
import { AlertFeed } from './components/AlertFeed';
import { StatsPanel } from './components/StatsPanel';
import { ImageGeneratorModal } from './components/ImageGeneratorModal';
import { FormulasDocModal } from './components/FormulasDocModal';
import { TelegramModal } from './components/TelegramModal';
import { Sparkles, BookOpen, AlertCircle, RefreshCw, CheckCircle2, Activity, BarChart2 } from 'lucide-react';

export default function App() {
  // Global Language State (Defaults to 'tr' as requested)
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('app_lang');
      return saved === 'en' || saved === 'tr' ? saved : 'tr';
    } catch {
      return 'tr';
    }
  });

  const toggleLanguage = () => {
    setLang((prev) => {
      const next: Language = prev === 'tr' ? 'en' : 'tr';
      try {
        localStorage.setItem('app_lang', next);
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
      return next;
    });
  };

  const t = translations[lang];
  const isTr = lang === 'tr';

  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [bars, setBars] = useState<BarAnalysis[]>([]);
  const [alerts, setAlerts] = useState<AlertCardData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange24h, setPriceChange24h] = useState<number>(0);
  const [instantOi, setInstantOi] = useState<number>(0);
  const [instantOiValue, setInstantOiValue] = useState<number>(0);

  // Tab State: 'TERMINAL' | 'STATS'
  const [activeTab, setActiveTab] = useState<'TERMINAL' | 'STATS'>('TERMINAL');

  // WebSocket confirmed liquidations
  const [liquidationData, setLiquidationData] = useState<LiquidationStreamData | null>(null);

  // Forward Outcome Tracking State
  const [trackedAlerts, setTrackedAlerts] = useState<TrackedAlertOutcome[]>(() => loadStoredAlertOutcomes());
  const [isEvaluatingOutcomes, setIsEvaluatingOutcomes] = useState<boolean>(false);

  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [secondsUntilNextPoll, setSecondsUntilNextPoll] = useState<number>(30);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [imageModalOpen, setImageModalOpen] = useState<boolean>(false);
  const [selectedAlertForImage, setSelectedAlertForImage] = useState<AlertCardData | null>(null);
  const [formulasModalOpen, setFormulasModalOpen] = useState<boolean>(false);
  const [telegramModalOpen, setTelegramModalOpen] = useState<boolean>(false);
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);

  // Set of alert IDs sent to Telegram to avoid double transmission
  const sentToTelegramRef = useRef<Set<string>>(new Set());

  const fetchTelegramStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/telegram/status');
      if (res.ok) {
        const data = await res.json();
        setTelegramStatus(data);
      }
    } catch (err) {
      console.warn('[Telegram Status Notice]', err);
    }
  }, []);

  useEffect(() => {
    fetchTelegramStatus();
    const interval = setInterval(fetchTelegramStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchTelegramStatus]);

  // Stored Image History
  const [imageHistory, setImageHistory] = useState<GeneratedImageResult[]>(() => {
    try {
      const saved = localStorage.getItem('oi_generated_images');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const availableSymbols = [
    { symbol: 'BTCUSDT', name: 'Bitcoin', base: 'BTC' },
    { symbol: 'ETHUSDT', name: 'Ethereum', base: 'ETH' },
    { symbol: 'SOLUSDT', name: 'Solana', base: 'SOL' },
    { symbol: 'BNBUSDT', name: 'BNB', base: 'BNB' },
    { symbol: 'DOGEUSDT', name: 'Dogecoin', base: 'DOGE' },
    { symbol: 'XRPUSDT', name: 'XRP', base: 'XRP' },
    { symbol: 'ADAUSDT', name: 'Cardano', base: 'ADA' },
    { symbol: 'AVAXUSDT', name: 'Avalanche', base: 'AVAX' },
    { symbol: 'LINKUSDT', name: 'Chainlink', base: 'LINK' },
    { symbol: 'SUIUSDT', name: 'Sui', base: 'SUI' },
    { symbol: 'PEPEUSDT', name: 'Pepe', base: 'PEPE' },
    { symbol: 'NEARUSDT', name: 'NEAR Protocol', base: 'NEAR' },
  ];

  // Track previous alert IDs to play audio only on newly discovered alerts
  const previousAlertIdsRef = useRef<Set<string>>(new Set());

  const handleSaveImageResult = (res: GeneratedImageResult) => {
    setImageHistory((prev) => {
      const updated = [res, ...prev.filter((item) => item.id !== res.id)].slice(0, 20);
      try {
        localStorage.setItem('oi_generated_images', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
      return updated;
    });
  };

  // Resilient fetch helper with retry and timeout protection
  const fetchWithRetry = async (url: string, maxAttempts = 3, delayMs = 500): Promise<Response> => {
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          return res;
        }
        if (res.status >= 500 && attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, delayMs * attempt));
          continue;
        }
        return res;
      } catch (err: any) {
        lastError = err;
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, delayMs * attempt));
        }
      }
    }
    throw lastError || new Error(`Network request failed for ${url}`);
  };

  // Main fetch function calling our backend proxy to Binance
  const fetchMarketData = useCallback(async () => {
    setIsPolling(true);

    try {
      // 1. Fetch Primary Klines and OI History
      const [klinesRes, oiHistRes] = await Promise.all([
        fetchWithRetry(`/api/binance/klines?symbol=${symbol}&interval=${timeframe}&limit=48`),
        fetchWithRetry(`/api/binance/openInterestHist?symbol=${symbol}&period=${timeframe}&limit=48`),
      ]);

      if (!klinesRes.ok || !oiHistRes.ok) {
        throw new Error(
          isTr
            ? `${symbol} için Binance vadeli piyasa verisi alınamadı. Lütfen sembolün aktif olduğunu kontrol edin.`
            : `Failed to fetch Binance market data for ${symbol}. Please verify the symbol is active on Binance Futures.`
        );
      }

      const klinesData = await klinesRes.json();
      const oiHistData = await oiHistRes.json();

      if (!Array.isArray(klinesData) || klinesData.length === 0) {
        throw new Error(
          isTr ? `${symbol} için güncel mum verisi bulunamadı.` : `No recent price klines returned for ${symbol}.`
        );
      }

      if (!Array.isArray(oiHistData) || oiHistData.length === 0) {
        throw new Error(
          isTr
            ? `${symbol} (${timeframe}) için Açık Pozisyon verisi bulunamadı. 15m, 1h veya BTCUSDT deneyin.`
            : `No recent Open Interest history returned for ${symbol} on ${timeframe}. Try 15m, 1h or BTCUSDT.`
        );
      }

      // 2. Concurrently fetch supplementary price, instant OI, and WebSocket liquidations
      const [priceData, oiData, liqData] = await Promise.all([
        fetchWithRetry(`/api/binance/price?symbol=${symbol}`, 2)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetchWithRetry(`/api/binance/openInterest?symbol=${symbol}`, 2)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetchWithRetry(`/api/binance/liquidations?symbol=${symbol}&windowMs=900000`, 2)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      // Clear previous error on success
      setError(null);

      if (liqData) {
        setLiquidationData(liqData);
      }

      // Process bars and calculate z-scores
      const processedBars = processMarketBars(klinesData, oiHistData);
      setBars(processedBars);

      // Current Price and 24h change calculation from klines
      if (priceData && priceData.price) {
        setCurrentPrice(parseFloat(priceData.price));
      } else if (processedBars.length > 0) {
        setCurrentPrice(processedBars[processedBars.length - 1].closePrice);
      }

      if (processedBars.length >= 2) {
        const startP = processedBars[0].openPrice;
        const endP = processedBars[processedBars.length - 1].closePrice;
        setPriceChange24h(((endP - startP) / startP) * 100);
      }

      if (oiData && oiData.openInterest) {
        setInstantOi(parseFloat(oiData.openInterest));
        // estimate USD value
        if (priceData && priceData.price) {
          setInstantOiValue(parseFloat(oiData.openInterest) * parseFloat(priceData.price));
        }
      } else if (processedBars.length > 0) {
        const latest = processedBars[processedBars.length - 1];
        setInstantOi(latest.openInterest);
        setInstantOiValue(latest.openInterestValue);
      }

      // Detect alerts from bars, passing real WebSocket liquidations and current language
      const detected = detectAlerts(processedBars, symbol, timeframe, liqData || undefined, lang);

      // Register new alerts in forward tracking ledger
      if (detected.length > 0) {
        setTrackedAlerts((prev) => {
          const registered = registerNewAlertsForTracking(prev, detected);
          // Auto evaluate checkpoints using the fresh klines
          evaluateCheckpoints(registered, klinesData).then(({ updatedList, newlyEvaluatedCount }) => {
            if (newlyEvaluatedCount > 0) {
              setTrackedAlerts(updatedList);
            }
          });
          return registered;
        });
      }

      // Check for newly triggered alert to play sound chime
      if (audioEnabled && detected.length > 0) {
        const latestAlert = detected[0];
        if (!previousAlertIdsRef.current.has(latestAlert.id)) {
          playAlertChime(latestAlert.isBullish);
        }
      }

      // Auto-dispatch passed significance alerts to Telegram (only newly detected ones)
      if (detected.length > 0) {
        for (const alert of detected) {
          if (!sentToTelegramRef.current.has(alert.id)) {
            sentToTelegramRef.current.add(alert.id);
            fetch('/api/telegram/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(alert),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.success) {
                  fetchTelegramStatus();
                }
              })
              .catch((e) => console.warn('[Telegram Dispatch Notice]', e));
          }
        }
      }

      // Update seen set
      const newSeen = new Set<string>();
      detected.forEach((a) => newSeen.add(a.id));
      previousAlertIdsRef.current = newSeen;

      setAlerts(detected);
    } catch (err: any) {
      console.warn('Market data fetch notice:', err);
      setError(
        err.message ||
          (isTr
            ? 'Piyasa veri akışıyla bağlantı kurulurken hata oluştu. Yeniden bağlanılıyor...'
            : 'Error communicating with market feed. Reconnecting...')
      );
    } finally {
      setIsPolling(false);
      setSecondsUntilNextPoll(30);
    }
  }, [symbol, timeframe, audioEnabled, lang, isTr, fetchTelegramStatus]);

  // Immediately re-translate alerts on screen when language toggles
  useEffect(() => {
    if (bars.length > 0) {
      const detected = detectAlerts(bars, symbol, timeframe, liquidationData || undefined, lang);
      setAlerts(detected);
    }
  }, [lang]);

  // Explicit re-evaluation of pending checkpoints
  const handleRefreshEvaluation = async () => {
    setIsEvaluatingOutcomes(true);
    try {
      const { updatedList } = await evaluateCheckpoints(trackedAlerts);
      setTrackedAlerts(updatedList);
    } catch (e) {
      console.error('Checkpoint evaluation failed:', e);
    } finally {
      setIsEvaluatingOutcomes(false);
    }
  };

  // Clear logged alert outcomes
  const handleClearLogs = async () => {
    try {
      await fetch('/api/alerts/log', { method: 'DELETE' });
    } catch (e) {
      console.warn('Backend clear failed:', e);
    }
    setTrackedAlerts([]);
    saveStoredAlertOutcomes([]);
  };

  // Initial load and trigger on symbol/timeframe change
  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Auto-retry when connection fails
  useEffect(() => {
    if (error) {
      const retryTimer = setTimeout(() => {
        fetchMarketData();
      }, 4000);
      return () => clearTimeout(retryTimer);
    }
  }, [error, fetchMarketData]);

  // 30s Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilNextPoll((prev) => {
        if (prev <= 1) {
          fetchMarketData();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchMarketData]);

  const handleOpenImageGenForAlert = (alert: AlertCardData) => {
    setSelectedAlertForImage(alert);
    setImageModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Header */}
      <Header
        symbol={symbol}
        onSymbolChange={(s) => setSymbol(s)}
        timeframe={timeframe}
        onTimeframeChange={(tf) => setTimeframe(tf)}
        isPolling={isPolling}
        secondsUntilNextPoll={secondsUntilNextPoll}
        onManualRefresh={fetchMarketData}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled(!audioEnabled)}
        onOpenImageGen={() => {
          setSelectedAlertForImage(alerts.length > 0 ? alerts[0] : null);
          setImageModalOpen(true);
        }}
        availableSymbols={availableSymbols}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        trackedAlertsCount={trackedAlerts.length}
        wsConnected={true}
        telegramStatus={telegramStatus}
        onOpenTelegramModal={() => setTelegramModalOpen(true)}
        lang={lang}
        onToggleLanguage={toggleLanguage}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden items-center bg-slate-900 p-1 rounded-xl border border-slate-800 w-full">
          <button
            onClick={() => setActiveTab('TERMINAL')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'TERMINAL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{t.tabTerminal}</span>
          </button>
          <button
            onClick={() => setActiveTab('STATS')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'STATS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>
              {t.tabStats} ({trackedAlerts.length})
            </span>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 p-4 rounded-xl flex items-start gap-3 text-xs sm:text-sm shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">
                {isTr ? 'Piyasa Bağlantı Bildirimi' : 'Market Connection Notice'}
              </span>
              <p>{error}</p>
            </div>
            <button
              onClick={fetchMarketData}
              className="px-3 py-1 bg-rose-900 hover:bg-rose-800 text-white rounded text-xs font-bold transition-colors"
            >
              {isTr ? 'Yeniden Dene' : 'Retry'}
            </button>
          </div>
        )}

        {/* Real-Time Market Stats Bar */}
        <MarketStatsBar
          currentPrice={currentPrice}
          priceChange24h={priceChange24h}
          instantOi={instantOi}
          instantOiValue={instantOiValue}
          bars={bars}
          symbol={symbol}
          liquidationData={liquidationData}
          lang={lang}
        />

        {/* Conditional Tab Rendering */}
        {activeTab === 'STATS' ? (
          <StatsPanel
            trackedAlerts={trackedAlerts}
            onRefreshEvaluation={handleRefreshEvaluation}
            onClearLogs={handleClearLogs}
            isEvaluating={isEvaluatingOutcomes}
            selectedSymbol={symbol}
            lang={lang}
          />
        ) : (
          <>
            {/* Interactive Live Candlestick & OI Z-Score Chart */}
            <LiveOIChart bars={bars} symbol={`#${symbol}.P`} timeframe={timeframe} lang={lang} />

            {/* Section Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-900">
              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>{t.alertFeed}</span>
                  <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    {alerts.length} {isTr ? 'Tespit Edildi' : 'Detected'}
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  {isTr
                    ? 'Yükseliş/Düşüş Dönüşleri, Büyük Short (S-OUT) ve Long (B-OUT) Likidasyonları için anlık sinyaller'
                    : 'Pattern detection for Bullish/Bearish Reversals, Massive Shorts Liq (S-OUT) & Massive Longs Liq (B-OUT)'}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  id="open-formulas-btn"
                  onClick={() => setFormulasModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isTr ? 'Hesaplama & Formüller' : 'Calculations & Formulas'}</span>
                </button>

                <button
                  id="ai-visual-feed-btn"
                  onClick={() => {
                    setSelectedAlertForImage(alerts.length > 0 ? alerts[0] : null);
                    setImageModalOpen(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-800 text-purple-300 text-xs font-semibold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>{isTr ? 'Yapay Zeka Piyasa Görseli' : 'AI Market Visualizer'}</span>
                </button>
              </div>
            </div>

            {/* Alerts Feed */}
            <AlertFeed
              alerts={alerts}
              onGenerateImage={handleOpenImageGenForAlert}
              onClearAlerts={() => setAlerts([])}
              lang={lang}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-5 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>
              {isTr
                ? 'Binance Vadeli İşlemler Canlı REST & WS Motoru • %100 Gerçek API Verisi • Sıfır Simülasyon'
                : 'Binance Futures REST Engine • 100% Real API Data • Zero Mocking'}
            </span>
          </div>
          <div>
            <span>
              {isTr
                ? 'Göreceli OI ve Göreceli Fiyat z-skorları hareketli pencere üzerinde hesaplanır'
                : 'Relative OI & Relative Price z-scores computed over rolling window'}
            </span>
          </div>
        </div>
      </footer>

      {/* AI Image Generator Modal */}
      <ImageGeneratorModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        selectedAlert={selectedAlertForImage}
        history={imageHistory}
        onSaveResult={handleSaveImageResult}
        lang={lang}
      />

      {/* Mathematical Formulas Documentation Modal */}
      <FormulasDocModal
        isOpen={formulasModalOpen}
        onClose={() => setFormulasModalOpen(false)}
        lang={lang}
      />

      {/* Telegram Bot Integration Modal */}
      <TelegramModal
        isOpen={telegramModalOpen}
        onClose={() => setTelegramModalOpen(false)}
        status={telegramStatus}
        onRefreshStatus={fetchTelegramStatus}
        lang={lang}
      />
    </div>
  );
}

