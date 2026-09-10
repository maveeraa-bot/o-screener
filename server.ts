import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { processMarketBars, detectAlerts } from './src/utils/oiEngine';
import { AlertCardData } from './src/types';
import { renderAlertCardAsPngUniversal } from './server/cardRenderer';

dotenv.config();

const __filename = (() => {
  try {
    return fileURLToPath(import.meta.url); // dev modda (tsx, gerçek ESM) çalışır
  } catch {
    return require.main?.filename || process.argv[1] || ''; // prod'da (esbuild cjs bundle) çalışır
  }
})();
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Enable CORS for all incoming requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Normalizes Binance Futures symbol (e.g., PEPEUSDT -> 1000PEPEUSDT)
function normalizeFuturesSymbol(input: string | undefined): string {
  const sym = (input || 'BTCUSDT').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
  if (!sym) return 'BTCUSDT';
  if (sym === 'PEPEUSDT') return '1000PEPEUSDT';
  if (sym === 'SHIBUSDT') return '1000SHIBUSDT';
  if (sym === 'BONKUSDT') return '1000BONKUSDT';
  if (sym === 'FLOKIUSDT') return '1000FLOKIUSDT';
  if (sym === 'SATSUSDT') return '1000SATSUSDT';
  if (sym === 'RATSUSDT') return '1000RATSUSDT';
  if (sym === 'LUNCUSDT') return '1000LUNCUSDT';
  return sym;
}

// In-memory cache for Binance data to avoid hitting rate limits
const cache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 5000; // 5 seconds

async function fetchBinanceWithCache(url: string, retries = 2): Promise<any> {
  const cached = cache.get(url);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          Accept: 'application/json',
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Binance API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      cache.set(url, { timestamp: now, data });
      return data;
    } catch (err: any) {
      if (attempt === retries) {
        // Fallback: If we have previous cached data for this endpoint, serve it safely
        if (cached && cached.data) {
          console.warn(`[Binance] Fetch failed for ${url} (${err.message}), returning cached data.`);
          return cached.data;
        }
        throw err;
      }
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Favicon handlers (ensures browser & puppeteer never get a 404 on favicon)
app.get('/favicon.ico', (req, res) => {
  const icoPath = path.join(process.cwd(), 'public', 'favicon.ico');
  const svgPath = path.join(process.cwd(), 'public', 'favicon.svg');
  if (fs.existsSync(icoPath)) {
    res.type('image/x-icon').sendFile(icoPath);
  } else if (fs.existsSync(svgPath)) {
    res.type('image/svg+xml').sendFile(svgPath);
  } else {
    res.status(204).end();
  }
});

app.get('/favicon.svg', (req, res) => {
  const svgPath = path.join(process.cwd(), 'public', 'favicon.svg');
  if (fs.existsSync(svgPath)) {
    res.type('image/svg+xml').sendFile(svgPath);
  } else {
    res.status(204).end();
  }
});

// 1. Ticker price
app.get('/api/binance/price', async (req, res) => {
  try {
    const symbol = normalizeFuturesSymbol(req.query.symbol as string);
    const url = `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`;
    const data = await fetchBinanceWithCache(url);
    res.json(data);
  } catch (error: any) {
    console.error('Price fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch price' });
  }
});

// 2. Open interest (instant)
app.get('/api/binance/openInterest', async (req, res) => {
  try {
    const symbol = normalizeFuturesSymbol(req.query.symbol as string);
    const url = `https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`;
    const data = await fetchBinanceWithCache(url);
    res.json(data);
  } catch (error: any) {
    console.error('OI fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch open interest' });
  }
});

// 3. Open interest history
app.get('/api/binance/openInterestHist', async (req, res) => {
  try {
    const symbol = normalizeFuturesSymbol(req.query.symbol as string);
    const period = (req.query.period as string || '15m');
    const limit = (req.query.limit as string || '48');
    const url = `https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=${period}&limit=${limit}`;
    const data = await fetchBinanceWithCache(url);
    res.json(data);
  } catch (error: any) {
    console.error('OI Hist error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch OI history' });
  }
});

