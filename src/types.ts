export type Timeframe = '5m' | '15m' | '30m' | '1h' | '2h' | '4h';

export interface BinanceOiHistItem {
  symbol: string;
  sumOpenInterest: string;
  sumOpenInterestValue: string;
  timestamp: number;
}

export interface BarAnalysis {
  timestamp: number;
  timeFormatted: string;
  openPrice: number;
  closePrice: number;
  highPrice: number;
  lowPrice: number;
  priceChangePct: number;
  openInterest: number;
  openInterestValue: number;
  oiChangePct: number;
  relativeOiZScore: number;
  relativePriceZScore: number;
  burstType: 'Down Burst (Rapid OI Decrease)' | 'Up Burst (Rapid OI Increase)' | 'Normal OI Flow';
  barClassification: 'Sell Burst Up' | 'Sell Outflow' | 'Buy Burst Up' | 'Buy Outflow' | 'Neutral';
}

export type AlertKind =
  | 'BULLISH_REVERSAL'
  | 'BEARISH_REVERSAL'
  | 'MASSIVE_SHORTS_LIQ'
  | 'MASSIVE_LONGS_LIQ'
  | 'RAPID_OI_UP'
  | 'RAPID_OI_DOWN';

export interface AlertCardData {
  id: string;
  timestamp: number;
  timeString: string;
  kind: AlertKind;
  headerTag: string; // "Open Interest Variation – Alerts"
  title: string; // e.g. "🔄 BULLISH REVERSAL PATTERN DETECTED" or "⚠️ MASSIVE SHORTS LIQUIDATION (S-OUT)"
  patternName: string; // "Sell Burst Up → Sell Outflow"
  symbol: string; // "#BTCUSDT.P"
  rawSymbol: string; // "BTCUSDT"
  timeframe: string; // "15" or "15 minutes"
  entryPrice: number;
  currentPrice: number;
  priceChangePct: number;
  startingOi: number;
  currentOi: number;
  startingOiValue?: number;
  currentOiValue?: number;
  baseAsset?: string;
  oiChangePct: number;
  relativeOi: number;
  relativePrice: number;
  impactScore: number;
  burstType: string;
  subHeaderTitle?: string; // "♨️ SHORTS CLOSING" / "♻️ LONGS CLOSING"
  subHeaderDesc?: string; // "Bears are exiting their positions rapidly"
  signalType: string;
  isBullish: boolean;
  patternInterpretation?: string[];
  riskManagement?: string[];
  confirmedLiquidations?: {
    events: number;
    notional: number;
  };
}

export interface CheckpointResult {
  targetTime: number;
  price?: number;
  priceChangePct?: number;
  isSuccessful?: boolean;
  evaluated: boolean;
  evaluatedAt?: number;
}

export interface TrackedAlertOutcome {
  id: string;
  timestamp: number;
  timeString: string;
  kind: AlertKind;
  patternName: string;
  symbol: string;
  rawSymbol: string;
  timeframe: string;
  triggerPrice: number;
  targetDirection: 'BULLISH' | 'BEARISH';
  impactScore?: number;
  confirmedLiquidations: {
    events: number;
    notional: number;
  };
  checkpoints: {
    '15m': CheckpointResult;
    '1h': CheckpointResult;
    '4h': CheckpointResult;
  };
  isOverallEvaluated: boolean;
}

export interface TelegramStatus {
  configured: boolean;
  botTokenConfigured: boolean;
  chatIdConfigured: boolean;
  lastAttemptAt?: number;
  lastSuccessAt?: number;
  lastError?: string | null;
  lastStatus: 'idle' | 'success' | 'error' | 'not_configured';
  sentCount: number;
}

export interface SignificanceFilterLog {
  id: string;
  alertId: string;
  timestamp: number;
  symbol: string;
  timeframe: string;
  direction: 'BULLISH' | 'BEARISH';
  impactScore: number;
  prevImpactScore?: number;
  relativeOiZScore?: number;
  prevRelativeOiZScore?: number;
  status: 'passed' | 'filtered';
  reason: string;
}

export interface PatternStatsSummary {
  patternName: string;
  totalAlerts: number;
  evaluatedCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number;
  avgLiquidationsNotional: number;
  fifteenMinWinRatePct: number;
  oneHourWinRatePct: number;
  fourHourWinRatePct: number;
}

export interface KindStatsSummary {
  kind: AlertCardData['kind'];
  kindGroup: 'INFLOW' | 'REVERSAL' | 'LIQUIDATION' | 'OTHER';
  displayName: string;
  totalAlerts: number;
  evaluatedCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number;
  fifteenMinWinRatePct: number;
  oneHourWinRatePct: number;
  fourHourWinRatePct: number;
  avgLiquidationsNotional: number;
}

export interface LiquidationStreamData {
  symbol: string;
  count: number;
  totalNotional: number;
  longCount: number;
  longNotional: number;
  shortCount: number;
  shortNotional: number;
  wsConnected: boolean;
  totalBufferedEvents: number;
}

export type ImageAspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9';
export type ImageSize = '1K' | '2K' | '4K';
export type ImageModel = 'gemini-3-pro-image-preview' | 'gemini-3.1-flash-image-preview';

export interface ImageGenConfig {
  prompt: string;
  aspectRatio: ImageAspectRatio;
  imageSize: ImageSize;
  model: ImageModel;
}

export interface GeneratedImageResult {
  id: string;
  timestamp: number;
  prompt: string;
  imageUrl: string;
  aspectRatio: ImageAspectRatio;
  imageSize: ImageSize;
  model: ImageModel;
}
