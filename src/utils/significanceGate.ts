import { AlertCardData, SignificanceFilterLog } from '../types';

/**
 * Calculates the real-market Significance Impact Score strictly derived from real data:
 * impactScore = abs(relativeOiZScore) * 0.5 
 *             + abs(relativePriceZScore) * 0.2 
 *             + min(abs(oiChangePct) / 1.5, 3) * 0.2 
 *             + min(confirmedLiquidations.notional / 5000000, 3) * 0.1
 */
export function calculateImpactScore(
  relativeOiZScore: number,
  relativePriceZScore: number,
  oiChangePct: number,
  confirmedLiquidationsNotional: number = 0
): number {
  const oiTerm = Math.abs(relativeOiZScore) * 0.5;
  const priceTerm = Math.abs(relativePriceZScore) * 0.2;
  const oiPctTerm = Math.min(Math.abs(oiChangePct) / 1.5, 3) * 0.2;
  const liqTerm = Math.min(Math.max(0, confirmedLiquidationsNotional) / 5_000_000, 3) * 0.1;

  const rawScore = oiTerm + priceTerm + oiPctTerm + liqTerm;
  return parseFloat(rawScore.toFixed(2));
}

// ============================================================================
// CONFIGURABLE SIGNIFICANCE CONSTANTS (Kolayca değiştirilebilir sabitler)
// ============================================================================
export const MIN_THRESHOLD = 1.5;     // Temel eşik: |relativeOiZScore| en az 1.5 olmalı
export const MIN_MARGIN = 0.3;        // Aynı yöndeki bir öncekinden en az bu kadar büyük olmalı
export const MEMORY_RESET_BARS = 16;  // Aynı yönde 16 bar boyunca yeni sinyal gelmezse bellek sıfırlanır (15dk periyotta 4 saat)

/**
 * Calculates timeframe candle duration in milliseconds.
 * 15m -> 15 * 60 * 1000 = 900,000 ms.
 * 16 bars of 15m = 16 * 900,000 = 14,400,000 ms = 4 hours.
 */
export function getTimeframeDurationMs(timeframe: string): number {
  const tf = String(timeframe || '15m').toLowerCase().trim();
  if (tf.endsWith('m')) {
    const mins = parseFloat(tf.replace('m', '')) || 15;
    return mins * 60 * 1000;
  }
  if (tf.endsWith('h')) {
    const hours = parseFloat(tf.replace('h', '')) || 1;
    return hours * 60 * 60 * 1000;
  }
  if (tf.endsWith('d')) {
    const days = parseFloat(tf.replace('d', '')) || 1;
    return days * 24 * 60 * 60 * 1000;
  }
  const mins = parseFloat(tf) || 15;
  return mins * 60 * 1000;
}

/**
 * Returns memory reset window duration in ms based on MEMORY_RESET_BARS and timeframe.
 */
export function getMemoryResetDurationMs(timeframe: string): number {
  return MEMORY_RESET_BARS * getTimeframeDurationMs(timeframe);
}

/**
 * Core significance function:
 * 
 * function isSignificant(bar, lastSameDirectionZScore):
 *   const currentZ = Math.abs(bar.relativeOiZScore)
 *   const MIN_THRESHOLD = 1.5
 *   const MIN_MARGIN = 0.3   // bir öncekinden en az bu kadar büyük olmalı
 * 
 *   if (currentZ < MIN_THRESHOLD) return false  // temel eşik
 * 
 *   if (lastSameDirectionZScore !== null) {
 *     // Önceki sinyalden daha zayıf veya çok yakınsa (0.3 marjın altındaysa) ele
 *     if (currentZ <= lastSameDirectionZScore + MIN_MARGIN) return false
 *   }
 * 
 *   return true
 */
export function isSignificant(
  bar: { relativeOiZScore?: number; relativeOi?: number } | number,
  lastSameDirectionZScore: number | null
): boolean {
  const rawZ =
    typeof bar === 'number'
      ? bar
      : bar.relativeOiZScore !== undefined
      ? bar.relativeOiZScore
      : bar.relativeOi;

  const currentZ = Math.abs(Number(rawZ || 0));

  if (currentZ < MIN_THRESHOLD) return false; // temel eşik

  if (lastSameDirectionZScore !== null && lastSameDirectionZScore !== undefined) {
    // Önceki sinyalden daha zayıf veya çok yakınsa (0.3 marjın altındaysa) ele
    if (currentZ <= lastSameDirectionZScore + MIN_MARGIN) return false;
  }

  return true;
}