// 4. Klines (candlesticks)
app.get('/api/binance/klines', async (req, res) => {
  try {
    const symbol = normalizeFuturesSymbol(req.query.symbol as string);
    const interval = (req.query.interval as string || '15m');
    const limit = (req.query.limit as string || '48');
    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const data = await fetchBinanceWithCache(url);
    res.json(data);
  } catch (error: any) {
    console.error('Klines error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch klines' });
  }
});

// Real Binance Force Orders (Liquidation) In-Memory Buffer
interface LiquidationEvent {
  symbol: string;
  side: 'BUY' | 'SELL';
  qty: number;
  price: number;
  notional: number;
  timestamp: number;
}

const liquidationBuffer: LiquidationEvent[] = [];
const MAX_BUFFERED_LIQUIDATIONS = 20000;
let isWsConnected = false;
let forceOrderWs: any = null;

function connectForceOrderWebSocket() {
  try {
    const wsUrl = 'wss://fstream.binance.com/ws/!forceOrder@arr';
    console.log(`[Binance WS] Connecting to ${wsUrl}...`);
    
    // Use native Node 22 WebSocket
    forceOrderWs = new (globalThis as any).WebSocket(wsUrl);

    forceOrderWs.onopen = () => {
      console.log('[Binance WS] Connected to !forceOrder@arr stream successfully.');
      isWsConnected = true;
    };

    forceOrderWs.onmessage = (event: any) => {
      try {
        const raw = typeof event.data === 'string' ? event.data : event.data.toString();
        const parsed = JSON.parse(raw);
        
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          const o = item.o || (item.data && item.data.o) || item;
          if (o && o.s) {
            const symbol = (o.s || '').toUpperCase();
            const side = (o.S || 'SELL').toUpperCase() as 'BUY' | 'SELL';
            const qty = parseFloat(o.q || o.l || '0');
            const price = parseFloat(o.p || o.ap || '0');
            const notional = qty * price;
            const timestamp = Number(o.T || item.E || Date.now());

            if (notional > 0 && symbol) {
              liquidationBuffer.push({
                symbol,
                side,
                qty,
                price,
                notional,
                timestamp,
              });

              if (liquidationBuffer.length > MAX_BUFFERED_LIQUIDATIONS) {
                liquidationBuffer.splice(0, 2000);
              }
            }
          }
        }
      } catch (err) {
        console.error('[Binance WS] Message parse error:', err);
      }
    };

    forceOrderWs.onerror = (err: any) => {
      console.error('[Binance WS] WebSocket error:', err.message || err);
      isWsConnected = false;
    };

    forceOrderWs.onclose = (event: any) => {
      console.warn(`[Binance WS] WebSocket closed (code: ${event.code}). Reconnecting in 3s...`);
      isWsConnected = false;
      setTimeout(connectForceOrderWebSocket, 3000);
    };
  } catch (error) {
    console.error('[Binance WS] Initialization error:', error);
    isWsConnected = false;
    setTimeout(connectForceOrderWebSocket, 5000);
  }
}

// Start WebSocket connection immediately
connectForceOrderWebSocket();

// Periodic keep-alive ping
setInterval(() => {
  if (forceOrderWs && forceOrderWs.readyState === 1) {
    try {
      if (typeof forceOrderWs.ping === 'function') {
        forceOrderWs.ping();
      }
    } catch {
      // Ignore ping errors on browsers/native
    }
  }
}, 25000);

