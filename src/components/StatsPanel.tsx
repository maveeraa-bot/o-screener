import React, { useState } from 'react';
import { TrackedAlertOutcome } from '../types';
import { calculatePatternStats } from '../utils/forwardTrackingEngine';
import { formatPrice, formatPercent, formatNotional } from '../utils/oiEngine';
import { Language, translations } from '../utils/i18n';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Trash2,
  ShieldCheck,
  Flame,
  Layers,
  Zap,
} from 'lucide-react';

interface StatsPanelProps {
  trackedAlerts: TrackedAlertOutcome[];
  onRefreshEvaluation: () => void;
  onClearLogs: () => void;
  isEvaluating: boolean;
  selectedSymbol: string;
  lang?: Language;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  trackedAlerts,
  onRefreshEvaluation,
  onClearLogs,
  isEvaluating,
  selectedSymbol,
  lang = 'tr',
}) => {
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');
  const [filterPattern, setFilterPattern] = useState<string>('ALL');
  const [breakdownTab, setBreakdownTab] = useState<'FAMILIES' | 'PATTERNS'>('FAMILIES');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const t = translations[lang];
  const isTr = lang === 'tr';

  // Filter items
  const filteredAlerts = trackedAlerts.filter((item) => {
    if (filterSymbol !== 'ALL' && item.rawSymbol !== filterSymbol) return false;
    if (filterPattern !== 'ALL' && item.patternName !== filterPattern) return false;
    return true;
  });

  const stats = calculatePatternStats(filteredAlerts);

  // Unique symbols and patterns for filtering dropdowns
  const uniqueSymbols = Array.from(new Set(trackedAlerts.map((t) => t.rawSymbol)));
  const uniquePatterns = Array.from(new Set(trackedAlerts.map((t) => t.patternName)));

  // Export to CSV function
  const handleExportCsv = () => {
    if (trackedAlerts.length === 0) return;

    const headers = [
      'Timestamp',
      'DateTime',
      'Symbol',
      'Timeframe',
      'Pattern',
      'TargetDirection',
      'TriggerPrice',
      '15m_Price',
      '15m_ChangePct',
      '15m_Success',
      '1h_Price',
      '1h_ChangePct',
      '1h_Success',
      '4h_Price',
      '4h_ChangePct',
      '4h_Success',
      'ConfirmedLiquidationsEvents',
      'ConfirmedLiquidationsNotional',
    ];

    const rows = trackedAlerts.map((a) => [
      a.timestamp,
      `"${a.timeString}"`,
      a.symbol,
      a.timeframe,
      `"${a.patternName}"`,
      a.targetDirection,
      a.triggerPrice,
      a.checkpoints['15m'].price || '',
      a.checkpoints['15m'].priceChangePct?.toFixed(3) || '',
      a.checkpoints['15m'].isSuccessful ?? '',
      a.checkpoints['1h'].price || '',
      a.checkpoints['1h'].priceChangePct?.toFixed(3) || '',
      a.checkpoints['1h'].isSuccessful ?? '',
      a.checkpoints['4h'].price || '',
      a.checkpoints['4h'].priceChangePct?.toFixed(3) || '',
      a.checkpoints['4h'].isSuccessful ?? '',
      a.confirmedLiquidations.events,
      a.confirmedLiquidations.notional,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `oi_alerts_tracking_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderCheckpointBadge = (
    cp: TrackedAlertOutcome['checkpoints']['15m'],
    targetDirection: 'BULLISH' | 'BEARISH'
  ) => {
    if (!cp.evaluated) {
      const remainingMs = cp.targetTime - Date.now();
      const minsRemaining = Math.max(0, Math.ceil(remainingMs / 60000));
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-400 border border-slate-700">
          <Clock className="w-3 h-3 text-slate-500 animate-spin" />
          <span>{minsRemaining > 0 ? `~${minsRemaining}${isTr ? 'dk' : 'm'}` : isTr ? 'Kontrol ediliyor' : 'Checking'}</span>
        </span>
      );
    }

    const isWin = cp.isSuccessful;
    const change = cp.priceChangePct || 0;

    return (
      <div className="flex flex-col items-start gap-0.5 font-mono text-xs">
        <div className="flex items-center gap-1">
          {isWin ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{formatPercent(change)}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <XCircle className="w-3 h-3 text-rose-400" />
              <span>{formatPercent(change)}</span>
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-400">
          {cp.price ? formatPrice(cp.price) : ''}
        </span>
      </div>
    );
  };

  return (
    <div id="stats-panel-container" className="space-y-6">
      {/* Real Data Banner */}
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-800/40 rounded-xl p-4 sm:p-5 text-slate-200 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>{t.statsBannerTitle}</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                {t.statsBannerDesc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              id="refresh-eval-btn"
              onClick={onRefreshEvaluation}
              disabled={isEvaluating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
              <span>{isEvaluating ? t.statsRefreshing : t.statsRefreshBtn}</span>
            </button>
            <button
              id="export-csv-btn"
              onClick={handleExportCsv}
              disabled={trackedAlerts.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.statsExportCsv}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Tracked */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block font-medium">{t.statsTotalAlerts}</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white font-mono">
              {stats.overallTotal}
            </span>
            <span className="text-xs text-slate-500 font-mono">{isTr ? 'kayıt' : 'items'}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {stats.overallEvaluated} {isTr ? 'değerlendirildi' : 'evaluated'}
          </span>
        </div>

        {/* Win Rate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block font-medium">{t.statsWinRate}</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-2xl font-extrabold font-mono ${
                stats.overallWinRatePct >= 50 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              %{stats.overallWinRatePct.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {stats.overallWins}/{stats.overallEvaluated}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${
                stats.overallWinRatePct >= 50 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, stats.overallWinRatePct)}%` }}
            ></div>
          </div>
        </div>

        {/* 15m Accuracy */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block font-medium">{t.stats15mRate}</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white font-mono">
              %{stats.fifteenMinWinRate.toFixed(1)}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {isTr ? 'Tetiklenme sonrası ilk bar' : 'First bar post-trigger'}
          </span>
        </div>

        {/* 1h Accuracy */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 block font-medium">{t.stats1hRate}</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-blue-400 font-mono">
              %{stats.oneHourWinRate.toFixed(1)}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {isTr ? 'Orta vadeli yön devamı' : 'Mid-term continuation'}
          </span>
        </div>

        {/* Confirmed Liquidations */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 col-span-2 md:col-span-1">
          <span className="text-xs text-slate-400 block font-medium">{t.statsTotalLiq}</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-400 font-mono">
              {formatNotional(stats.totalLiquidationsSum)}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {isTr ? 'WebSocket !forceOrder toplamı' : 'WebSocket !forceOrder total'}
          </span>
        </div>
      </div>

      {/* RAPID_OI_UP Focus Performance Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-xl p-4 sm:p-5 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {isTr ? '🔥 Agresif OI Girişi (RAPID_OI_UP) Bağımsız Doğrulama' : '🔥 Aggressive Inflow (RAPID_OI_UP) Independent Tracking'}
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isTr ? 'Ayrılmış Hafıza Havuzu' : 'Dedicated Memory Pool'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                {isTr
                  ? 'Piyasaya agresif taze para girişini temsil eden RAPID_OI_UP sinyalleri, Dönüş (Reversal) ve Likidasyon formasyonlarından bağımsız ayrı bir hafıza havuzunda takip edilir ve güvenilirliği zaman içinde objektif olarak ölçülür.'
                  : 'Aggressive OI inflow alerts are tracked in an isolated memory pool, separated from Reversal and Liquidation patterns to objectively measure reliability over time.'}
              </p>
            </div>
          </div>

          {stats.rapidInflowSummary ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 shrink-0">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                  {isTr ? 'Başarı Oranı' : 'Win Rate'}
                </span>
                <span className={`text-lg font-bold font-mono ${stats.rapidInflowSummary.winRatePct >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  %{stats.rapidInflowSummary.winRatePct.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 block font-mono">
                  {stats.rapidInflowSummary.winCount}/{stats.rapidInflowSummary.evaluatedCount} {isTr ? 'doğru yön' : 'wins'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                  {isTr ? '15dk İsabeti' : '15m Win'}
                </span>
                <span className="text-lg font-bold font-mono text-white">
                  %{stats.rapidInflowSummary.fifteenMinWinRatePct.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 block font-mono">
                  {isTr ? 'İlk bar tepkisi' : 'First bar'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                  {isTr ? '1sa İsabeti' : '1h Win'}
                </span>
                <span className="text-lg font-bold font-mono text-blue-400">
                  %{stats.rapidInflowSummary.oneHourWinRatePct.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 block font-mono">
                  {isTr ? 'Devamlılık' : 'Continuation'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                  {isTr ? 'Ort. Getiri' : 'Avg Return'}
                </span>
                <span className={`text-lg font-bold font-mono ${stats.rapidInflowSummary.avgReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatPercent(stats.rapidInflowSummary.avgReturnPct)}
                </span>
                <span className="text-[10px] text-slate-500 block font-mono">
                  {stats.rapidInflowSummary.totalAlerts} {isTr ? 'toplam sinyal' : 'total'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 bg-slate-950/60 px-4 py-3 rounded-lg border border-slate-800 text-center">
              {isTr ? 'Henüz RAPID_OI_UP sinyali değerlendirilmedi veya hedef süreler bekleniyor.' : 'No RAPID_OI_UP alerts evaluated yet.'}
            </div>
          )}
        </div>
      </div>

      {/* Pattern & Family Breakdown Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              {breakdownTab === 'FAMILIES'
                ? (isTr ? 'Formasyon Aileleri Performansı (Inflow vs Reversal vs Likidasyon)' : 'Pattern Families Performance (Inflow vs Reversal vs Liquidation)')
                : t.statsTablePatternTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {breakdownTab === 'FAMILIES'
                ? (isTr
                    ? 'Agresif Giriş (RAPID_OI_UP), Dönüş ve Tasfiye formasyonlarının bağımsız başarı oranları ve karşılaştırması'
                    : 'Independent accuracy and return comparison across Inflow, Reversal, and Liquidation families')
                : (isTr
                    ? 'Her formasyonun doğrulanmış ortalama hareket büyüklüğü ve zaman dilimi isabeti'
                    : 'Verified average return and accuracy breakdown per pattern')}
            </p>
          </div>

          {/* Toggle buttons between Families and Individual Patterns */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-lg border border-slate-800 self-start sm:self-center">
            <button
              onClick={() => setBreakdownTab('FAMILIES')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                breakdownTab === 'FAMILIES'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isTr ? 'Formasyon Aileleri' : 'Pattern Families'}</span>
            </button>
            <button
              onClick={() => setBreakdownTab('PATTERNS')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                breakdownTab === 'PATTERNS'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{isTr ? 'Tüm Formasyonlar' : 'All Patterns'}</span>
            </button>
          </div>
        </div>

        {breakdownTab === 'FAMILIES' ? (
          stats.kindSummaries.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {isTr ? 'Henüz kaydedilmiş alert veya istatistik bulunmuyor.' : 'No alerts or statistics recorded yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm font-sans">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold text-xs">
                    <th className="pb-3 pr-4">{isTr ? 'Formasyon Tipi / Ailesi' : 'Pattern Family'}</th>
                    <th className="pb-3 px-3 text-center">{isTr ? 'Grup' : 'Group'}</th>
                    <th className="pb-3 px-3 text-center">{isTr ? 'Toplam' : 'Total'}</th>
                    <th className="pb-3 px-3 text-center">{isTr ? 'Değerlendirildi' : 'Evaluated'}</th>
                    <th className="pb-3 px-3 text-center">{isTr ? 'Doğru Yön Başarısı' : 'Win Rate'}</th>
                    <th className="pb-3 px-3 text-center">{isTr ? '15dk İsabeti' : '15m Win'}</th>
                    <th className="pb-3 px-3 text-center">{isTr ? '1sa İsabeti' : '1h Win'}</th>
                    <th className="pb-3 px-3 text-center">{isTr ? '4sa İsabeti' : '4h Win'}</th>
                    <th className="pb-3 pl-3 text-right">{isTr ? 'Ort. Hareket' : 'Avg Return'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {stats.kindSummaries.map((k, idx) => {
                    const isRapidInflow = k.kind === 'RAPID_OI_UP';
                    return (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          isRapidInflow
                            ? 'bg-amber-500/10 hover:bg-amber-500/15 border-l-2 border-l-amber-400'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3.5 pr-4 font-sans font-medium text-slate-200">
                          <div className="flex items-center gap-2">
                            <span>{k.displayName}</span>
                            {isRapidInflow && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">
                                FOCUS
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center font-sans">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              k.kindGroup === 'INFLOW'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : k.kindGroup === 'REVERSAL'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {k.kindGroup}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center text-slate-300">{k.totalAlerts}</td>
                        <td className="py-3.5 px-3 text-center text-slate-400">{k.evaluatedCount}</td>
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                              k.winRatePct >= 50
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            %{k.winRatePct.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center text-slate-300">
                          %{k.fifteenMinWinRatePct.toFixed(1)}
                        </td>
                        <td className="py-3.5 px-3 text-center text-slate-300">
                          %{k.oneHourWinRatePct.toFixed(1)}
                        </td>
                        <td className="py-3.5 px-3 text-center text-slate-300">
                          %{k.fourHourWinRatePct.toFixed(1)}
                        </td>
                        <td
                          className={`py-3.5 pl-3 text-right font-bold ${
                            k.avgReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {formatPercent(k.avgReturnPct)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          stats.patternSummaries.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {isTr ? 'Henüz kaydedilmiş alert veya istatistik bulunmuyor.' : 'No alerts or statistics recorded yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm font-sans">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold text-xs">
                    <th className="pb-3 pr-4">{isTr ? 'Formasyon Adı' : 'Pattern Name'}</th>
                    <th className="pb-3 px-3 text-center">{isTr ? 'Toplam' : 'Total'}</th>
                    <th className="pb-3 px-3 text-center">{isTr ? 'Değerlendirildi' : 'Evaluated'}</th>
                    <th className="pb-3 px-3 text-center">{isTr ? 'Genel Başarı' : 'Win Rate'}</th>
                    <th className="pb-3 px-3 text-center">{isTr ? '15dk İsabeti' : '15m Win'}</th>
                    <th className="pb-3 px-3 text-center">{isTr ? '1sa İsabeti' : '1h Win'}</th>
                    <th className="pb-3 px-3 text-center">{isTr ? '4sa İsabeti' : '4h Win'}</th>
                    <th className="pb-3 px-3 text-right">{isTr ? 'Ort. Hareket' : 'Avg Return'}</th>
                    <th className="pb-3 pl-3 text-right">{isTr ? 'Ort. Likidasyon' : 'Avg Liq'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {stats.patternSummaries.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 pr-4 font-sans font-medium text-slate-200">
                        {p.patternName}
                      </td>
                      <td className="py-3.5 px-3 text-center text-slate-300">
                        {p.totalAlerts}
                      </td>
                      <td className="py-3.5 px-3 text-center text-slate-400">
                        {p.evaluatedCount}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            p.winRatePct >= 50
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          %{p.winRatePct.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center text-slate-300">
                        %{p.fifteenMinWinRatePct.toFixed(1)}
                      </td>
                      <td className="py-3.5 px-3 text-center text-slate-300">
                        %{p.oneHourWinRatePct.toFixed(1)}
                      </td>
                      <td className="py-3.5 px-3 text-center text-slate-300">
                        %{p.fourHourWinRatePct.toFixed(1)}
                      </td>
                      <td
                        className={`py-3.5 px-3 text-right font-bold ${
                          p.avgReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatPercent(p.avgReturnPct)}
                      </td>
                      <td className="py-3.5 pl-3 text-right text-amber-400">
                        {formatNotional(p.avgLiquidationsNotional)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Filter and Log Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              {t.statsTableLogTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isTr
                ? 'Her alert tetiklenme fiyatı ve +15dk, +1sa, +4sa Binance kline fiyat kontrolleri'
                : 'Trigger price and +15m, +1h, +4h Binance kline price checkpoint confirmations'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter by symbol */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">{t.symbolLabel}</span>
              <select
                id="filter-symbol-select"
                value={filterSymbol}
                onChange={(e) => setFilterSymbol(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">{isTr ? `Tümü (${trackedAlerts.length})` : `All (${trackedAlerts.length})`}</option>
                {uniqueSymbols.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by pattern */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">{isTr ? 'Formasyon:' : 'Pattern:'}</span>
              <select
                id="filter-pattern-select"
                value={filterPattern}
                onChange={(e) => setFilterPattern(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">{isTr ? 'Tüm Formasyonlar' : 'All Patterns'}</option>
                {uniquePatterns.map((pat) => (
                  <option key={pat} value={pat}>
                    {pat}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear logs */}
            {trackedAlerts.length > 0 && (
              <button
                id="clear-logs-btn"
                onClick={() => {
                  if (showClearConfirm) {
                    onClearLogs();
                    setShowClearConfirm(false);
                  } else {
                    setShowClearConfirm(true);
                    setTimeout(() => setShowClearConfirm(false), 4000);
                  }
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  showClearConfirm
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{showClearConfirm ? (isTr ? 'Emin misiniz? Tıklayın' : 'Confirm? Click') : (isTr ? 'Sıfırla' : 'Clear')}</span>
              </button>
            )}
          </div>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            {isTr
              ? 'Kayıt bulunamadı. Canlı akışta yeni bir alert tespit edildiğinde otomatik olarak buraya eklenir.'
              : 'No records found. When an alert is detected in the live stream, it is automatically logged here.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm font-sans">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold text-xs">
                  <th className="pb-3 pr-3">{isTr ? 'Tarih / Saat' : 'Date / Time'}</th>
                  <th className="pb-3 px-2">{isTr ? 'Sembol' : 'Symbol'}</th>
                  <th className="pb-3 px-2">{isTr ? 'Formasyon' : 'Pattern'}</th>
                  <th className="pb-3 px-2">{isTr ? 'Yön' : 'Direction'}</th>
                  <th className="pb-3 px-2 text-right">{isTr ? 'Tetiklenme Fiyatı' : 'Trigger Price'}</th>
                  <th className="pb-3 px-3 text-center">{isTr ? '+15 Dakika' : '+15 Minutes'}</th>
                  <th className="pb-3 px-3 text-center">{isTr ? '+1 Saat' : '+1 Hour'}</th>
                  <th className="pb-3 px-3 text-center">{isTr ? '+4 Saat' : '+4 Hours'}</th>
                  <th className="pb-3 pl-3 text-right">{isTr ? 'Gerçek Likidasyon' : 'Real Liq'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {filteredAlerts.map((item) => {
                  const isBull = item.targetDirection === 'BULLISH';
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 pr-3 text-slate-300">
                        {item.timeString}
                      </td>
                      <td className="py-3 px-2 font-bold text-blue-400">
                        {item.symbol}
                      </td>
                      <td className="py-3 px-2 font-sans text-slate-200 max-w-[200px] truncate">
                        {item.patternName}
                      </td>
                      <td className="py-3 px-2 font-sans">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            isBull
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {isBull ? (
                            <TrendingUp className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-rose-400" />
                          )}
                          <span>{isBull ? (isTr ? 'YUKARI' : 'BULL') : (isTr ? 'AŞAĞI' : 'BEAR')}</span>
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-slate-100">
                        {formatPrice(item.triggerPrice)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {renderCheckpointBadge(item.checkpoints['15m'], item.targetDirection)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {renderCheckpointBadge(item.checkpoints['1h'], item.targetDirection)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {renderCheckpointBadge(item.checkpoints['4h'], item.targetDirection)}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <span className="text-amber-400 font-bold block">
                          {formatNotional(item.confirmedLiquidations.notional)}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          {item.confirmedLiquidations.events} {isTr ? 'işlem' : 'event'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