export interface SignificanceMemoryEntry {
  relativeOiZScore: number; // Math.abs(bar.relativeOiZScore)
  rawZScore: number;
  timestamp: number;
  alertId?: string;
  impactScore?: number;
  symbol: string;
  timeframe: string;
  direction: 'BULLISH' | 'BEARISH';
}

// In-memory memory map for the last valid signals
// Key: `${rawSymbol}_${timeframe}_${direction}` (e.g. "BTCUSDT_15m_BULLISH")
const memoryMap = new Map<string, SignificanceMemoryEntry>();

// Keep track of alert IDs that have already passed in this session to prevent self-comparison
const passedAlertIds = new Set<string>();

// Internal audit logs for filtered vs passed signals
const filterLogs: SignificanceFilterLog[] = [];
const MAX_LOGS = 200;

export interface SignificanceEvaluationResult {
  passed: boolean;
  reason: string;
  impactScore: number;
  prevImpactScore?: number;
  relativeOiZScore: number;
  prevRelativeOiZScore?: number;
}

/**
 * Evaluates whether an alert candidate passes the Significance Gate with same-direction comparison.
 * 
 * Rules:
 * 1) Same Direction: Compares current |relativeOiZScore| with lastSameDirectionZScore.
 *    Must be > lastSameDirectionZScore + MIN_MARGIN (0.3).
 * 2) Direction Change: Opposite direction maintains its own separate memory.
 *    When direction changes, lastSameDirectionZScore is null and evaluated only against MIN_THRESHOLD (1.5).
 * 3) Memory Reset: If 16 bars (4 hours on 15m) elapse without a new valid signal in that direction,
 *    the memory resets and the next signal in that direction is evaluated with lastSameDirectionZScore = null.
 * 4) Memory Update: When a signal passes isSignificant(), its relativeOiZScore is written to memory.
 */