// 5. Confirmed Liquidations Endpoint (from WebSocket buffer)
app.get('/api/binance/liquidations', (req, res) => {
  const rawQuery = (req.query.symbol as string || '').toUpperCase();
  const normalized = rawQuery && rawQuery !== 'ALL' ? normalizeFuturesSymbol(rawQuery) : '';
  const now = Date.now();
  const windowMs = parseInt(req.query.windowMs as string || '900000', 10); // default 15 minutes (15 * 60 * 1000)
  const endTime = parseInt(req.query.endTime as string || String(now), 10);
  const startTime = parseInt(req.query.startTime as string || String(endTime - windowMs), 10);

  // Filter events by symbol and time range
  const matched = liquidationBuffer.filter((ev) => {
    const symbolMatches =
      !normalized ||
      ev.symbol === normalized ||
      ev.symbol === rawQuery ||
      ev.symbol.replace('1000', '') === rawQuery.replace('1000', '');
    const timeMatches = ev.timestamp >= startTime && ev.timestamp <= endTime;
    return symbolMatches && timeMatches;
  });

  let totalNotional = 0;
  let longCount = 0;
  let longNotional = 0;
  let shortCount = 0;
  let shortNotional = 0;

  for (const ev of matched) {
    totalNotional += ev.notional;
    // In Binance Futures force orders:
    // S='SELL' means long position was liquidated (forced sell)
    // S='BUY' means short position was liquidated (forced buy)
    if (ev.side === 'SELL') {
      longCount++;
      longNotional += ev.notional;
    } else {
      shortCount++;
      shortNotional += ev.notional;
    }
  }

  res.json({
    symbol: normalized || rawQuery || 'ALL',
    startTime,
    endTime,
    count: matched.length,
    totalNotional: Math.round(totalNotional * 100) / 100,
    longCount,
    longNotional: Math.round(longNotional * 100) / 100,
    shortCount,
    shortNotional: Math.round(shortNotional * 100) / 100,
    wsConnected: isWsConnected,
    totalBufferedEvents: liquidationBuffer.length,
    recentEvents: matched.slice(-15),
  });
});

// 6. Real Historical Price Check for Forward Outcomes (+15m, +1h, +4h)
app.get('/api/binance/historical-price', async (req, res) => {
  try {
    const symbol = normalizeFuturesSymbol(req.query.symbol as string);
    const timestamp = parseInt(req.query.timestamp as string || '0', 10);

    if (!timestamp) {
      return res.status(400).json({ error: 'Timestamp is required' });
    }

    const now = Date.now();
    if (timestamp > now) {
      // Future timestamp, not yet reached
      return res.json({
        symbol,
        timestamp,
        available: false,
        message: 'Timestamp is in the future. Checkpoint not yet reached.',
      });
    }

    // Fetch 1m kline around that timestamp
    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=1m&startTime=${timestamp - 60000}&endTime=${timestamp + 120000}&limit=3`;
    const klines = await fetchBinanceWithCache(url);

    if (Array.isArray(klines) && klines.length > 0) {
      // Pick closest kline
      const matched = klines.reduce((prev, curr) => {
        return Math.abs(curr[0] - timestamp) < Math.abs(prev[0] - timestamp) ? curr : prev;
      }, klines[0]);

      const closePrice = parseFloat(matched[4]);
      return res.json({
        symbol,
        timestamp,
        available: true,
        price: closePrice,
        barTime: matched[0],
      });
    }

    // Fallback: If kline is older than available 1m or outside bounds, try 15m
    const fallbackUrl = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=15m&startTime=${timestamp - 900000}&endTime=${timestamp + 1800000}&limit=3`;
    const fallbackKlines = await fetchBinanceWithCache(fallbackUrl);

    if (Array.isArray(fallbackKlines) && fallbackKlines.length > 0) {
      const matched = fallbackKlines[0];
      const closePrice = parseFloat(matched[4]);
      return res.json({
        symbol,
        timestamp,
        available: true,
        price: closePrice,
        barTime: matched[0],
      });
    }

    res.json({
      symbol,
      timestamp,
      available: false,
      message: 'No kline found for given timestamp.',
    });
  } catch (error: any) {
    console.error('Historical price check error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch historical price' });
  }
});

// 7. Persistent Tracked Alert Outcomes (In-Memory & Persistent Sync)
const trackedAlertsDatabase = new Map<string, any>();

app.get('/api/alerts/log', (req, res) => {
  const symbol = (req.query.symbol as string || '').toUpperCase();
  let list = Array.from(trackedAlertsDatabase.values());
  if (symbol && symbol !== 'ALL') {
    list = list.filter((item) => item.rawSymbol === symbol || item.symbol === symbol);
  }
  // Newest first
  list.sort((a, b) => b.timestamp - a.timestamp);
  res.json(list);
});

app.post('/api/alerts/log', (req, res) => {
  const alertRecord = req.body;
  if (!alertRecord || !alertRecord.id) {
    return res.status(400).json({ error: 'Valid alert record with id is required' });
  }

  trackedAlertsDatabase.set(alertRecord.id, alertRecord);
  res.json({ success: true, count: trackedAlertsDatabase.size });
});

