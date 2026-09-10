import { AlertCardData, BarAnalysis, BinanceOiHistItem, Timeframe, LiquidationStreamData } from '../types';
import { Language } from './i18n';
import {
  calculateImpactScore,
  evaluateSignificanceGate,
  isSignificant,
  MIN_THRESHOLD,
  MIN_MARGIN,
  MEMORY_RESET_BARS,
} from './significanceGate';

export {
  isSignificant,
  calculateImpactScore,
  evaluateSignificanceGate,
  MIN_THRESHOLD,
  MIN_MARGIN,
  MEMORY_RESET_BARS,
};

export function formatOiK(oi: number, assetSymbol?: string): string {
  let numStr = '';
  if (oi >= 1_000_000_000) {
    numStr = (oi / 1_000_000_000).toFixed(2) + 'B';
  } else if (oi >= 1_000_000) {
    numStr = (oi / 1_000_000).toFixed(2) + 'M';
  } else if (oi >= 1_000) {
    numStr = (oi / 1_000).toFixed(2) + 'K';
  } else {
    numStr = oi.toFixed(2);
  }
  return assetSymbol ? `${numStr} ${assetSymbol}` : numStr;
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) {
    return '$' + price.toFixed(4);
  }
  return '$' + price.toFixed(6);
}

export function formatPercent(pct: number, includePlus: boolean = true): string {
  const prefix = includePlus && pct > 0 ? '+' : '';
  return `${prefix}${pct.toFixed(2)}%`;
}

