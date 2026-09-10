import React, { useState } from 'react';
import { AlertCardData } from '../types';
import { formatOiK, formatPrice, formatPercent, formatZScore, formatNotional } from '../utils/oiEngine';
import { Language, translations } from '../utils/i18n';
import { Copy, Check, Sparkles, Activity } from 'lucide-react';

interface AlertCardProps {
  alert: AlertCardData;
  onGenerateImage?: (alert: AlertCardData) => void;
  lang?: Language;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert, onGenerateImage, lang = 'tr' }) => {
  const [copied, setCopied] = useState(false);
  const t = translations[lang];
  const isTr = lang === 'tr';

  const liqString = alert.confirmedLiquidations
    ? isTr
      ? `${alert.confirmedLiquidations.events} işlem, ${formatNotional(alert.confirmedLiquidations.notional)} hacim`
      : `${alert.confirmedLiquidations.events} events, ${formatNotional(alert.confirmedLiquidations.notional)} notional`
    : isTr
      ? '0 işlem, $0.00 hacim'
      : '0 events, $0.00 notional';

  const handleCopyText = () => {
    let text = `${alert.headerTag}\n`;
    text += `${alert.title}\n\n`;
    text += `${t.patternLabel}${alert.patternName}\n`;
    text += `${t.symbolLabel}${alert.symbol}\n`;
    text += `${t.timeframeLabel}${alert.timeframe}\n\n`;

    if (alert.kind === 'BULLISH_REVERSAL' || alert.kind === 'BEARISH_REVERSAL') {
      text += `${t.patternDetailsTitle}\n`;
      text += `• ${t.entryPriceLabel}${formatPrice(alert.entryPrice)}\n`;
      text += `• ${t.currentPriceLabel}${formatPrice(alert.currentPrice)}\n`;
      text += `• ${t.priceChangeLabel}${formatPercent(alert.priceChangePct)}\n\n`;
      text += `${t.oiAnalysisTitle}\n`;
      text += `• ${t.startingOiLabel}${formatOiK(alert.startingOi, alert.baseAsset)}\n`;
      text += `• ${t.currentOiLabel}${formatOiK(alert.currentOi, alert.baseAsset)}\n`;
      text += `• ${t.oiChangeLabel}${formatPercent(alert.oiChangePct)}\n`;
      text += `• ${t.relativeOiLabel}${formatZScore(alert.relativeOi)}\n`;
      text += `• ${t.relativePriceLabel}${formatZScore(alert.relativePrice)}\n`;
      text += `• Impact Score: ${alert.impactScore?.toFixed(2) || 'N/A'}\n`;
      text += `• ${t.burstTypeLabel} ${alert.burstType}\n`;
      text += `• ${t.confirmedLiqLabel} ${liqString}\n`;
      text += `• ${t.signalTypeLabel} ${alert.isBullish ? '🟢' : '🔴'} ${alert.signalType}\n`;
    } else {
      text += `${t.priceLabel}${formatPrice(alert.currentPrice)}\n`;
      text += `${t.openInterest}: ${formatOiK(alert.currentOi, alert.baseAsset)}\n`;
      text += `${t.oiChangeLabel}${formatPercent(alert.oiChangePct)}\n`;
      text += `${t.relativeOiLabel}${formatZScore(alert.relativeOi)}\n`;
      text += `${t.relativePriceLabel}${formatZScore(alert.relativePrice)}\n`;
      text += `• Impact Score: ${alert.impactScore?.toFixed(2) || 'N/A'}\n\n`;
      text += `${alert.patternName}:\n`;
      text += `• ${alert.priceChangePct >= 0 ? t.priceIsRising : t.priceIsFalling} (${formatPercent(alert.priceChangePct)})\n`;
      text += `• ${alert.oiChangePct <= 0 ? t.oiIsDecreasing : t.oiIsIncreasing} (${formatPercent(alert.oiChangePct)})\n\n`;
      text += `${t.burstTypeLabel} ${alert.burstType}\n`;
      text += `${t.confirmedLiqLabel} ${liqString}\n`;
      if (alert.subHeaderTitle) {
        text += `${alert.subHeaderTitle}\n${alert.subHeaderDesc}\n`;
      }
      text += `${t.signalTypeLabel} ${alert.isBullish ? '🟢' : '🔴'} ${alert.signalType}\n`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isReversal = alert.kind === 'BULLISH_REVERSAL' || alert.kind === 'BEARISH_REVERSAL';

  return (
    <div
      id={`alert-card-${alert.id}`}
      className="bg-white text-slate-900 rounded-xl shadow-lg border border-slate-200/80 p-5 font-sans relative hover:shadow-xl transition-shadow duration-200"
    >
      {/* Top action bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-emerald-700 font-bold text-xs uppercase tracking-wider">
            {alert.headerTag}
          </span>
          {alert.impactScore !== undefined && (
            <span
              id={`impact-badge-${alert.id}`}
              title={isTr ? `Sinyal Önem Skoru (Piyasa Etkisi): ${alert.impactScore.toFixed(2)} (OI Z-Skor, Fiyat Z-Skor, OI Değişimi ve Likidasyondan hesaplandı)` : `Significance Impact Score: ${alert.impactScore.toFixed(2)}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs"
            >
              <Activity className="w-3 h-3 text-amber-600" />
              <span>Impact: {alert.impactScore.toFixed(2)}</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-xs text-slate-600 mr-2 font-mono">
            {alert.timeString}
          </span>
          <button
            id={`copy-btn-${alert.id}`}
            onClick={handleCopyText}
            title={copied ? t.copiedTooltip : t.copyAlertTooltip}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
          {onGenerateImage && (
            <button
              id={`ai-gen-btn-${alert.id}`}
              onClick={() => onGenerateImage(alert)}
              title={t.aiCardTooltip}
              className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isTr ? 'AI Görsel' : 'AI Visual'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Alert Title */}
      <div className="mb-3">
        <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-950 flex items-center gap-1.5 flex-wrap">
          {alert.title}
        </h3>
      </div>

      {/* Symbol & Timeframe */}
      <div className="space-y-1 mb-4 text-sm font-medium text-slate-800">
        {isReversal ? (
          <div>
            <span className="text-slate-600">{t.patternLabel}</span>
            <span className="font-semibold text-slate-900">{alert.patternName}</span>
          </div>
        ) : null}

        <div>
          <span className="text-slate-600">{t.symbolLabel}</span>
          <span className="text-blue-600 font-bold font-mono tracking-tight">{alert.symbol}</span>
        </div>

        <div>
          <span className="text-slate-600">{t.timeframeLabel}</span>
          <span className="font-bold text-slate-950 font-mono">{alert.timeframe}</span>
        </div>

        {!isReversal && (
          <div>
            <span className="text-slate-600">{t.priceLabel}</span>
            <span className="font-bold text-slate-950 font-mono">{formatPrice(alert.currentPrice)}</span>
          </div>
        )}
      </div>

      {/* Reversal Style Card Body */}
      {isReversal ? (
        <div className="space-y-4 text-sm">
          {/* Pattern Details */}
          <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-100">
            <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-2">
              <span>📊</span>
              <span>{t.patternDetailsTitle}</span>
            </div>
            <ul className="space-y-1 text-slate-800 font-mono text-xs sm:text-sm pl-4 list-disc">
              <li>
                <span className="text-slate-600 font-sans">{t.entryPriceLabel}</span>
                <span className="font-semibold">{formatPrice(alert.entryPrice)}</span>
              </li>
              <li>
                <span className="text-slate-600 font-sans">{t.currentPriceLabel}</span>
                <span className="font-semibold">{formatPrice(alert.currentPrice)}</span>
              </li>
              <li>
                <span className="text-slate-600 font-sans">{t.priceChangeLabel}</span>
                <span
                  className={`font-semibold ${
                    alert.priceChangePct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {formatPercent(alert.priceChangePct)}
                </span>
              </li>
            </ul>
          </div>

          {/* Open Interest Analysis */}
          <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-100">
            <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-2">
              <span>📈</span>
              <span>{t.oiAnalysisTitle}</span>
            </div>
            <ul className="space-y-1 text-slate-800 font-mono text-xs sm:text-sm pl-4 list-disc">
              <li>
                <span className="text-slate-600 font-sans">{t.startingOiLabel}</span>
                <span className="font-semibold">{formatOiK(alert.startingOi, alert.baseAsset)}</span>
                {alert.startingOiValue && alert.startingOiValue > 0 ? (
                  <span className="text-slate-500 font-sans text-xs ml-1.5 font-normal">
                    ({formatNotional(alert.startingOiValue)})
                  </span>
                ) : null}
              </li>
              <li>
                <span className="text-slate-600 font-sans">{t.currentOiLabel}</span>
                <span className="font-semibold">{formatOiK(alert.currentOi, alert.baseAsset)}</span>
                {alert.currentOiValue && alert.currentOiValue > 0 ? (
                  <span className="text-slate-500 font-sans text-xs ml-1.5 font-normal">
                    ({formatNotional(alert.currentOiValue)})
                  </span>
                ) : null}
              </li>
              <li>
                <span className="text-slate-600 font-sans">{t.oiChangeLabel}</span>
                <span
                  className={`font-semibold ${
                    alert.oiChangePct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {formatPercent(alert.oiChangePct)}
                </span>
              </li>
              <li>
                <span className="text-slate-600 font-sans">{t.relativeOiLabel}</span>
                <span className="font-semibold">{formatZScore(alert.relativeOi)}</span>
              </li>
              {alert.impactScore !== undefined && (
                <li>
                  <span className="text-slate-600 font-sans">{isTr ? 'Önem Skoru (Impact): ' : 'Impact Score: '}</span>
                  <span className="font-semibold text-amber-800 font-mono">{alert.impactScore.toFixed(2)}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Pattern Interpretation */}
          {alert.patternInterpretation && alert.patternInterpretation.length > 0 && (
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                <span>🎯</span>
                <span>{t.patternInterpretationTitle}</span>
              </div>
              <ul className="space-y-1 text-slate-700 text-xs sm:text-sm pl-4 list-disc">
                {alert.patternInterpretation.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk Management */}
          {alert.riskManagement && alert.riskManagement.length > 0 && (
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                <span>⚠️</span>
                <span>{t.riskManagementTitle}</span>
              </div>
              <ul className="space-y-1 text-slate-700 text-xs sm:text-sm pl-4 list-disc">
                {alert.riskManagement.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Burst Type, Confirmed Liquidations & Signal Type */}
          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs sm:text-sm">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-950">{t.burstTypeLabel}</span>
              <span className="font-semibold text-slate-800">{alert.burstType}</span>
            </div>

            <div className="flex items-center justify-between bg-amber-50/70 p-2 rounded-lg border border-amber-200/50">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span>{t.confirmedLiqLabel}</span>
              </span>
              <span className="font-mono font-bold text-amber-950">
                {liqString}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-slate-950">{t.signalTypeLabel}</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                  alert.isBullish
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    alert.isBullish ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                ></span>
                <span>{alert.signalType}</span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Liquidation S-OUT / B-OUT Style Card Body */
        <div className="space-y-3.5 text-sm">
          {/* Key Metrics block */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50/80 rounded-lg border border-slate-100 font-mono text-xs sm:text-sm">
            <div>
              <span className="text-slate-500 font-sans block text-xs">
                {t.openInterest} {alert.baseAsset ? `(${alert.baseAsset})` : ''}
              </span>
              <span className="font-bold text-slate-900">{formatOiK(alert.currentOi, alert.baseAsset)}</span>
              {alert.currentOiValue && alert.currentOiValue > 0 ? (
                <span className="text-slate-500 block text-[11px] font-sans font-normal">
                  ≈ {formatNotional(alert.currentOiValue)} USD
                </span>
              ) : null}
            </div>
            <div>
              <span className="text-slate-500 font-sans block text-xs">{t.oiChangeLabel}</span>
              <span
                className={`font-bold ${
                  alert.oiChangePct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatPercent(alert.oiChangePct)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block text-xs">{t.relativeOiLabel}</span>
              <span className="font-bold text-slate-900">{formatZScore(alert.relativeOi)}</span>
            </div>
            <div>
              <span className="text-slate-500 font-sans block text-xs">{t.relativePriceLabel}</span>
              <span className="font-bold text-slate-900">{formatZScore(alert.relativePrice)}</span>
            </div>
            {alert.impactScore !== undefined && (
              <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-slate-600 font-sans text-xs">
                  {isTr ? 'Önem Skoru (Piyasa Etkisi):' : 'Significance Impact Score:'}
                </span>
                <span className="font-bold text-amber-800 font-mono text-xs px-1.5 py-0.5 bg-amber-50 rounded border border-amber-200">
                  {alert.impactScore.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Outflow Pattern block */}
          <div className="space-y-1">
            <div className="font-bold text-slate-900">{alert.patternName}:</div>
            <ul className="space-y-0.5 text-slate-700 text-xs sm:text-sm pl-4 list-disc">
              <li>
                {alert.priceChangePct >= 0 ? t.priceIsRising : t.priceIsFalling} ({formatPercent(alert.priceChangePct)})
              </li>
              <li>
                {alert.oiChangePct <= 0 ? t.oiIsDecreasing : t.oiIsIncreasing} ({formatPercent(alert.oiChangePct)})
              </li>
            </ul>
          </div>

          {/* Burst Type */}
          <div className="text-xs sm:text-sm">
            <span className="font-bold text-slate-950">{t.burstTypeLabel} </span>
            <span className="font-semibold text-slate-800">{alert.burstType}</span>
          </div>

          {/* Subheader / Action description */}
          {alert.subHeaderTitle && (
            <div className="pt-1">
              <div className="font-bold text-slate-950 flex items-center gap-1.5 text-sm">
                <span>{alert.subHeaderTitle}</span>
              </div>
              {alert.subHeaderDesc && (
                <p className="text-slate-700 text-xs sm:text-sm">{alert.subHeaderDesc}</p>
              )}
            </div>
          )}

          {/* Confirmed Liquidations Row */}
          <div className="flex items-center justify-between bg-amber-50/70 p-2 rounded-lg border border-amber-200/50 text-xs sm:text-sm">
            <span className="font-bold text-amber-900 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>{t.confirmedLiqLabel}</span>
            </span>
            <span className="font-mono font-bold text-amber-950">
              {liqString}
            </span>
          </div>

          {/* Signal Type */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            <span className="font-bold text-slate-950 text-sm">{t.signalTypeLabel}</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                alert.isBullish
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  alert.isBullish ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              ></span>
              <span>{alert.signalType}</span>
            </span>
          </div>
        </div>
      )}

      {/* Real Binance Data Verification Footer */}
      <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
          <span className="text-slate-600">{t.verifiedFooter}</span>
        </span>
        <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[10px]">
          {t.verifiedBadge}
        </span>
      </div>
    </div>
  );
};