app.delete('/api/alerts/log', (req, res) => {
  trackedAlertsDatabase.clear();
  res.json({ success: true, count: 0 });
});

// 5. Popular symbols list
app.get('/api/binance/popular-symbols', (req, res) => {
  res.json([
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
    { symbol: '1000PEPEUSDT', name: 'Pepe (1000x)', base: '1000PEPE' },
    { symbol: 'NEARUSDT', name: 'NEAR Protocol', base: 'NEAR' },
  ]);
});

// 6. Gemini Image Generation Endpoint
// Supports gemini-3-pro-image-preview and gemini-3.1-flash-image-preview with size (1K, 2K, 4K) and aspect ratios
app.post('/api/generate-image', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
      });
    }

    const {
      prompt,
      aspectRatio = '16:9',
      imageSize = '1K',
      model = 'gemini-3-pro-image-preview',
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Validated model name mapping
    // If user requests gemini-3-pro-image-preview or gemini-3.1-flash-image-preview,
    // we use the official models from @google/genai guidelines
    let selectedModel = model;
    if (model.includes('flash')) {
      selectedModel = 'gemini-3.1-flash-image';
    } else {
      selectedModel = 'gemini-3-pro-image';
    }

    const imageConfig: Record<string, any> = {
      aspectRatio: aspectRatio || '1:1',
    };

    if (imageSize && (imageSize === '1K' || imageSize === '2K' || imageSize === '4K')) {
      imageConfig.imageSize = imageSize;
    }

    console.log(`Generating image with model: ${selectedModel}, config:`, imageConfig);

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig,
      },
    });

    let imageUrl: string | null = null;
    let captionText = '';

    const candidates = response.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
        }
        if (part.text) {
          captionText += part.text;
        }
      }
    }

    if (!imageUrl) {
      return res.status(500).json({
        error: 'No image data returned from model.',
        textOutput: captionText,
      });
    }

    res.json({
      imageUrl,
      caption: captionText,
      model: selectedModel,
      aspectRatio,
      imageSize,
    });
  } catch (error: any) {
    console.error('Image generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate image',
    });
  }
});

// ==========================================
// TELEGRAM INTEGRATION & SATORI CARD RENDERING
// ==========================================

interface TelegramStatusState {
  configured: boolean;
  botTokenConfigured: boolean;
  chatIdConfigured: boolean;
  lastAttemptAt?: number;
  lastSuccessAt?: number;
  lastError?: string | null;
  lastStatus: 'idle' | 'success' | 'error' | 'not_configured';
  sentCount: number;
}

const telegramState: TelegramStatusState = {
  configured: false,
  botTokenConfigured: false,
  chatIdConfigured: false,
  lastStatus: 'idle',
  sentCount: 0,
};

// Backend In-Memory Alert Store (Single Source of Truth)
interface MonitoredTarget {
  symbol: string;
  timeframe: string;
}

const MONITORED_TARGETS: MonitoredTarget[] = [
  { symbol: 'BTCUSDT', timeframe: '15m' },
];

