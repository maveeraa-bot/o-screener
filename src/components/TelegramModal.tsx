import React, { useState } from 'react';
import { TelegramStatus } from '../types';
import { Language, translations } from '../utils/i18n';
import { Send, CheckCircle2, AlertCircle, RefreshCw, X, ShieldAlert, KeyRound, MessageSquare, Image as ImageIcon } from 'lucide-react';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: TelegramStatus | null;
  onRefreshStatus: () => Promise<void>;
  lang?: Language;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefreshStatus,
  lang = 'tr',
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const t = translations[lang];
  const isTr = lang === 'tr';

  if (!isOpen) return null;

  const handleSendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/telegram/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || (isTr
            ? 'Test görsel kartı Telegram kanalınıza başarıyla gönderildi!'
            : 'Test card image sent successfully to your Telegram channel!'),
        });
        await onRefreshStatus();
      } else {
        setTestResult({
          success: false,
          message: data.error || (isTr ? 'Test bildirimi gönderilemedi.' : 'Failed to send test alert.'),
        });
        await onRefreshStatus();
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || (isTr ? 'Bağlantı hatası oluştu.' : 'Connection error occurred.'),
      });
    } finally {
      setTesting(false);
    }
  };

  const isConfigured = Boolean(status?.configured);
  const hasError = status?.lastStatus === 'error';

  return (
    <div
      id="telegram-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="telegram-modal"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                <span>{isTr ? 'Telegram Bot Entegrasyonu' : 'Telegram Bot Integration'}</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                    isConfigured
                      ? hasError
                        ? 'bg-rose-950/80 text-rose-400 border border-rose-800'
                        : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isConfigured
                    ? hasError
                      ? isTr ? 'HATA' : 'ERROR'
                      : isTr ? 'BAĞLI' : 'CONNECTED'
                    : isTr ? 'YAPILANDIRILMADI' : 'NOT CONFIGURED'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isTr ? 'Önem filtresinden geçen sinyalleri otomatik iletir' : 'Auto-dispatches alerts passing significance gate'}
              </p>
            </div>
          </div>
          <button
            id="close-tg-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm">
          {/* Status Overview Card */}
          <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">
                {isTr ? 'Yapılandırma Durumu' : 'Configuration Status'}
              </span>
              <button
                onClick={() => onRefreshStatus()}
                className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{isTr ? 'Yenile' : 'Refresh'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <KeyRound className={`w-4 h-4 ${status?.botTokenConfigured ? 'text-emerald-400' : 'text-slate-500'}`} />
                <div>
                  <div className="text-slate-400 font-sans text-[11px]">TELEGRAM_BOT_TOKEN</div>
                  <div className="font-semibold text-slate-200">
                    {status?.botTokenConfigured ? (isTr ? '✓ Tanımlı' : '✓ Set') : (isTr ? '✗ Eksik' : '✗ Missing')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MessageSquare className={`w-4 h-4 ${status?.chatIdConfigured ? 'text-emerald-400' : 'text-slate-500'}`} />
                <div>
                  <div className="text-slate-400 font-sans text-[11px]">TELEGRAM_CHAT_ID</div>
                  <div className="font-semibold text-slate-200">
                    {status?.chatIdConfigured ? (isTr ? '✓ Tanımlı' : '✓ Set') : (isTr ? '✗ Eksik' : '✗ Missing')}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-sans text-[11px] block">{isTr ? 'İletilen Sinyal Sayısı:' : 'Sent Alerts Count:'}</span>
                <span className="font-bold text-sky-400 text-sm">{status?.sentCount || 0}</span>
              </div>

              <div>
                <span className="text-slate-400 font-sans text-[11px] block">{isTr ? 'Son Başarılı İletim:' : 'Last Success:'}</span>
                <span className="text-slate-300 text-xs">
                  {status?.lastSuccessAt
                    ? new Date(status.lastSuccessAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : (isTr ? 'Henüz yok' : 'None yet')}
                </span>
              </div>
            </div>

            {status?.lastError && (
              <div className="mt-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">{isTr ? 'Son Gönderim Hatası:' : 'Last Send Error:'}</span>
                  <span className="font-mono text-[11px] break-all">{status.lastError}</span>
                </div>
              </div>
            )}
          </div>

          {/* Test Action */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">
                {isTr ? 'Entegrasyon Testi' : 'Integration Test'}
              </span>
              <button
                id="tg-test-send-btn"
                onClick={handleSendTest}
                disabled={testing || !isConfigured}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isConfigured && !testing
                    ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{isTr ? 'Gönderiliyor...' : 'Sending...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{isTr ? 'Test Bildirimi Gönder' : 'Send Test Alert'}</span>
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/50 border border-rose-800 text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Visual Card Preview Section */}
          <div className="bg-slate-950/50 rounded-xl p-3.5 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <ImageIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    {isTr ? 'Görsel Kart İletimi (Satori HD PNG)' : 'Visual Card Dispatch (Satori HD PNG)'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isTr ? 'Telegram\'a sendPhoto ile yüksek çözünürlüklü PNG kart gönderilir' : 'High-definition PNG card sent to Telegram via sendPhoto'}
                  </span>
                </div>
              </div>
              <button
                id="toggle-card-preview-btn"
                onClick={() => {
                  setShowPreview(!showPreview);
                  if (!showPreview) setPreviewKey(Date.now());
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg transition-colors flex items-center gap-1"
              >
                <ImageIcon className="w-3 h-3" />
                <span>{showPreview ? (isTr ? 'Gizle' : 'Hide') : (isTr ? 'Önizle' : 'Preview')}</span>
              </button>
            </div>

            {showPreview && (
              <div className="pt-2 border-t border-slate-800/60 space-y-2 animate-in fade-in duration-200">
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex justify-center p-1">
                  <img
                    src={`/api/telegram/preview-card?t=${previewKey}`}
                    alt="Telegram Card Preview"
                    className="w-full h-auto max-h-72 object-contain rounded-lg shadow-lg"
                    loading="lazy"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{isTr ? '✓ Puppeteer 2x Retina Card Render ile piksel netliğinde görsel' : '✓ Pixel-perfect 2x Retina Card visual rendered with Puppeteer'}</span>
                  <button
                    onClick={() => setPreviewKey(Date.now())}
                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{isTr ? 'Yenile' : 'Refresh'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Configuration Instructions */}
          {!isConfigured && (
            <div className="bg-amber-950/30 rounded-xl p-3.5 border border-amber-800/60 text-xs text-amber-200/90 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <ShieldAlert className="w-4 h-4" />
                <span>{isTr ? 'Nasıl Yapılandırılır?' : 'How to Configure?'}</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-amber-200/80 text-[11px] leading-relaxed">
                <li>
                  {isTr
                    ? 'Telegram\'da @BotFather ile bir bot oluşturup token alın.'
                    : 'Create a bot with @BotFather on Telegram and get your token.'}
                </li>
                <li>
                  {isTr
                    ? 'Hedef kanal veya grubunuza botu yönetici olarak ekleyin.'
                    : 'Add the bot as an administrator to your target channel or group.'}
                </li>
                <li>
                  {isTr
                    ? 'AI Studio sol menüsünden Settings > Secrets bölümünü açın.'
                    : 'Open Settings > Secrets from the AI Studio left menu.'}
                </li>
                <li>
                  <span className="font-mono text-amber-100 font-bold">TELEGRAM_BOT_TOKEN</span>{' '}
                  {isTr ? 've' : 'and'}{' '}
                  <span className="font-mono text-amber-100 font-bold">TELEGRAM_CHAT_ID</span>{' '}
                  {isTr ? 'değişkenlerini kaydedin.' : 'secrets.'}
                </li>
              </ol>
            </div>
          )}

          {/* Filter Notice */}
          <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
            <span className="font-semibold text-slate-300">
              {isTr ? '⚡ Sinyal Önem Filtresi Devrede:' : '⚡ Significance Gate Active:'}
            </span>{' '}
            {isTr
              ? 'Sadece piyasa etkisi yüksek (önceki sinyalden %25 daha güçlü veya yön değişiminde Impact >= 1.8) sinyaller Telegram kanalına iletilir. Düşük öneme sahip tekrarlar filtrelenir.'
              : 'Only high-impact market signals (25% stronger than previous in same direction, or Impact >= 1.8 on reversals) are sent to Telegram.'}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end">
          <button
            id="close-tg-modal-footer-btn"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            {isTr ? 'Kapat' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
