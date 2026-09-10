import React, { useState } from 'react';
import { BarAnalysis } from '../types';
import { formatOiK, formatPrice, formatPercent, formatZScore } from '../utils/oiEngine';
import { Language, translations } from '../utils/i18n';
import { Layers } from 'lucide-react';

interface LiveOIChartProps {
  bars: BarAnalysis[];
  symbol: string;
  timeframe: string;
  lang?: Language;
}

export const LiveOIChart: React.FC<LiveOIChartProps> = ({ bars, symbol, timeframe, lang = 'tr' }) => {
  const [hoveredBar, setHoveredBar] = useState<BarAnalysis | null>(null);
  const t = translations[lang];
  const isTr = lang === 'tr';

  if (!bars.length) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-900/60 rounded-xl border border-slate-800 text-slate-400">
        {isTr ? 'Gerçek Binance Vadeli İşlemler piyasa verisi bekleniyor...' : 'Waiting for real Binance Futures market data...'}
      </div>
    );
  }

  // Use last 36 bars for crisp visual representation
  const displayBars = bars.slice(-36);

  // Price range
  const minPrice = Math.min(...displayBars.map((b) => b.lowPrice));
  const maxPrice = Math.max(...displayBars.map((b) => b.highPrice));
  const priceRange = maxPrice - minPrice || 1;

  // OI range
  const minOi = Math.min(...displayBars.map((b) => b.openInterest));
  const maxOi = Math.max(...displayBars.map((b) => b.openInterest));
  const oiRange = maxOi - minOi || 1;

  // Relative OI z-score range (-3 to +3 clamp)
  const chartHeight = 220;
  const oiSubHeight = 70;
  const width = 800; // viewBox width

  const barWidth = width / displayBars.length;

  const currentBar = hoveredBar || displayBars[displayBars.length - 1];

  const getLocalizedBarClassification = (classification: string) => {
    if (!isTr) return classification;
    switch (classification) {
      case 'Sell Outflow':
        return 'Satıcı Çıkışı (Short Kapanışı)';
      case 'Buy Outflow':
        return 'Alıcı Çıkışı (Long Kapanışı)';
      case 'Sell Accumulation':
        return 'Satıcı Birikimi (Short Girişi)';
      case 'Buy Accumulation':
        return 'Alıcı Birikimi (Long Girişi)';
      default:
        return classification || 'Nötr';
    }
  };

  return (
    <div id="live-oi-chart-container" className="bg-slate-900 rounded-xl border border-slate-800 p-4 sm:p-5 text-white">
      {/* Chart Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-800/40 text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight font-mono">{symbol}</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 font-mono">
                {timeframe}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {isTr ? 'Binance Vadeli İşlemler Canlı Gerçek Veri' : 'Binance Futures Live Real Data'}
            </span>
          </div>
        </div>

        {/* Hovered/Current Values HUD */}
        {currentBar && (
          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-mono bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800">
            <div>
              <span className="text-slate-400 text-xs font-sans">{isTr ? 'Fiyat: ' : 'Price: '}</span>
              <span className="font-bold text-slate-100">{formatPrice(currentBar.closePrice)}</span>
              <span
                className={`ml-1 text-xs ${
                  currentBar.priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ({formatPercent(currentBar.priceChangePct)})
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-xs font-sans">{isTr ? 'Açık Pozisyon (OI): ' : 'OI: '}</span>
              <span className="font-bold text-emerald-400">{formatOiK(currentBar.openInterest)}</span>
              <span
                className={`ml-1 text-xs ${
                  currentBar.oiChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ({formatPercent(currentBar.oiChangePct)})
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-xs font-sans">{isTr ? 'Göreceli OI (z): ' : 'Rel OI (z): '}</span>
              <span
                className={`font-bold ${
                  currentBar.relativeOiZScore >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatZScore(currentBar.relativeOiZScore)}
              </span>
            </div>
            <div className="hidden md:block">
              <span className="text-slate-400 text-xs font-sans">{isTr ? 'Bar Tipi: ' : 'Bar Type: '}</span>
              <span className="font-semibold text-amber-300">
                {getLocalizedBarClassification(currentBar.barClassification)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SVG Multi-layer Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${chartHeight + oiSubHeight + 30}`}
          className="w-full h-auto select-none"
          preserveAspectRatio="none"
        >
          {/* Background Grid Lines */}
          {[0.25, 0.5, 0.75].map((ratio, idx) => (
            <line
              key={idx}
              x1="0"
              y1={chartHeight * ratio}
              x2={width}
              y2={chartHeight * ratio}
              stroke="#1e293b"
              strokeDasharray="4 4"
            />
          ))}

          {/* Sub-panel separator line */}
          <line
            x1="0"
            y1={chartHeight + 10}
            x2={width}
            y2={chartHeight + 10}
            stroke="#334155"
            strokeWidth="1.5"
          />

          {/* Sub-panel zero line for z-score */}
          <line
            x1="0"
            y1={chartHeight + 10 + oiSubHeight / 2}
            x2={width}
            y2={chartHeight + 10 + oiSubHeight / 2}
            stroke="#475569"
            strokeDasharray="2 2"
          />

          {/* Render Bars & Candles */}
          {displayBars.map((bar, i) => {
            const xCenter = i * barWidth + barWidth / 2;
            const isUpCandle = bar.closePrice >= bar.openPrice;
            const candleColor = isUpCandle ? '#10b981' : '#f43f5e';

            // Coordinates for candlestick
            const yHigh = chartHeight - ((bar.highPrice - minPrice) / priceRange) * (chartHeight - 30) - 15;
            const yLow = chartHeight - ((bar.lowPrice - minPrice) / priceRange) * (chartHeight - 30) - 15;
            const yOpen = chartHeight - ((bar.openPrice - minPrice) / priceRange) * (chartHeight - 30) - 15;
            const yClose = chartHeight - ((bar.closePrice - minPrice) / priceRange) * (chartHeight - 30) - 15;
            const yTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

            // OI Bar on Sub-panel (Relative OI z-score)
            // Range -3 to +3
            const clampedZ = Math.max(-3, Math.min(3, bar.relativeOiZScore));
            const subCenterY = chartHeight + 10 + oiSubHeight / 2;
            const zBarHeight = Math.abs(clampedZ) * (oiSubHeight / 2 / 3);
            const zBarY = clampedZ >= 0 ? subCenterY - zBarHeight : subCenterY;
            const zBarColor = clampedZ >= 0 ? '#10b981' : '#f43f5e';

            // Check if this bar has a pattern
            const isReversal =
              bar.barClassification === 'Sell Outflow' || bar.barClassification === 'Buy Outflow';
            const isLiquidation =
              (bar.priceChangePct > 0.1 && bar.oiChangePct < -0.3) ||
              (bar.priceChangePct < -0.1 && bar.oiChangePct < -0.3);

            return (
              <g
                key={bar.timestamp}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredBar(bar)}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {/* Hover hit area */}
                <rect
                  x={i * barWidth}
                  y={0}
                  width={barWidth}
                  height={chartHeight + oiSubHeight + 30}
                  fill="transparent"
                  className="group-hover:fill-slate-800/40 transition-colors"
                />

                {/* Candle Wick */}
                <line
                  x1={xCenter}
                  y1={yHigh}
                  x2={xCenter}
                  y2={yLow}
                  stroke={candleColor}
                  strokeWidth="1.5"
                />

                {/* Candle Body */}
                <rect
                  x={xCenter - barWidth * 0.35}
                  y={yTop}
                  width={Math.max(2, barWidth * 0.7)}
                  height={bodyHeight}
                  fill={candleColor}
                  rx="1"
                />

                {/* Relative OI z-score bar on lower panel */}
                <rect
                  x={xCenter - barWidth * 0.3}
                  y={zBarY}
                  width={Math.max(2, barWidth * 0.6)}
                  height={Math.max(1, zBarHeight)}
                  fill={zBarColor}
                  opacity="0.85"
                  rx="1"
                />

                {/* Pattern Indicator Badge */}
                {isReversal && (
                  <circle
                    cx={xCenter}
                    y={yHigh - 8}
                    r="4"
                    fill={isUpCandle ? '#3b82f6' : '#a855f7'}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                )}

                {isLiquidation && (
                  <polygon
                    points={`${xCenter},${yLow + 12} ${xCenter - 4},${yLow + 6} ${xCenter + 4},${yLow + 6}`}
                    fill="#eab308"
                  />
                )}
              </g>
            );
          })}

          {/* Connected OI Line on Top of Candles */}
          <polyline
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeDasharray="2 1"
            opacity="0.75"
            points={displayBars
              .map((b, i) => {
                const x = i * barWidth + barWidth / 2;
                const y = chartHeight - ((b.openInterest - minOi) / oiRange) * (chartHeight - 40) - 20;
                return `${x},${y}`;
              })
              .join(' ')}
          />

          {/* Time labels on bottom */}
          {displayBars
            .filter((_, i) => i % 6 === 0 || i === displayBars.length - 1)
            .map((b) => {
              const originalIndex = displayBars.indexOf(b);
              const x = originalIndex * barWidth + barWidth / 2;
              return (
                <text
                  key={b.timestamp}
                  x={x}
                  y={chartHeight + oiSubHeight + 25}
                  fill="#94a3b8"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {b.timeFormatted}
                </text>
              );
            })}
        </svg>
      </div>

      {/* Chart Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/80 gap-2">
        <div className="flex items-center space-x-4 flex-wrap gap-y-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 bg-emerald-500 rounded-sm inline-block"></span>
            <span>{isTr ? 'Yükseliş Mumu' : 'Bullish Candle'}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 bg-rose-500 rounded-sm inline-block"></span>
            <span>{isTr ? 'Düşüş Mumu' : 'Bearish Candle'}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-sky-400 inline-block"></span>
            <span>{isTr ? 'Açık Pozisyon Eğrisi (OI)' : 'Open Interest (OI)'}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-y-1">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
            <span>{isTr ? 'Dönüş Sinyali' : 'Reversal Point'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 bg-amber-400 rotate-45 inline-block"></span>
            <span>{isTr ? 'Likidasyon Sıkışması' : 'Liquidation Burst'}</span>
          </div>
          <span className="text-slate-400 font-mono">
            {isTr ? 'Alt Panel: Göreceli OI (z-skor)' : 'Lower: Rel OI (z-score)'}
          </span>
        </div>
      </div>
    </div>
  );
};