export const backendAlertHistory = new Map<string, AlertCardData>();
export let backendCurrentAlerts: AlertCardData[] = [];
export const dispatchedAlertIds = new Set<string>();
let isFirstScanAfterBoot = true;
let lastScanTimestamp = 0;
let isScanning = false;

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatCurrency(val: number): string {
  if (val === undefined || isNaN(val)) return '$0.00';
  if (val >= 1) {
    return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return '$' + val.toFixed(6);
}

function formatNotionalUsd(num: number): string {
  if (!num || isNaN(num)) return '$0.00';
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatOiUnits(val: number | undefined, asset: string = ''): string {
  if (val === undefined || isNaN(val)) return '0 ' + asset;
  if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M ${asset}`.trim();
  if (val >= 1e3) return `${(val / 1e3).toFixed(2)}K ${asset}`.trim();
  return `${val.toFixed(2)} ${asset}`.trim();
}

function formatZScoreStr(val: number | undefined): string {
  if (val === undefined || isNaN(val)) return '0.00σ';
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}σ`;
}

/**
 * High-resolution visual card rendering for Telegram and export.
 * Seamlessly resolves in-container rendering using Satori + Resvg, or Puppeteer if local Chromium is installed.
 */
export async function renderAlertCardAsPng(alertData: any): Promise<Buffer> {
  if (alertData && alertData.id) {
    backendAlertHistory.set(alertData.id, alertData);
  }
  return await renderAlertCardAsPngUniversal(alertData, PORT);
}


/**
 * Background Open Interest & Signal Scanner (Independent Server Task).
 * Runs continuously every 30 seconds, evaluating real Binance data and significance gates.
 * When a qualified alert is triggered, it automatically generates a high-res Puppeteer card
 * and dispatches it to Telegram, even if no user has the browser open.
 */
export async function runBackgroundOiScan(): Promise<void> {
  if (isScanning) return;
  isScanning = true;

  try {
    const alertsFound: AlertCardData[] = [];

    for (const target of MONITORED_TARGETS) {
      try {
        const symbol = target.symbol;
        const timeframe = target.timeframe;

        const klinesUrl = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${timeframe}&limit=48`;
        const oiHistUrl = `https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=${timeframe}&limit=48`;

        const [klinesData, oiHistData] = await Promise.all([
          fetchBinanceWithCache(klinesUrl),
          fetchBinanceWithCache(oiHistUrl),
        ]);

        if (!Array.isArray(klinesData) || !Array.isArray(oiHistData)) {
          continue;
        }

        // Get recent confirmed liquidations for this symbol
        const cutoff = Date.now() - 15 * 60 * 1000;
        const recentLiqs = liquidationBuffer.filter(
          (e) => e.symbol === symbol && e.timestamp >= cutoff
        );
        const confirmedLiquidations: any = {
          symbol,
          count: recentLiqs.length,
          totalNotional: recentLiqs.reduce((acc, curr) => acc + curr.notional, 0),
          longCount: recentLiqs.filter((e) => e.side === 'BUY').length,
          shortCount: recentLiqs.filter((e) => e.side === 'SELL').length,
          timestamp: Date.now(),
        };

        const processedBars = processMarketBars(klinesData, oiHistData);
        const alerts = detectAlerts(processedBars, symbol, timeframe as any, confirmedLiquidations, 'tr');

        for (const alert of alerts) {
          alertsFound.push(alert);
          backendAlertHistory.set(alert.id, alert);
        }

        if (isFirstScanAfterBoot) {
          // İlk taramada hiçbir şey gönderme, sadece mevcut sinyalleri 
          // "zaten gönderilmiş" olarak işaretle
          for (const alert of alerts) {
            dispatchedAlertIds.add(alert.id);
          }
          console.log(`[Background Scanner] İlk tarama (soğuk başlangıç) — ${alerts.length} mevcut sinyal Telegram'a GÖNDERİLMEDEN işaretlendi.`);
        } else {
          // Normal akış: sadece dispatchedAlertIds'te olmayan YENİ sinyalleri gönder
          for (const alert of alerts) {
            if (!dispatchedAlertIds.has(alert.id)) {
              dispatchedAlertIds.add(alert.id);
              console.log(`[Background Scanner] New alert detected [${alert.id}] for ${symbol}. Dispatching to Telegram...`);

              // Dispatch in background
              sendTelegramAlert(alert).then((res) => {
                if (res.success) {
                  console.log(`[Background Scanner] Alert [${alert.id}] sent to Telegram successfully.`);
                } else {
                  console.warn(`[Background Scanner] Telegram send failed for [${alert.id}]:`, res.error);
                }
              }).catch((err) => {
                console.error(`[Background Scanner] Telegram dispatch error for [${alert.id}]:`, err);
              });
            }
          }
        }
      } catch (err: any) {
        console.error(`[Background Scanner] Error processing target ${target.symbol}:`, err.message);
      }
    }

    if (isFirstScanAfterBoot) {
      isFirstScanAfterBoot = false;
    }

    backendCurrentAlerts = alertsFound;
    lastScanTimestamp = Date.now();
  } catch (err: any) {
    console.error('[Background Scanner] Fatal scan error:', err);
  } finally {
    isScanning = false;
  }
}

/**
 * Sends alert to Telegram.
 * Primary method: sendPhoto with PNG card generated by Satori.
 * Fallback: sendMessage with plain HTML text if photo generation/dispatch fails.
 */
export async function sendTelegramAlert(alertData: any): Promise<{ success: boolean; messageId?: number; format?: string; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  telegramState.lastAttemptAt = Date.now();
  telegramState.botTokenConfigured = Boolean(botToken && botToken.length > 5);
  telegramState.chatIdConfigured = Boolean(chatId && chatId.length > 1);
  telegramState.configured = Boolean(telegramState.botTokenConfigured && telegramState.chatIdConfigured);

  if (!telegramState.configured || !botToken || !chatId) {
    const msg = 'Telegram bot token or chat ID is not configured in Settings > Secrets.';
    telegramState.lastStatus = 'not_configured';
    telegramState.lastError = msg;
    console.warn(`[Telegram] ${msg}`);
    return { success: false, error: msg };
  }

  let rawTitle = alertData.title || 'Açık Pozisyon Değişimi – Sinyal';
  if (alertData.kind === 'RAPID_OI_UP' && !rawTitle.includes('🔥')) {
    rawTitle = `🔥${rawTitle.startsWith('⚡') ? '' : '⚡ '}${rawTitle}`;
  }
  const title = escapeHtml(rawTitle);
  const symbol = escapeHtml(alertData.symbol || alertData.rawSymbol || 'N/A');
  const timeframe = escapeHtml(alertData.timeframe ? `${alertData.timeframe}` : '15m');
  const currentPrice = formatCurrency(Number(alertData.currentPrice || 0));
  const oiChangePct = `${Number(alertData.oiChangePct || 0) >= 0 ? '+' : ''}${Number(alertData.oiChangePct || 0).toFixed(2)}%`;
  const relativeOi = formatZScoreStr(Number(alertData.relativeOi));
  const relativePrice = formatZScoreStr(Number(alertData.relativePrice));
  const impactScore = Number(alertData.impactScore !== undefined ? alertData.impactScore : 0).toFixed(2);

  const liqEvents = alertData.confirmedLiquidations?.events || alertData.confirmedLiquidations?.count || 0;
  const liqNotional = formatNotionalUsd(Number(alertData.confirmedLiquidations?.notional || 0));
  const liqText = `${liqEvents} işlem, ${liqNotional} hacim`;

  const signalTypeIcon = alertData.isBullish ? '🟢' : '🔴';
  const signalType = `${signalTypeIcon} ${escapeHtml(alertData.signalType || (alertData.isBullish ? 'Yükseliş Lehine' : 'Düşüş Lehine'))}`;

  let photoError: string | null = null;

  // 1) PRIMARY ATTEMPT: Render PNG card with Satori + resvg and send with sendPhoto
  try {
    const pngBuffer = await renderAlertCardAsPng(alertData);

    const formData = new FormData();
    formData.append('chat_id', chatId);
    const photoBlob = new Blob([pngBuffer], { type: 'image/png' });
    const cleanSym = symbol.replace(/[^A-Za-z0-9]/g, '') || 'ALERT';
    formData.append('photo', photoBlob, `${cleanSym}_alert.png`);

    const caption = [
      `<b>⚠️ ${title}</b>`,
      `${symbol} • ${timeframe} • Fiyat: ${currentPrice}`,
      `OI: ${oiChangePct} (${relativeOi}) • Fiyat Z: ${relativePrice}`,
      `Impact: ${impactScore} • ${signalType}`,
    ].join('\n');

    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');

    const photoUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
    const photoRes = await fetch(photoUrl, {
      method: 'POST',
      body: formData,
    });

    const photoData: any = await photoRes.json();
    if (photoRes.ok && photoData.ok) {
      telegramState.lastSuccessAt = Date.now();
      telegramState.lastStatus = 'success';
      telegramState.lastError = null;
      telegramState.sentCount += 1;
      console.log(`[Telegram] Alert photo card successfully sent for ${symbol} (Message ID: ${photoData.result?.message_id})`);
      return { success: true, messageId: photoData.result?.message_id, format: 'photo' };
    } else {
      photoError = photoData.description || `HTTP ${photoRes.status}`;
      console.warn(`[Telegram] sendPhoto failed (${photoError}), falling back to text message...`);
    }
  } catch (err: any) {
    photoError = err.message || 'Image rendering or photo upload error';
    console.warn(`[Telegram] Exception in renderAlertCardAsPng / sendPhoto (${photoError}), falling back to text message...`);
  }

  // 2) FALLBACK ATTEMPT: Plain text sendMessage (only if photo generation or dispatch failed)
  try {
    const formattedFallbackMessage = [
      `<b>⚠️ ${title}</b>`,
      `Sembol: ${symbol}`,
      `Zaman Dilimi: ${timeframe}`,
      `Fiyat: ${currentPrice}`,
      `OI Değişimi: ${oiChangePct}`,
      `Göreceli OI (Z-Skor): ${relativeOi}`,
      `Göreceli Fiyat (Z-Skor): ${relativePrice}`,
      `Impact Score: ${impactScore}`,
      `Teyitli Likidasyonlar: ${liqText}`,
      `Sinyal Yönü: ${signalType}`,
    ].join('\n');

    const textUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const textRes = await fetch(textUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: formattedFallbackMessage,
        parse_mode: 'HTML',
      }),
    });

    const textData: any = await textRes.json();
    if (!textRes.ok || !textData.ok) {
      const errDetail = textData.description || `HTTP ${textRes.status}`;
      telegramState.lastStatus = 'error';
      telegramState.lastError = errDetail;
      console.error(`[Telegram] Both sendPhoto and fallback sendMessage failed:`, errDetail);
      return { success: false, error: errDetail };
    }

    telegramState.lastSuccessAt = Date.now();
    telegramState.lastStatus = 'success';
    telegramState.lastError = photoError ? `Görsel gönderilemedi (${photoError}), metin olarak iletildi.` : null;
    telegramState.sentCount += 1;
    console.log(`[Telegram] Fallback text alert sent for ${symbol} (Message ID: ${textData.result?.message_id})`);
    return { success: true, messageId: textData.result?.message_id, format: 'fallback_text' };
  } catch (textErr: any) {
    telegramState.lastStatus = 'error';
    telegramState.lastError = textErr.message || 'Network error';
    console.error('[Telegram] Unexpected error while sending fallback alert:', textErr);
    return { success: false, error: textErr.message };
  }
}

