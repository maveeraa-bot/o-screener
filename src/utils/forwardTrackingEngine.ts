import { AlertCardData, TrackedAlertOutcome, PatternStatsSummary, KindStatsSummary } from '../types';

const STORAGE_KEY = 'oi_alerts_forward_tracking_v1';

/**
 * Loads stored alert tracking outcomes from localStorage
 */
export function loadStoredAlertOutcomes(): TrackedAlertOutcome[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load tracked alert outcomes:', err);
    return [];
  }
}

/**
 * Saves tracked alert outcomes to localStorage and syncs with backend
 */
export function saveStoredAlertOutcomes(outcomes: TrackedAlertOutcome[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(outcomes));
  } catch (err) {
    console.error('Failed to save tracked alert outcomes to localStorage:', err);
  }

  // Asynchronous sync to backend server for multi-session persistence
  try {
    fetch('/api/alerts/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(outcomes[0] || {}),
    }).catch(() => {
      // Ignore background sync network issues
    });
  } catch {
    // Ignore
  }
}

/**
 * Registers newly detected alerts into the tracking engine if not already tracked
 */
export function registerNewAlertsForTracking(
  currentTracked: TrackedAlertOutcome[],
  newAlerts: AlertCardData[]
): TrackedAlertOutcome[] {
  const trackedMap = new Map<string, TrackedAlertOutcome>();
  for (const item of currentTracked) {
    trackedMap.set(item.id, item);
  }

  let added = false;
  for (const alert of newAlerts) {
    if (!trackedMap.has(alert.id)) {
      const triggerTime = alert.timestamp;
      const targetDirection: 'BULLISH' | 'BEARISH' = alert.isBullish ? 'BULLISH' : 'BEARISH';

      const newRecord: TrackedAlertOutcome = {
        id: alert.id,
        timestamp: alert.timestamp,
        timeString: alert.timeString,
        kind: alert.kind,
        patternName: alert.patternName,
        symbol: alert.symbol,
        rawSymbol: alert.rawSymbol,
        timeframe: alert.timeframe,
        triggerPrice: alert.currentPrice,
        targetDirection,
        confirmedLiquidations: {
          events: alert.confirmedLiquidations?.events || 0,
          notional: alert.confirmedLiquidations?.notional || 0,
        },
        checkpoints: {
          '15m': {
            targetTime: triggerTime + 15 * 60 * 1000,
            evaluated: false,
          },
          '1h': {
            targetTime: triggerTime + 60 * 60 * 1000,
            evaluated: false,
          },
          '4h': {
            targetTime: triggerTime + 4 * 60 * 60 * 1000,
            evaluated: false,
          },
        },
        isOverallEvaluated: false,
      };

      trackedMap.set(alert.id, newRecord);
      added = true;
    }
  }

  if (!added) return currentTracked;

  const result = Array.from(trackedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
  saveStoredAlertOutcomes(result);
  return result;
}

/**
 * Evaluates pending checkpoints by querying real historical/live prices from Binance
 */
export async function evaluateCheckpoints(
  trackedList: TrackedAlertOutcome[],
  klinesCache?: any[]
): Promise<{ updatedList: TrackedAlertOutcome[]; newlyEvaluatedCount: number }> {
  const now = Date.now();
  let newlyEvaluatedCount = 0;
  const updatedList = [...trackedList];

  for (const item of updatedList) {
    const checkpoints = ['15m', '1h', '4h'] as const;

    for (const cpKey of checkpoints) {
      const cp = item.checkpoints[cpKey];
      if (cp.evaluated) continue;

      if (now >= cp.targetTime) {
        let realPrice: number | null = null;

        // 1. Try to find the exact kline in the loaded klinesCache if available
        if (klinesCache && Array.isArray(klinesCache) && klinesCache.length > 0) {
          const matched = klinesCache.find((k: any) => {
            const openTime = k[0];
            const closeTime = k[6];
            return cp.targetTime >= openTime && cp.targetTime <= closeTime + 60000;
          });

          if (matched) {
            realPrice = parseFloat(matched[4]); // close price
          }
        }

        // 2. If not found in loaded memory cache, fetch from Binance historical price API
        if (realPrice === null || realPrice === undefined) {
          try {
            const res = await fetch(
              `/api/binance/historical-price?symbol=${item.rawSymbol}&timestamp=${cp.targetTime}`
            );
            if (res.ok) {
              const data = await res.json();
              if (data.available && typeof data.price === 'number') {
                realPrice = data.price;
              }
            }
          } catch (err) {
            console.warn(`Could not fetch historical price for ${item.rawSymbol} at ${cp.targetTime}:`, err);
          }
        }

        // 3. If checkpoint time has passed and real price is confirmed
        if (typeof realPrice === 'number' && realPrice > 0) {
          const priceDiffPct = ((realPrice - item.triggerPrice) / item.triggerPrice) * 100;
          const isSuccess =
            item.targetDirection === 'BULLISH'
              ? priceDiffPct > 0
              : priceDiffPct < 0;

          cp.price = realPrice;
          cp.priceChangePct = priceDiffPct;
          cp.isSuccessful = isSuccess;
          cp.evaluated = true;
          cp.evaluatedAt = Date.now();
          newlyEvaluatedCount++;
        }
      }
    }

    // Check if all past-due checkpoints are evaluated
    const allDone = checkpoints.every((k) => {
      const cp = item.checkpoints[k];
      return cp.evaluated || now < cp.targetTime;
    });

    const isFullyComplete = checkpoints.every((k) => item.checkpoints[k].evaluated);
    item.isOverallEvaluated = isFullyComplete;
  }

  if (newlyEvaluatedCount > 0) {
    saveStoredAlertOutcomes(updatedList);
  }

  return { updatedList, newlyEvaluatedCount };
}

/**
 * Computes statistical summaries grouped by pattern name
 */
export function calculatePatternStats(trackedList: TrackedAlertOutcome[]): {
  overallWinRatePct: number;
  overallTotal: number;
  overallEvaluated: number;
  overallWins: number;
  overallAvgReturnPct: number;
  totalLiquidationsSum: number;
  fifteenMinWinRate: number;
  oneHourWinRate: number;
  fourHourWinRate: number;
  patternSummaries: PatternStatsSummary[];
  kindSummaries: KindStatsSummary[];
  rapidInflowSummary?: KindStatsSummary;
} {
  const patternMap = new Map<string, {
    total: number;
    evaluated: number;
    wins: number;
    returns: number[];
    liquidations: number[];
    fifteenWins: number;
    fifteenTotal: number;
    oneHWins: number;
    oneHTotal: number;
    fourHWins: number;
    fourHTotal: number;
  }>();

  const kindMap = new Map<string, {
    total: number;
    evaluated: number;
    wins: number;
    returns: number[];
    liquidations: number[];
    fifteenWins: number;
    fifteenTotal: number;
    oneHWins: number;
    oneHTotal: number;
    fourHWins: number;
    fourHTotal: number;
  }>();

  let overallTotal = trackedList.length;
  let overallEvaluated = 0;
  let overallWins = 0;
  const overallReturns: number[] = [];
  let totalLiquidationsSum = 0;

  let g15Wins = 0, g15Total = 0;
  let g1hWins = 0, g1hTotal = 0;
  let g4hWins = 0, g4hTotal = 0;

  for (const item of trackedList) {
    totalLiquidationsSum += item.confirmedLiquidations.notional || 0;

    let pData = patternMap.get(item.patternName);
    if (!pData) {
      pData = {
        total: 0,
        evaluated: 0,
        wins: 0,
        returns: [],
        liquidations: [],
        fifteenWins: 0,
        fifteenTotal: 0,
        oneHWins: 0,
        oneHTotal: 0,
        fourHWins: 0,
        fourHTotal: 0,
      };
      patternMap.set(item.patternName, pData);
    }
    pData.total++;
    pData.liquidations.push(item.confirmedLiquidations.notional || 0);

    const itemKind = (item.kind as string) || 'OTHER';
    let kData = kindMap.get(itemKind);
    if (!kData) {
      kData = {
        total: 0,
        evaluated: 0,
        wins: 0,
        returns: [],
        liquidations: [],
        fifteenWins: 0,
        fifteenTotal: 0,
        oneHWins: 0,
        oneHTotal: 0,
        fourHWins: 0,
        fourHTotal: 0,
      };
      kindMap.set(itemKind, kData);
    }
    kData.total++;
    kData.liquidations.push(item.confirmedLiquidations.notional || 0);

    // Check individual checkpoints
    const cp15 = item.checkpoints['15m'];
    if (cp15.evaluated && typeof cp15.isSuccessful === 'boolean') {
      g15Total++;
      pData.fifteenTotal++;
      kData.fifteenTotal++;
      if (cp15.isSuccessful) {
        g15Wins++;
        pData.fifteenWins++;
        kData.fifteenWins++;
      }
      if (typeof cp15.priceChangePct === 'number') {
        const absOrDirReturn = item.targetDirection === 'BULLISH' ? cp15.priceChangePct : -cp15.priceChangePct;
        overallReturns.push(absOrDirReturn);
        pData.returns.push(absOrDirReturn);
        kData.returns.push(absOrDirReturn);
      }
    }

    const cp1h = item.checkpoints['1h'];
    if (cp1h.evaluated && typeof cp1h.isSuccessful === 'boolean') {
      g1hTotal++;
      pData.oneHTotal++;
      kData.oneHTotal++;
      if (cp1h.isSuccessful) {
        g1hWins++;
        pData.oneHWins++;
        kData.oneHWins++;
      }
      if (typeof cp1h.priceChangePct === 'number') {
        const absOrDirReturn = item.targetDirection === 'BULLISH' ? cp1h.priceChangePct : -cp1h.priceChangePct;
        overallReturns.push(absOrDirReturn);
        pData.returns.push(absOrDirReturn);
        kData.returns.push(absOrDirReturn);
      }
    }

    const cp4h = item.checkpoints['4h'];
    if (cp4h.evaluated && typeof cp4h.isSuccessful === 'boolean') {
      g4hTotal++;
      pData.fourHTotal++;
      kData.fourHTotal++;
      if (cp4h.isSuccessful) {
        g4hWins++;
        pData.fourHWins++;
        kData.fourHWins++;
      }
      if (typeof cp4h.priceChangePct === 'number') {
        const absOrDirReturn = item.targetDirection === 'BULLISH' ? cp4h.priceChangePct : -cp4h.priceChangePct;
        overallReturns.push(absOrDirReturn);
        pData.returns.push(absOrDirReturn);
        kData.returns.push(absOrDirReturn);
      }
    }

    // Has at least one checkpoint evaluated?
    const hasAnyEval = cp15.evaluated || cp1h.evaluated || cp4h.evaluated;
    if (hasAnyEval) {
      overallEvaluated++;
      pData.evaluated++;
      kData.evaluated++;
      // Determine overall win: majority of evaluated checkpoints
      const evCheckpoints = [cp15, cp1h, cp4h].filter((c) => c.evaluated);
      const winCount = evCheckpoints.filter((c) => c.isSuccessful).length;
      if (winCount / evCheckpoints.length >= 0.5) {
        overallWins++;
        pData.wins++;
        kData.wins++;
      }
    }
  }

  const overallWinRatePct = overallEvaluated > 0 ? (overallWins / overallEvaluated) * 100 : 0;
  const overallAvgReturnPct =
    overallReturns.length > 0
      ? overallReturns.reduce((a, b) => a + b, 0) / overallReturns.length
      : 0;

  const fifteenMinWinRate = g15Total > 0 ? (g15Wins / g15Total) * 100 : 0;
  const oneHourWinRate = g1hTotal > 0 ? (g1hWins / g1hTotal) * 100 : 0;
  const fourHourWinRate = g4hTotal > 0 ? (g4hWins / g4hTotal) * 100 : 0;

  const patternSummaries: PatternStatsSummary[] = [];

  for (const [patternName, data] of patternMap.entries()) {
    const winRatePct = data.evaluated > 0 ? (data.wins / data.evaluated) * 100 : 0;
    const avgReturnPct =
      data.returns.length > 0
        ? data.returns.reduce((a, b) => a + b, 0) / data.returns.length
        : 0;
    const avgLiquidationsNotional =
      data.liquidations.length > 0
        ? data.liquidations.reduce((a, b) => a + b, 0) / data.liquidations.length
        : 0;

    const fifteenMinWinRatePct = data.fifteenTotal > 0 ? (data.fifteenWins / data.fifteenTotal) * 100 : 0;
    const oneHourWinRatePct = data.oneHTotal > 0 ? (data.oneHWins / data.oneHTotal) * 100 : 0;
    const fourHourWinRatePct = data.fourHTotal > 0 ? (data.fourHWins / data.fourHTotal) * 100 : 0;

    patternSummaries.push({
      patternName,
      totalAlerts: data.total,
      evaluatedCount: data.evaluated,
      winCount: data.wins,
      winRatePct,
      avgReturnPct,
      avgLiquidationsNotional,
      fifteenMinWinRatePct,
      oneHourWinRatePct,
      fourHourWinRatePct,
    });
  }

  // Kind/Group breakdown
  const kindSummaries: KindStatsSummary[] = [];
  function getKindMeta(kind: string): { displayName: string; kindGroup: 'INFLOW' | 'REVERSAL' | 'LIQUIDATION' | 'OTHER' } {
    switch (kind) {
      case 'RAPID_OI_UP':
        return { displayName: '🔥 Agresif OI Girişi (Aggressive Inflow)', kindGroup: 'INFLOW' };
      case 'BULLISH_REVERSAL':
        return { displayName: '🟢 Boğa Dönüş Formasyonu (Bullish Reversal)', kindGroup: 'REVERSAL' };
      case 'BEARISH_REVERSAL':
        return { displayName: '🔴 Ayı Dönüş Formasyonu (Bearish Reversal)', kindGroup: 'REVERSAL' };
      case 'MASSIVE_SHORTS_LIQ':
        return { displayName: '⚡ Short Tasfiyesi (S-OUT)', kindGroup: 'LIQUIDATION' };
      case 'MASSIVE_LONGS_LIQ':
        return { displayName: '⚡ Long Tasfiyesi (B-OUT)', kindGroup: 'LIQUIDATION' };
      default:
        return { displayName: kind || 'Diğer Formasyon', kindGroup: 'OTHER' };
    }
  }

  for (const [kindKey, data] of kindMap.entries()) {
    const meta = getKindMeta(kindKey);
    const winRatePct = data.evaluated > 0 ? (data.wins / data.evaluated) * 100 : 0;
    const avgReturnPct =
      data.returns.length > 0
        ? data.returns.reduce((a, b) => a + b, 0) / data.returns.length
        : 0;
    const avgLiquidationsNotional =
      data.liquidations.length > 0
        ? data.liquidations.reduce((a, b) => a + b, 0) / data.liquidations.length
        : 0;

    const fifteenMinWinRatePct = data.fifteenTotal > 0 ? (data.fifteenWins / data.fifteenTotal) * 100 : 0;
    const oneHourWinRatePct = data.oneHTotal > 0 ? (data.oneHWins / data.oneHTotal) * 100 : 0;
    const fourHourWinRatePct = data.fourHTotal > 0 ? (data.fourHWins / data.fourHTotal) * 100 : 0;

    kindSummaries.push({
      kind: kindKey as any,
      kindGroup: meta.kindGroup,
      displayName: meta.displayName,
      totalAlerts: data.total,
      evaluatedCount: data.evaluated,
      winCount: data.wins,
      winRatePct,
      avgReturnPct,
      avgLiquidationsNotional,
      fifteenMinWinRatePct,
      oneHourWinRatePct,
      fourHourWinRatePct,
    });
  }

  // Sort kindSummaries so that RAPID_OI_UP (INFLOW) comes first
  kindSummaries.sort((a, b) => {
    if (a.kind === 'RAPID_OI_UP') return -1;
    if (b.kind === 'RAPID_OI_UP') return 1;
    return b.totalAlerts - a.totalAlerts;
  });

  const rapidInflowSummary = kindSummaries.find((k) => k.kind === 'RAPID_OI_UP');

  return {
    overallWinRatePct,
    overallTotal,
    overallEvaluated,
    overallWins,
    overallAvgReturnPct,
    totalLiquidationsSum,
    fifteenMinWinRate,
    oneHourWinRate,
    fourHourWinRate,
    patternSummaries,
    kindSummaries,
    rapidInflowSummary,
  };
}
