import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertCard } from '../components/AlertCard';
import { AlertCardData } from '../types';
import '../index.css';

function CardOnlyApp() {
  const [alert, setAlert] = useState<AlertCardData | null>(() => {
    if (typeof window !== 'undefined' && (window as any).__ALERT_DATA__) {
      return (window as any).__ALERT_DATA__;
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. If already set synchronously from window.__ALERT_DATA__, do nothing
    if (alert) return;

    if ((window as any).__ALERT_DATA__) {
      setAlert((window as any).__ALERT_DATA__);
      return;
    }

    // 2. Fallback: extract alertId from pathname /internal/render-card/:alertId
    const parts = window.location.pathname.split('/').filter(Boolean);
    const alertId = parts[parts.length - 1];

    if (!alertId) {
      setError('No alertId provided in URL');
      return;
    }

    fetch(`/api/alerts/card-data/${encodeURIComponent(alertId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.alert) {
          setAlert(data.alert);
        } else {
          setError('Alert data not found');
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (alert) {
      // Mark rendered flag on window and DOM for Puppeteer
      (window as any).__CARD_RENDERED__ = true;
    }
  }, [alert]);

  if (error) {
    return (
      <div className="p-6 bg-red-950/80 border border-red-800 text-red-200 rounded-xl font-mono text-xs">
        Failed to load card: {error}
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="p-6 bg-slate-900 text-slate-400 font-mono text-xs animate-pulse">
        Rendering card...
      </div>
    );
  }

  return (
    <div
      id="render-card-wrapper"
      data-alert-card="true"
      data-rendered="true"
      className="w-[480px] max-w-[480px] bg-slate-950 p-2 rounded-2xl shadow-2xl overflow-hidden"
    >
      <AlertCard alert={alert} lang="tr" />
    </div>
  );
}

const rootEl = document.getElementById('render-root');
if (rootEl) {
  createRoot(rootEl).render(<CardOnlyApp />);
}