export function evaluateSignificanceGate(
  alert: Omit<AlertCardData, 'impactScore'> & { impactScore?: number },
  rawSymbol: string,
  timeframe: string
): SignificanceEvaluationResult {
  const direction: 'BULLISH' | 'BEARISH' = alert.isBullish ? 'BULLISH' : 'BEARISH';
  const kindGroup = alert.kind === 'RAPID_OI_UP' ? 'INFLOW' 
                   : (alert.kind === 'BULLISH_REVERSAL' || alert.kind === 'BEARISH_REVERSAL') ? 'REVERSAL'
                   : 'LIQUIDATION';  // S-OUT / B-OUT
  const sameKey = `${rawSymbol}_${timeframe}_${direction}_${kindGroup}`;

  const rawZ = alert.relativeOi !== undefined ? alert.relativeOi : (alert as any).relativeOiZScore;
  const currentZ = Math.abs(Number(rawZ || 0));

  const impactScore =
    alert.impactScore !== undefined
      ? alert.impactScore
      : calculateImpactScore(
          alert.relativeOi,
          alert.relativePrice,
          alert.oiChangePct,
          alert.confirmedLiquidations?.notional || 0
        );

  // If this exact alert already passed in the current session state, retain it
  if (alert.id && passedAlertIds.has(alert.id)) {
    return {
      passed: true,
      reason: 'passed: already validated in current session',
      impactScore,
      relativeOiZScore: currentZ,
    };
  }

  const prevSame = memoryMap.get(sameKey);
  let lastSameDirectionZScore: number | null = null;

  if (prevSame) {
    const resetWindowMs = getMemoryResetDurationMs(timeframe);
    const timeElapsed = alert.timestamp - prevSame.timestamp;

    // Bellek sıfırlama: 16 bar boyunca hiç yeni sinyal gelmediyse sıfırla
    if (timeElapsed >= resetWindowMs) {
      memoryMap.delete(sameKey);
      lastSameDirectionZScore = null;
      console.log(`[Significance Gate] Memory RESET for ${sameKey} (Elapsed: ${(timeElapsed / 3600000).toFixed(1)}h >= ${(resetWindowMs / 3600000).toFixed(1)}h)`);
    } else {
      lastSameDirectionZScore = prevSame.relativeOiZScore;
    }
  }

  // Evaluate with core isSignificant logic
  const passed = isSignificant(alert, lastSameDirectionZScore);

  if (!passed) {
    let reason = '';
    if (currentZ < MIN_THRESHOLD) {
      reason = `filtered: |relativeOiZScore| (${currentZ.toFixed(2)}σ) < MIN_THRESHOLD (${MIN_THRESHOLD}σ)`;
    } else if (lastSameDirectionZScore !== null) {
      reason = `filtered: |relativeOiZScore| (${currentZ.toFixed(2)}σ) <= previous same-direction (${lastSameDirectionZScore.toFixed(2)}σ) + MIN_MARGIN (${MIN_MARGIN}σ) (required > ${(lastSameDirectionZScore + MIN_MARGIN).toFixed(2)}σ)`;
    } else {
      reason = `filtered: did not satisfy significance threshold`;
    }

    console.log(`[Significance Gate FILTERED] ${rawSymbol} [${timeframe}] ${direction} -> ${reason}`);

    addFilterLog({
      id: `gate-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      alertId: alert.id,
      timestamp: alert.timestamp,
      symbol: rawSymbol,
      timeframe,
      direction,
      impactScore,
      prevImpactScore: prevSame?.impactScore,
      relativeOiZScore: currentZ,
      prevRelativeOiZScore: lastSameDirectionZScore || undefined,
      status: 'filtered',
      reason,
    });

    return {
      passed: false,
      reason,
      impactScore,
      prevImpactScore: prevSame?.impactScore,
      relativeOiZScore: currentZ,
      prevRelativeOiZScore: lastSameDirectionZScore || undefined,
    };
  }

  // Bir sinyal isSignificant() ile geçerli sayılırsa:
  // O sinyalin relativeOiZScore'u belleğe "son geçerli değer" olarak YAZILSIN
  memoryMap.set(sameKey, {
    relativeOiZScore: currentZ,
    rawZScore: rawZ,
    timestamp: alert.timestamp,
    alertId: alert.id,
    impactScore,
    symbol: rawSymbol,
    timeframe,
    direction,
  });

  if (alert.id) {
    passedAlertIds.add(alert.id);
  }

  const passedReason =
    lastSameDirectionZScore !== null
      ? `passed: stronger same-direction signal (${currentZ.toFixed(2)}σ > ${lastSameDirectionZScore.toFixed(2)}σ + ${MIN_MARGIN}σ)`
      : `passed: fresh or memory-reset signal (${currentZ.toFixed(2)}σ >= ${MIN_THRESHOLD}σ)`;

  console.log(`[Significance Gate PASSED] ${rawSymbol} [${timeframe}] ${direction} -> ${passedReason}`);

  addFilterLog({
    id: `gate-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    alertId: alert.id,
    timestamp: alert.timestamp,
    symbol: rawSymbol,
    timeframe,
    direction,
    impactScore,
    prevImpactScore: prevSame?.impactScore,
    relativeOiZScore: currentZ,
    prevRelativeOiZScore: lastSameDirectionZScore || undefined,
    status: 'passed',
    reason: passedReason,
  });

  return {
    passed: true,
    reason: passedReason,
    impactScore,
    prevImpactScore: prevSame?.impactScore,
    relativeOiZScore: currentZ,
    prevRelativeOiZScore: lastSameDirectionZScore || undefined,
  };
}

function addFilterLog(log: SignificanceFilterLog) {
  filterLogs.unshift(log);
  if (filterLogs.length > MAX_LOGS) {
    filterLogs.pop();
  }
}

export function getSignificanceFilterLogs(): SignificanceFilterLog[] {
  return [...filterLogs];
}

export function getSignificanceMemory(): Record<string, SignificanceMemoryEntry> {
  const out: Record<string, SignificanceMemoryEntry> = {};
  for (const [key, value] of memoryMap.entries()) {
    out[key] = { ...value };
  }
  return out;
}

export function resetSignificanceMemory(): void {
  memoryMap.clear();
  passedAlertIds.clear();
  filterLogs.length = 0;
}