export function formatZScore(val: number): string {
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(2)}`;
}

export function formatNotional(val: number): string {
  if (!val || val <= 0) return '$0.00';
  if (val >= 1_000_000_000) {
    return `$${(val / 1_000_000_000).toFixed(2)}B`;
  }
  if (val >= 1_000_000) {
    return `$${(val / 1_000_000).toFixed(2)}M`;
  }
  if (val >= 1_000) {
    return `$${(val / 1_000).toFixed(1)}K`;
  }
  return `$${val.toFixed(2)}`;
}

/**
 * Calculates rolling z-score: (value - mean) / stdDev
 */
function calculateZScore(value: number, history: number[]): number {
  if (!history || history.length < 3) return 0;
  const n = history.length;
  const mean = history.reduce((acc, curr) => acc + curr, 0) / n;
  const variance = history.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) / (n - 1);
  const std = Math.sqrt(variance);
  if (std === 0 || isNaN(std)) return 0;
  return (value - mean) / std;
}

/**
 * Merges Kline price data and Open Interest History into structured BarAnalysis array
 */
export function processMarketBars(
  klines: Array<[number, string, string, string, string, string, number, string, number, string, string, string]>,
  oiHistory: BinanceOiHistItem[]
): BarAnalysis[] {
  if (!klines.length || !oiHistory.length) return [];

  // Sort both by timestamp ascending
  const sortedKlines = [...klines].sort((a, b) => a[0] - b[0]);
  const sortedOi = [...oiHistory].sort((a, b) => a.timestamp - b.timestamp);

  // Map OI by closest timestamp (within reasonable bar window)
  const results: BarAnalysis[] = [];
  const oiChangesPct: number[] = [];
  const priceChangesPct: number[] = [];

  for (let i = 0; i < sortedOi.length; i++) {
    const currOiItem = sortedOi[i];
    const prevOiItem = i > 0 ? sortedOi[i - 1] : sortedOi[0];

    const currentOi = parseFloat(currOiItem.sumOpenInterest);
    const prevOi = parseFloat(prevOiItem.sumOpenInterest);
    const oiValue = parseFloat(currOiItem.sumOpenInterestValue || '0');

    const oiChangePct = prevOi > 0 ? ((currentOi - prevOi) / prevOi) * 100 : 0;
    oiChangesPct.push(oiChangePct);

    // Find matching kline closest to currOiItem.timestamp
    const matchedKline = sortedKlines.reduce((prev, curr) => {
      return Math.abs(curr[0] - currOiItem.timestamp) < Math.abs(prev[0] - currOiItem.timestamp) ? curr : prev;
    }, sortedKlines[0]);

    const openPrice = parseFloat(matchedKline[1]);
    const highPrice = parseFloat(matchedKline[2]);
    const lowPrice = parseFloat(matchedKline[3]);
    const closePrice = parseFloat(matchedKline[4]);

    const priceChangePct = openPrice > 0 ? ((closePrice - openPrice) / openPrice) * 100 : 0;
    priceChangesPct.push(priceChangePct);

    // Rolling window for z-scores (last 24-48 bars)
    const windowStart = Math.max(0, i - 36);
    const oiWindow = oiChangesPct.slice(windowStart, i + 1);
    const priceWindow = priceChangesPct.slice(windowStart, i + 1);

    const relativeOiZScore = calculateZScore(oiChangePct, oiWindow);
    const relativePriceZScore = calculateZScore(priceChangePct, priceWindow);

    // Burst Type
    let burstType: BarAnalysis['burstType'] = 'Normal OI Flow';
    if (oiChangePct < -0.45) {
      burstType = 'Down Burst (Rapid OI Decrease)';
    } else if (oiChangePct > 0.45) {
      burstType = 'Up Burst (Rapid OI Increase)';
    }

    // Bar Classification
    // Sell Burst Up: OI rising + price falling or flat (aggressive short openings)
    // Sell Outflow: OI falling + price rising (short closing/liquidation)
    // Buy Burst Up: OI rising + price rising (aggressive long openings)
    // Buy Outflow: OI falling + price falling (long closing/liquidation)
    let barClassification: BarAnalysis['barClassification'] = 'Neutral';

    if (oiChangePct > 0.25 && priceChangePct <= 0.05) {
      barClassification = 'Sell Burst Up';
    } else if (oiChangePct < -0.25 && priceChangePct >= 0.05) {
      barClassification = 'Sell Outflow';
    } else if (oiChangePct > 0.25 && priceChangePct >= 0.05) {
      barClassification = 'Buy Burst Up';
    } else if (oiChangePct < -0.25 && priceChangePct <= -0.05) {
      barClassification = 'Buy Outflow';
    }

    const date = new Date(currOiItem.timestamp);
    const timeFormatted = date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Istanbul',
    });

    results.push({
      timestamp: currOiItem.timestamp,
      timeFormatted,
      openPrice,
      closePrice,
      highPrice,
      lowPrice,
      priceChangePct,
      openInterest: currentOi,
      openInterestValue: oiValue,
      oiChangePct,
      relativeOiZScore,
      relativePriceZScore,
      burstType,
      barClassification,
    });
  }

  return results;
}

/**
 * Evaluates bars and scans for Alert patterns matching the exact specs
 */
export function detectAlerts(
  bars: BarAnalysis[],
  rawSymbol: string,
  timeframe: Timeframe,
  liveLiquidationData?: LiquidationStreamData,
  lang: Language = 'tr'
): AlertCardData[] {
  if (bars.length < 3) return [];

  const alerts: AlertCardData[] = [];
  const symbolTag = `#${rawSymbol}.P`;
  const baseAsset = rawSymbol.replace(/USDT$|BUSD$|USDC$/, '');
  const isTr = lang === 'tr';
  const tfString = isTr
    ? `${timeframe.replace('m', '')} dakika`
    : timeframe.replace('m', ' minutes');

  const defaultLiq = liveLiquidationData
    ? {
        events: liveLiquidationData.count,
        notional: liveLiquidationData.totalNotional,
        longEvents: liveLiquidationData.longCount,
        shortEvents: liveLiquidationData.shortCount,
      }
    : undefined;

  // Look across recent bars (last 12 bars) to generate alerts
  const checkStartIndex = Math.max(1, bars.length - 12);

  for (let idx = bars.length - 1; idx >= checkStartIndex; idx--) {
    const bar = bars[idx];
    const prevBar = bars[idx - 1];
    const prev2Bar = idx >= 2 ? bars[idx - 2] : null;
    const prev3Bar = idx >= 3 ? bars[idx - 3] : null;

    const barTime = new Date(bar.timestamp).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Istanbul',
    });

    // 1. Bullish Reversal Pattern: Sell Burst Up followed by Sell Outflow
    let burstBarIndex = -1;
    if (prevBar && prevBar.barClassification === 'Sell Burst Up') burstBarIndex = idx - 1;
    else if (prev2Bar && prev2Bar.barClassification === 'Sell Burst Up') burstBarIndex = idx - 2;
    else if (prev3Bar && prev3Bar.barClassification === 'Sell Burst Up') burstBarIndex = idx - 3;

    const hasSellBurstUpRecent = burstBarIndex !== -1;

    if (bar.barClassification === 'Sell Outflow' && hasSellBurstUpRecent) {
      const preBurstBar = burstBarIndex > 0 ? bars[burstBarIndex - 1] : null;
      const startingOi = preBurstBar ? preBurstBar.openInterest : (prevBar ? prevBar.openInterest : bar.openInterest);
      const startingOiValue = preBurstBar ? preBurstBar.openInterestValue : (prevBar ? prevBar.openInterestValue : bar.openInterestValue);
      const netOiChangePct = startingOi > 0 ? ((bar.openInterest - startingOi) / startingOi) * 100 : bar.oiChangePct;
      const impactScore = calculateImpactScore(bar.relativeOiZScore, bar.relativePriceZScore, netOiChangePct, defaultLiq?.notional || 0);

      alerts.push({
        id: `rev-bull-${bar.timestamp}`,
        timestamp: bar.timestamp,
        timeString: barTime,
        kind: 'BULLISH_REVERSAL',
        headerTag: isTr ? 'Açık Pozisyon Değişimi – Sinyaller' : 'Open Interest Variation – Alerts',
        title: isTr ? '🔄 YÜKSELİŞ (BULLISH) DÖNÜŞ FORMASYONU' : '🔄 BULLISH REVERSAL PATTERN DETECTED',
        patternName: isTr ? 'Satış Doyumu → Short Kapatma (Dip Dönüşü)' : 'Sell Burst Up → Sell Outflow',
        symbol: symbolTag,
        rawSymbol,
        baseAsset,
        timeframe: timeframe.replace('m', ''),
        entryPrice: prevBar ? prevBar.closePrice : bar.openPrice,
        currentPrice: bar.closePrice,
        priceChangePct: bar.priceChangePct,
        startingOi,
        currentOi: bar.openInterest,
        startingOiValue,
        currentOiValue: bar.openInterestValue,
        oiChangePct: netOiChangePct,
        relativeOi: bar.relativeOiZScore,
        relativePrice: bar.relativePriceZScore,
        impactScore,
        burstType: isTr ? 'Sert OI Düşüşü (Short Kapatma / Çıkış)' : bar.burstType,
        signalType: isTr ? 'Yükseliş Yönlü Dönüş (Long İhtimali)' : 'Bullish Reversal',
        isBullish: true,
        confirmedLiquidations: defaultLiq,
        patternInterpretation: isTr
          ? [
              'İlk aşamadaki sert satış baskısı short pozisyonların yoğunlaştığını gösterdi',
              'Ardından gelen OI düşüşü short pozisyonların kapatıldığını ve kâr alındığını doğruluyor',
              'Aşağı yönlü trendin zayıflayıp yukarı yönlü dönüş ihtimalinin arttığına işaret eder',
            ]
          : [
              'Initial Sell Burst Up indicates strong selling pressure',
              'Followed by Sell Outflow showing position unwinding',
              'Potential reversal signal from Bearish to Bullish',
            ],
        riskManagement: isTr
          ? [
              'İşleme girmeden önce hacim ve ek teknik göstergelerle teyit edin',
              'Fiyat hareketini ve emir defteri derinliğini yakından izleyin',
              'Kaldıraç ve pozisyon büyüklüğünü risk limitlerinize göre ayarlayın',
            ]
          : [
              'Confirm with additional other indicators',
              'Monitor volume and price action',
              'Use appropriate position sizing',
            ],
      });
    }

    // 2. Bearish Reversal Pattern: Buy Burst Up followed by Buy Outflow
    let buyBurstBarIndex = -1;
    if (prevBar && prevBar.barClassification === 'Buy Burst Up') buyBurstBarIndex = idx - 1;
    else if (prev2Bar && prev2Bar.barClassification === 'Buy Burst Up') buyBurstBarIndex = idx - 2;
    else if (prev3Bar && prev3Bar.barClassification === 'Buy Burst Up') buyBurstBarIndex = idx - 3;

    const hasBuyBurstUpRecent = buyBurstBarIndex !== -1;

    if (bar.barClassification === 'Buy Outflow' && hasBuyBurstUpRecent) {
      const preBurstBar = buyBurstBarIndex > 0 ? bars[buyBurstBarIndex - 1] : null;
      const startingOi = preBurstBar ? preBurstBar.openInterest : (prevBar ? prevBar.openInterest : bar.openInterest);
      const startingOiValue = preBurstBar ? preBurstBar.openInterestValue : (prevBar ? prevBar.openInterestValue : bar.openInterestValue);
      const netOiChangePct = startingOi > 0 ? ((bar.openInterest - startingOi) / startingOi) * 100 : bar.oiChangePct;
      const impactScore = calculateImpactScore(bar.relativeOiZScore, bar.relativePriceZScore, netOiChangePct, defaultLiq?.notional || 0);

      alerts.push({
        id: `rev-bear-${bar.timestamp}`,
        timestamp: bar.timestamp,
        timeString: barTime,
        kind: 'BEARISH_REVERSAL',
        headerTag: isTr ? 'Açık Pozisyon Değişimi – Sinyaller' : 'Open Interest Variation – Alerts',
        title: isTr ? '🔄 DÜŞÜŞ (BEARISH) DÖNÜŞ FORMASYONU' : '🔄 BEARISH REVERSAL PATTERN DETECTED',
        patternName: isTr ? 'Alış Doyumu → Long Kapatma (Tepe Dönüşü)' : 'Buy Burst Up → Buy Outflow',
        symbol: symbolTag,
        rawSymbol,
        baseAsset,
        timeframe: timeframe.replace('m', ''),
        entryPrice: prevBar ? prevBar.closePrice : bar.openPrice,
        currentPrice: bar.closePrice,
        priceChangePct: bar.priceChangePct,
        startingOi,
        currentOi: bar.openInterest,
        startingOiValue,
        currentOiValue: bar.openInterestValue,
        oiChangePct: netOiChangePct,
        relativeOi: bar.relativeOiZScore,
        relativePrice: bar.relativePriceZScore,
        impactScore,
        burstType: isTr ? 'Sert OI Düşüşü (Long Kapatma / Çıkış)' : bar.burstType,
        signalType: isTr ? 'Düşüş Yönlü Dönüş (Short İhtimali)' : 'Bearish Reversal',
        isBullish: false,
        confirmedLiquidations: defaultLiq,
        patternInterpretation: isTr
          ? [
              'İlk aşamadaki sert alış akışı agresif long pozisyonların yığıldığını gösterdi',
              'Ardından gelen OI düşüşü boğaların tükendiğini ve longların kapatıldığını gösteriyor',
              'Yukarı yönlü ivmenin zayıflayıp düzeltme veya düşüş dönüşü ihtimaline işaret eder',
            ]
          : [
              'Initial Buy Burst Up indicates aggressive long positions',
              'Followed by Buy Outflow showing exhaustion & position unwinding',
              'Potential reversal signal from Bullish to Bearish',
            ],
        riskManagement: isTr
          ? [
              'İşleme girmeden önce hacim ve ek teknik göstergelerle teyit edin',
              'Kârı korumak için takip eden zarar durdur (trailing stop) kullanın',
              'Kaldıraç ve pozisyon büyüklüğünü risk limitlerinize göre ayarlayın',
            ]
          : [
              'Confirm with additional other indicators',
              'Protect gains with trailing stop losses',
              'Use appropriate position sizing',
            ],
      });
    }

    // 3. Massive Shorts Liquidation (S-OUT)
    // Price rising (> 0) AND OI rapid drop (< -0.3% or z-score < -1.0)
    if (bar.priceChangePct > 0.08 && (bar.oiChangePct < -0.3 || bar.relativeOiZScore < -1.1)) {
      const impactScore = calculateImpactScore(bar.relativeOiZScore, bar.relativePriceZScore, bar.oiChangePct, defaultLiq?.notional || 0);

      alerts.push({
        id: `s-out-${bar.timestamp}`,
        timestamp: bar.timestamp,
        timeString: barTime,
        kind: 'MASSIVE_SHORTS_LIQ',
        headerTag: isTr ? 'Açık Pozisyon Değişimi – Sinyaller' : 'Open Interest Variation – Alerts',
        title: isTr ? '⚠️ BÜYÜK SHORT LİKİDASYONU (S-OUT)' : '⚠️ MASSIVE SHORTS LIQUIDATION (S-OUT)',
        patternName: isTr ? 'Short Sıkışması & Pozisyon Kapatma (S-OUT)' : 'Sell Outflow Pattern',
        symbol: symbolTag,
        rawSymbol,
        baseAsset,
        timeframe: tfString,
        entryPrice: bar.openPrice,
        currentPrice: bar.closePrice,
        priceChangePct: bar.priceChangePct,
        startingOi: prevBar ? prevBar.openInterest : bar.openInterest,
        currentOi: bar.openInterest,
        startingOiValue: prevBar ? prevBar.openInterestValue : bar.openInterestValue,
        currentOiValue: bar.openInterestValue,
        oiChangePct: bar.oiChangePct,
        relativeOi: bar.relativeOiZScore,
        relativePrice: bar.relativePriceZScore,
        impactScore,
        burstType: isTr ? 'Sert OI Düşüşü (Short Tasfiyesi)' : (bar.burstType || 'Down Burst (Rapid OI Decrease)'),
        subHeaderTitle: isTr ? '♨️ SHORT POZİSYONLAR KAPANIYOR' : '♨️ SHORTS CLOSING',
        subHeaderDesc: isTr ? 'Ayılar pozisyonlarını hızla tasfiye ediyor veya zararla kapatıyor' : 'Bears are exiting their positions rapidly',
        signalType: isTr ? 'Yükseliş Lehine (Long Potansiyeli)' : 'Potentially Bullish',
        isBullish: true,
        confirmedLiquidations: defaultLiq,
      });
    }

    // 4. Massive Longs Liquidation (B-OUT)
    // Price falling (< 0) AND OI rapid drop (< -0.3% or z-score < -1.0)
    if (bar.priceChangePct < -0.08 && (bar.oiChangePct < -0.3 || bar.relativeOiZScore < -1.1)) {
      const impactScore = calculateImpactScore(bar.relativeOiZScore, bar.relativePriceZScore, bar.oiChangePct, defaultLiq?.notional || 0);

      alerts.push({
        id: `b-out-${bar.timestamp}`,
        timestamp: bar.timestamp,
        timeString: barTime,
        kind: 'MASSIVE_LONGS_LIQ',
        headerTag: isTr ? 'Açık Pozisyon Değişimi – Sinyaller' : 'Open Interest Variation – Alerts',
        title: isTr ? '⚠️ BÜYÜK LONG LİKİDASYONU (B-OUT)' : '⚠️ MASSIVE LONGS LIQUIDATION (B-OUT)',
        patternName: isTr ? 'Long Tasfiyesi & Pozisyon Kapatma (B-OUT)' : 'Buy Outflow Pattern',
        symbol: symbolTag,
        rawSymbol,
        baseAsset,
        timeframe: tfString,
        entryPrice: bar.openPrice,
        currentPrice: bar.closePrice,
        priceChangePct: bar.priceChangePct,
        startingOi: prevBar ? prevBar.openInterest : bar.openInterest,
        currentOi: bar.openInterest,
        startingOiValue: prevBar ? prevBar.openInterestValue : bar.openInterestValue,
        currentOiValue: bar.openInterestValue,
        oiChangePct: bar.oiChangePct,
        relativeOi: bar.relativeOiZScore,
        relativePrice: bar.relativePriceZScore,
        impactScore,
        burstType: isTr ? 'Sert OI Düşüşü (Long Likidasyonu)' : (bar.burstType || 'Down Burst (Rapid OI Decrease)'),
        subHeaderTitle: isTr ? '♻️ LONG POZİSYONLAR KAPANIYOR' : '♻️ LONGS CLOSING',
        subHeaderDesc: isTr ? 'Boğalar pozisyonlarını hızla kapatıyor veya likide ediliyor' : 'Bulls are exiting their positions rapidly',
        signalType: isTr ? 'Düşüş Lehine (Short Potansiyeli)' : 'Potentially Bearish',
        isBullish: false,
        confirmedLiquidations: defaultLiq,
      });
    }

    // 5. Extreme OI Rapid Increase (Breakout Setup / Heavy Accumulation)
    if (bar.oiChangePct > 0.8 && Math.abs(bar.relativeOiZScore) > 1.3) {
      const isUp = bar.priceChangePct >= 0;
      const impactScore = calculateImpactScore(bar.relativeOiZScore, bar.relativePriceZScore, bar.oiChangePct, defaultLiq?.notional || 0);

      alerts.push({
        id: `burst-up-${bar.timestamp}`,
        timestamp: bar.timestamp,
        timeString: barTime,
        kind: 'RAPID_OI_UP',
        headerTag: isTr ? 'Açık Pozisyon Değişimi – Sinyaller' : 'Open Interest Variation – Alerts',
        title: isTr
          ? (isUp ? '🔥⚡ PİYASAYA GÜÇLÜ LONG GİRİŞİ TESPİT EDİLDİ' : '🔥⚡ PİYASAYA GÜÇLÜ SHORT GİRİŞİ TESPİT EDİLDİ')
          : (isUp ? '🔥⚡ AGGRESSIVE LONGS INFLOW DETECTED' : '🔥⚡ AGGRESSIVE SHORTS INFLOW DETECTED'),
        patternName: isTr
          ? (isUp ? 'Agresif Long Girişi (OI & Fiyat Artışı)' : 'Agresif Short Girişi (OI Artışı & Fiyat Düşüşü)')
          : (isUp ? 'Buy Burst Up Pattern' : 'Sell Burst Up Pattern'),
        symbol: symbolTag,
        rawSymbol,
        baseAsset,
        timeframe: tfString,
        entryPrice: bar.openPrice,
        currentPrice: bar.closePrice,
        priceChangePct: bar.priceChangePct,
        startingOi: prevBar ? prevBar.openInterest : bar.openInterest,
        currentOi: bar.openInterest,
        startingOiValue: prevBar ? prevBar.openInterestValue : bar.openInterestValue,
        currentOiValue: bar.openInterestValue,
        oiChangePct: bar.oiChangePct,
        relativeOi: bar.relativeOiZScore,
        relativePrice: bar.relativePriceZScore,
        impactScore,
        burstType: isTr ? 'Sert OI Artışı (Yeni Pozisyon Açılışı)' : 'Up Burst (Rapid OI Increase)',
        subHeaderTitle: isTr
          ? (isUp ? '🚀 BOĞALAR AGRESİF POZİSYON TOPLUYOR' : '🛡️ AYILAR BASKIYI ARTIRIYOR')
          : (isUp ? '🚀 BULLS ACCUMULATING' : '🛡️ BEARS POSITIONING'),
        subHeaderDesc: isTr
          ? (isUp ? 'Yüksek hacimli yeni long kontrat girişleri tespit edildi' : 'Düşüş yönlü agresif short kontrat girişleri tespit edildi')
          : (isUp ? 'High volume aggressive long additions' : 'Aggressive sell pressure positioning'),
        signalType: isTr
          ? (isUp ? 'Yükseliş Lehine (Long Potansiyeli)' : 'Düşüş Lehine (Short Potansiyeli)')
          : (isUp ? 'Potentially Bullish' : 'Potentially Bearish'),
        isBullish: isUp,
        confirmedLiquidations: defaultLiq,
      });
    }
  }

  // Deduplicate by id
  const seen = new Set<string>();
  const candidates: AlertCardData[] = [];
  for (const a of alerts) {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      candidates.push(a);
    }
  }

  // Sort candidates chronologically (oldest first) so the Significance Gate memory unfolds in order
  candidates.sort((a, b) => a.timestamp - b.timestamp);

  // Apply Significance Gate filtering
  const passedAlerts: AlertCardData[] = [];
  for (const candidate of candidates) {
    const gateResult = evaluateSignificanceGate(candidate, rawSymbol, timeframe);
    if (gateResult.passed) {
      passedAlerts.push({
        ...candidate,
        impactScore: gateResult.impactScore,
      });
    }
  }

  // Return passed alerts sorted newest first for UI display
  return passedAlerts.sort((a, b) => b.timestamp - a.timestamp);
}