// Telegram Status Endpoint
app.get('/api/telegram/status', (req, res) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  telegramState.botTokenConfigured = Boolean(botToken && botToken.length > 5);
  telegramState.chatIdConfigured = Boolean(chatId && chatId.length > 1);
  telegramState.configured = Boolean(telegramState.botTokenConfigured && telegramState.chatIdConfigured);

  res.json({
    ...telegramState,
    timestamp: Date.now(),
  });
});

// Telegram Card Image Preview Endpoint (Direct PNG output for testing/preview)
app.get('/api/telegram/preview-card', async (req, res) => {
  try {
    const sampleAlert = getFallbackSampleAlert(`preview-${Date.now()}`);
    const pngBuffer = await renderAlertCardAsPng(sampleAlert);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(pngBuffer);
  } catch (err: any) {
    console.error('[Preview Card Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Telegram Send Alert Endpoint (called for passed significance alerts)
app.post('/api/telegram/send', async (req, res) => {
  try {
    const alertData = req.body;
    if (!alertData || !alertData.id) {
      return res.status(400).json({ error: 'Missing alertData object' });
    }

    const result = await sendTelegramAlert(alertData);
    if (!result.success) {
      return res.status(502).json({
        error: result.error,
        status: telegramState.lastStatus,
      });
    }

    res.json({ success: true, messageId: result.messageId, format: result.format });
  } catch (err: any) {
    console.error('[Telegram API] /api/telegram/send error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Telegram Test Notification Endpoint
app.post('/api/telegram/test', async (req, res) => {
  try {
    const testAlert = getFallbackSampleAlert(`test-${Date.now()}`);

    const result = await sendTelegramAlert(testAlert);
    if (!result.success) {
      return res.status(502).json({
        error: result.error,
        status: telegramState.lastStatus,
      });
    }

    res.json({
      success: true,
      message: result.format === 'photo'
        ? 'Test sinyal kartı (PNG görseli) Telegram kanalınıza başarıyla gönderildi!'
        : 'Test bildirimi (düz metin yedeğiyle) Telegram kanalınıza iletildi.',
      format: result.format,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function getFallbackSampleAlert(alertId: string): AlertCardData {
  return {
    id: alertId || 'sample_btc_reversal',
    symbol: '#BTCUSDT',
    rawSymbol: 'BTCUSDT',
    timeframe: '15m',
    kind: 'BULLISH_REVERSAL',
    timestamp: Date.now(),
    title: 'BULLISH REVERSAL',
    headerTag: 'AÇIK POZİSYON DEĞİŞİMİ',
    currentPrice: 87450.5,
    entryPrice: 86890.0,
    priceChangePct: 0.65,
    oiChangePct: -4.82,
    startingOi: 78200,
    relativeOi: -2.35,
    relativePrice: 1.84,
    impactScore: 2.34,
    currentOi: 74500,
    baseAsset: 'BTC',
    burstType: 'Sert OI Düşüşü (Short Tasfiyesi)',
    signalType: 'Yükseliş Yönlü Dönüş (Long İhtimali)',
    patternName: 'Sell Burst Up → Sell Outflow',
    isBullish: true,
    confirmedLiquidations: {
      events: 18,
      notional: 3450000,
    },
    timeString: new Date().toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Istanbul',
    }),
  };
}

// REST Endpoint: Returns currently active alerts from continuous background scanner
app.get('/api/alerts/current', (req, res) => {
  res.json({
    success: true,
    alerts: backendCurrentAlerts,
    lastScanTimestamp,
    targets: MONITORED_TARGETS,
  });
});

// REST Endpoint: Fetch structured alert card data for rendering
app.get('/api/alerts/card-data/:alertId', (req, res) => {
  const alertId = req.params.alertId;
  const alert = backendAlertHistory.get(alertId) || getFallbackSampleAlert(alertId);
  res.json({ success: true, alert });
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled rejection:', reason);
});

async function startServer() {
  let viteInstance: any = null;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    viteInstance = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
  }

  // Internal Headless Puppeteer Render Route: Strictly accessible only from localhost
  app.get('/internal/render-card/:alertId', async (req, res) => {
    const ip = String(req.ip || req.socket.remoteAddress || '');
    const isLocalhost =
      ip.includes('127.0.0.1') ||
      ip.includes('::1') ||
      req.hostname === 'localhost' ||
      req.hostname === '127.0.0.1';

    if (!isLocalhost) {
      console.warn(`[Security] Forbidden external access attempt to /internal/render-card from IP: ${ip}`);
      return res.status(403).send('Forbidden: Internal access only from localhost');
    }

    try {
      const alertId = req.params.alertId;
      const alert = backendAlertHistory.get(alertId) || getFallbackSampleAlert(alertId);

      const htmlPath = process.env.NODE_ENV !== 'production'
        ? path.join(process.cwd(), 'render-card.html')
        : path.join(process.cwd(), 'dist', 'render-card.html');

      let rawHtml = fs.existsSync(htmlPath)
        ? fs.readFileSync(htmlPath, 'utf-8')
        : `<!doctype html><html><head><meta charset="UTF-8" /></head><body><div id="render-root"></div><script type="module" src="/src/render-entry/CardOnly.tsx"></script></body></html>`;

      // Inject alert data directly into window object for instant synchronous rendering
      const injectedScript = `<script>window.__ALERT_DATA__ = ${JSON.stringify(alert)};</script>`;
      rawHtml = rawHtml.replace('</head>', `${injectedScript}</head>`);

      if (viteInstance) {
        const transformedHtml = await viteInstance.transformIndexHtml(req.url, rawHtml);
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(transformedHtml);
      } else {
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(rawHtml);
      }
    } catch (err: any) {
      console.error('[Internal Render Card] Error preparing card HTML:', err);
      res.status(500).send(`Internal Error: ${err.message}`);
    }
  });

  if (viteInstance) {
    app.use(viteInstance.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Launch continuous background OI scanner
    setTimeout(() => {
      runBackgroundOiScan().catch((err) => console.error('[Background Scanner] Initial scan error:', err));
    }, 2000);

    setInterval(() => {
      runBackgroundOiScan().catch((err) => console.error('[Background Scanner] Loop scan error:', err));
    }, 30_000);
  });
}

startServer();
