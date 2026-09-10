import React from 'react';
import { BarAnalysis } from '../types';
import { formatOiK, formatPrice, formatPercent, formatZScore, formatNotional } from '../utils/oiEngine';
import { Language, translations } from '../utils/i18n';
import { Activity, Info, BarChart3, Zap, ShieldAlert } from 'lucide-react';

interface MarketStatsBarProps {
  currentPrice: number;
  priceChange24h: number;
  instantOi: number;
  instantOiValue: number;
  bars: BarAnalysis[];
  symbol?: string;
  liquidationData?: {
    count: number;
    totalNotional: number;
    longCount: number;
    shortCount: number;
  } | null;
  lang?: Language;
}

export const MarketStatsBar: React.FC<MarketStatsBarProps> = ({
  currentPrice,
  priceChange24h,
  instantOi,
  instantOiValue,
  bars,
  symbol = 'BTCUSDT',
  liquidationData,
  lang = 'tr',
}) => {
  const latestBar = bars.length > 0 ? bars[bars.length - 1] : null;
  const firstBar = bars.length > 0 ? bars[0] : null;
  const baseAsset = symbol.replace(/USDT$|BUSD$|USDC$/, '');
  const t = translations[lang];
  const isTr = lang === 'tr';

  const windowOiDeltaPct =
    latestBar && firstBar && firstBar.openInterest > 0
      ? ((latestBar.openInterest - firstBar.openInterest) / firstBar.openInterest) * 100
      : 0;

  const getLocalizedBurst = (burst?: string) => {
    if (!burst || burst === 'Normal OI Flow') return isTr ? 'Normal OI Akışı' : 'Normal OI Flow';
    if (burst.includes('Down Burst')) return isTr ? 'Aşağı Patlama (Ani Düşüş)' : 'Down Burst (Rapid OI Drop)';
    if (burst.includes('Up Burst')) return isTr ? 'Yukarı Patlama (Ani Artış)' : 'Up Burst (Rapid OI Surge)';
    return burst;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
      {/* 1. Live Price */}
      <div className="space-y-1">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t.marketIndexPrice}</span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-lg sm:text-xl font-extrabold font-mono text-white">
            {formatPrice(currentPrice || (latestBar ? latestBar.closePrice : 0))}
          </span>
          <span
            className={`text-xs font-bold font-mono ${
              priceChange24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatPercent(priceChange24h)}
          </span>
        </div>
        <div className="text-[11px] text-slate-500">{t.marketLiveFeed}</div>
      </div>

      {/* 2. Open Interest */}
      <div className="space-y-1">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
          <span>{t.marketOiLabel} ({baseAsset})</span>
        </div>
        <div className="flex items-baseline space-x-2 flex-wrap">
          <span className="text-lg sm:text-xl font-extrabold font-mono text-sky-300">
            {formatOiK(instantOi || (latestBar ? latestBar.openInterest : 0), baseAsset)}
          </span>
          {instantOiValue > 0 && (
            <span className="text-xs text-slate-400 font-mono">
              ≈ {formatNotional(instantOiValue)}
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-500">
          {t.marketWindowDelta}{' '}
          <span className={windowOiDeltaPct >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
            {formatPercent(windowOiDeltaPct)}
          </span>
        </div>
      </div>

      {/* 3. Relative OI (z-score) */}
      <div className="space-y-1">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <Zap className="w-3.5 h-3.5 text-purple-400" />
          <span>{t.relativeOiZScore}</span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span
            className={`text-lg sm:text-xl font-extrabold font-mono ${
              latestBar && latestBar.relativeOiZScore >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {latestBar ? formatZScore(latestBar.relativeOiZScore) : '0.00'}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            σ dev (N={bars.length})
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          {t.relativePriceLabel} {latestBar ? formatZScore(latestBar.relativePriceZScore) : '0.00'}
        </div>
      </div>

      {/* 4. Current Burst State */}
      <div className="space-y-1">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <Info className="w-3.5 h-3.5 text-amber-400" />
          <span>{t.marketActiveFlow}</span>
        </div>
        <div>
          <span
            className={`inline-block px-2.5 py-1 rounded text-xs font-bold font-mono ${
              latestBar?.burstType === 'Down Burst (Rapid OI Decrease)'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                : latestBar?.burstType === 'Up Burst (Rapid OI Increase)'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {getLocalizedBurst(latestBar?.burstType)}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-medium">
          {latestBar?.barClassification || (isTr ? 'Nötr Akış' : 'Neutral')}
        </div>
      </div>

      {/* 5. Confirmed Liquidations (WebSocket Live Feed) */}
      <div className="space-y-1 col-span-2 md:col-span-1">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>{t.marketLiq15m}</span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-lg sm:text-xl font-extrabold font-mono text-amber-400">
            {formatNotional(liquidationData?.totalNotional || 0)}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {liquidationData?.count || 0} {isTr ? 'işlem' : 'ev'}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Long: <span className="text-rose-400 font-bold">{liquidationData?.longCount || 0}</span> | Short:{' '}
          <span className="text-emerald-400 font-bold">{liquidationData?.shortCount || 0}</span>
        </div>
      </div>
    </div>
  );
};

