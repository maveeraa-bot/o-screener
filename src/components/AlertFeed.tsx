import React, { useState } from 'react';
import { AlertCardData } from '../types';
import { AlertCard } from './AlertCard';
import { Language, translations } from '../utils/i18n';
import { Download, Trash2, ShieldAlert } from 'lucide-react';

interface AlertFeedProps {
  alerts: AlertCardData[];
  onGenerateImage?: (alert: AlertCardData) => void;
  onClearAlerts?: () => void;
  lang?: Language;
}

export const AlertFeed: React.FC<AlertFeedProps> = ({ alerts, onGenerateImage, onClearAlerts, lang = 'tr' }) => {
  const [filter, setFilter] = useState<'ALL' | 'REVERSAL' | 'S-OUT' | 'B-OUT' | 'INFLOW'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const t = translations[lang];

  const filteredAlerts = alerts.filter((item) => {
    // Category filter
    if (filter === 'REVERSAL') {
      if (item.kind !== 'BULLISH_REVERSAL' && item.kind !== 'BEARISH_REVERSAL') return false;
    } else if (filter === 'S-OUT') {
      if (item.kind !== 'MASSIVE_SHORTS_LIQ') return false;
    } else if (filter === 'B-OUT') {
      if (item.kind !== 'MASSIVE_LONGS_LIQ') return false;
    } else if (filter === 'INFLOW') {
      if (item.kind !== 'RAPID_OI_UP' && item.kind !== 'RAPID_OI_DOWN') return false;
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.symbol.toLowerCase().includes(q) ||
        item.patternName.toLowerCase().includes(q) ||
        item.signalType.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const exportAlertsAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(alerts, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `oi-alerts-${Date.now()}.json`);
    dlAnchor.click();
  };

  return (
    <div className="space-y-4">
      {/* Feed Controls Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'ALL'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {t.filterAll} ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('REVERSAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'REVERSAL'
                ? 'bg-blue-500 text-white font-bold shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {t.filterReversals} ({alerts.filter((a) => a.kind === 'BULLISH_REVERSAL' || a.kind === 'BEARISH_REVERSAL').length})
          </button>
          <button
            onClick={() => setFilter('S-OUT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'S-OUT'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {t.filterShortsLiq} ({alerts.filter((a) => a.kind === 'MASSIVE_SHORTS_LIQ').length})
          </button>
          <button
            onClick={() => setFilter('B-OUT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === 'B-OUT'
                ? 'bg-rose-600 text-white font-bold shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {t.filterLongsLiq} ({alerts.filter((a) => a.kind === 'MASSIVE_LONGS_LIQ').length})
          </button>
        </div>

        {/* Search & Export Actions */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder={t.filterPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full sm:w-40"
          />

          {alerts.length > 0 && (
            <>
              <button
                onClick={exportAlertsAsJson}
                title={t.exportJsonTooltip}
                className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>

              {onClearAlerts && (
                <button
                  onClick={onClearAlerts}
                  title={t.clearAlertsTooltip}
                  className="p-1.5 bg-slate-950 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cards List / Empty State */}
      {filteredAlerts.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-200">{t.noActiveAlertsTitle}</h4>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            {t.noActiveAlertsDesc}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onGenerateImage={onGenerateImage} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
};

