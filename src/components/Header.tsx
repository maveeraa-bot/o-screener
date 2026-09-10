import React, { useState } from 'react';
import { Timeframe, TelegramStatus } from '../types';
import { Language, translations } from '../utils/i18n';
import { RefreshCw, Bell, BellOff, Sparkles, Activity, Search, ChevronDown, Globe, Send } from 'lucide-react';

interface HeaderProps {
  symbol: string;
  onSymbolChange: (newSymbol: string) => void;
  timeframe: Timeframe;
  onTimeframeChange: (newTf: Timeframe) => void;
  isPolling: boolean;
  secondsUntilNextPoll: number;
  onManualRefresh: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenImageGen: () => void;
  availableSymbols: Array<{ symbol: string; name: string; base: string }>;
  activeTab?: 'TERMINAL' | 'STATS';
  onTabChange?: (tab: 'TERMINAL' | 'STATS') => void;
  trackedAlertsCount?: number;
  wsConnected?: boolean;
  telegramStatus?: TelegramStatus | null;
  onOpenTelegramModal?: () => void;
  lang?: Language;
  onToggleLanguage?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  symbol,
  onSymbolChange,
  timeframe,
  onTimeframeChange,
  isPolling,
  secondsUntilNextPoll,
  onManualRefresh,
  audioEnabled,
  onToggleAudio,
  onOpenImageGen,
  availableSymbols,
  activeTab = 'TERMINAL',
  onTabChange,
  trackedAlertsCount = 0,
  wsConnected = true,
  telegramStatus,
  onOpenTelegramModal,
  lang = 'tr',
  onToggleLanguage,
}) => {
  const [customInput, setCustomInput] = useState('');
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const t = translations[lang];

  const timeframes: Timeframe[] = ['5m', '15m', '30m', '1h', '2h', '4h'];

  const handleCustomSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      let cleaned = customInput.trim().toUpperCase();
      if (!cleaned.endsWith('USDT')) {
        cleaned += 'USDT';
      }
      onSymbolChange(cleaned);
      setCustomInput('');
      setShowSymbolDropdown(false);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Logo and Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                    {t.appName}
                  </h1>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {t.realDataBadge}
                  </span>
                  {/* WebSocket Status Indicator */}
                  <span
                    title={wsConnected ? t.wsTitleConnected : t.wsTitleReconnecting}
                    className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-300 border border-slate-800"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
                    <span>{wsConnected ? t.wsLive : t.wsReconnecting}</span>
                  </span>

                  {/* Telegram Status Indicator */}
                  <button
                    id="tg-header-indicator"
                    onClick={onOpenTelegramModal}
                    type="button"
                    title={
                      telegramStatus?.configured
                        ? telegramStatus.lastStatus === 'error'
                          ? (lang === 'tr' ? `TG: Hata (${telegramStatus.lastError || ''}) - Detaylar için tıklayın` : `TG: Error (${telegramStatus.lastError || ''}) - Click for details`)
                          : (lang === 'tr' ? `TG: Bağlı (${telegramStatus.sentCount} sinyal iletildi) - Test ve detaylar için tıklayın` : `TG: Connected (${telegramStatus.sentCount} sent) - Click to test`)
                        : (lang === 'tr' ? 'TG: Bağlı Değil (Settings > Secrets üzerinden ekleyin) - Yapılandırmak için tıklayın' : 'TG: Disconnected (Add in Settings > Secrets) - Click to configure')
                    }
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                      telegramStatus?.configured
                        ? telegramStatus.lastStatus === 'error'
                          ? 'bg-rose-950/80 text-rose-300 border-rose-800 hover:bg-rose-900/80'
                          : 'bg-slate-950 text-sky-300 border-sky-900/60 hover:border-sky-700'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Send className="w-2.5 h-2.5 text-sky-400" />
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        telegramStatus?.configured
                          ? telegramStatus.lastStatus === 'error'
                            ? 'bg-rose-500 animate-pulse'
                            : 'bg-emerald-400'
                          : 'bg-slate-600'
                      }`}
                    ></span>
                    <span className="font-semibold">
                      {telegramStatus?.configured
                        ? telegramStatus.lastStatus === 'error'
                          ? 'TG: Error'
                          : 'TG: Connected'
                        : 'TG: Disconnected'}
                    </span>
                  </button>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  {t.subtitle}
                </p>
              </div>
            </div>

            {/* Tab Navigation for Desktop */}
            {onTabChange && (
              <div className="hidden md:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 ml-4">
                <button
                  id="tab-terminal-btn"
                  onClick={() => onTabChange('TERMINAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'TERMINAL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{t.tabTerminal}</span>
                </button>
                <button
                  id="tab-stats-btn"
                  onClick={() => onTabChange('STATS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'STATS'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{t.tabStats}</span>
                  {trackedAlertsCount > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        activeTab === 'STATS' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {trackedAlertsCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Mobile Controls shortcut */}
            <div className="flex items-center space-x-2 lg:hidden">
              {onToggleLanguage && (
                <button
                  onClick={onToggleLanguage}
                  className="px-2 py-1 rounded-lg border border-slate-800 bg-slate-950 text-xs font-bold text-emerald-400 flex items-center gap-1"
                >
                  <Globe className="w-3 h-3" />
                  <span>{lang.toUpperCase()}</span>
                </button>
              )}
              <button
                onClick={onToggleAudio}
                className={`p-2 rounded-lg border ${
                  audioEnabled
                    ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-400'
                    : 'border-slate-800 bg-slate-800/40 text-slate-500'
                }`}
              >
                {audioEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
              <button
                onClick={onOpenImageGen}
                className="p-2 rounded-lg bg-purple-900/60 text-purple-300 border border-purple-700/50"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Symbol and Timeframe Selector */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Symbol Picker */}
            <div className="relative">
              <button
                id="symbol-picker-btn"
                type="button"
                onClick={() => setShowSymbolDropdown(!showSymbolDropdown)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 hover:border-slate-600 text-slate-100 font-mono text-xs sm:text-sm font-bold shadow-inner"
              >
                <span className="text-emerald-400">#</span>
                <span>{symbol}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showSymbolDropdown && (
                <div
                  id="symbol-dropdown-menu"
                  className="absolute left-0 mt-2 w-64 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 text-slate-100 space-y-2"
                >
                  <form onSubmit={handleCustomSymbolSubmit} className="relative">
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder={t.symbolSearchPlaceholder}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 top-1.5 p-1 text-slate-400 hover:text-white"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block px-1">
                      {t.popularPairs}
                    </span>
                    {availableSymbols.map((item) => (
                      <button
                        key={item.symbol}
                        onClick={() => {
                          onSymbolChange(item.symbol);
                          setShowSymbolDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition-colors ${
                          symbol === item.symbol
                            ? 'bg-emerald-950/60 text-emerald-400 font-bold border border-emerald-800/40'
                            : 'hover:bg-slate-900 text-slate-300'
                        }`}
                      >
                        <span>{item.symbol}</span>
                        <span className="text-[10px] text-slate-500 font-sans">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  id={`tf-btn-${tf}`}
                  onClick={() => onTimeframeChange(tf)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all ${
                    timeframe === tf
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Polling Countdown Indicator */}
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400 hidden sm:inline">{t.refresh}</span>
              <span className="font-bold text-emerald-400">{secondsUntilNextPoll}s</span>
              <button
                onClick={onManualRefresh}
                title={t.refreshNow}
                disabled={isPolling}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>

            {/* Language Switcher (TR / EN) */}
            {onToggleLanguage && (
              <button
                id="language-toggle-btn"
                onClick={onToggleLanguage}
                title={lang === 'tr' ? 'Switch to English' : "Türkçe'ye Geç"}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 text-xs font-bold text-emerald-400 transition-colors shadow-inner"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? 'TR 🇹🇷' : 'EN 🇬🇧'}</span>
              </button>
            )}

            {/* Sound alert chime toggle */}
            <button
              onClick={onToggleAudio}
              title={audioEnabled ? t.alertSoundOn : t.alertSoundMuted}
              className={`hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                audioEnabled
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                  : 'border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300'
              }`}
            >
              {audioEnabled ? <Bell className="w-3.5 h-3.5 text-emerald-400" /> : <BellOff className="w-3.5 h-3.5" />}
              <span>{audioEnabled ? t.alertSoundOn : t.alertSoundMuted}</span>
            </button>

            {/* AI Visual button */}
            <button
              id="header-ai-visual-btn"
              onClick={onOpenImageGen}
              className="hidden lg:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.aiVisualBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

