import { Candle, LuxAlgoIndicatorData, OrderBlock, FairValueGap, SMCStructure, LiquidityLevel, SignalType, TradingSignal, Timeframe } from '../types/trading';

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return result;

  // Simple average for initial seed
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let prevEMA = sum / period;
  result[period - 1] = prevEMA;

  const multiplier = 2 / (period + 1);
  for (let i = period; i < values.length; i++) {
    const currentVal = values[i];
    prevEMA = (currentVal - prevEMA) * multiplier + prevEMA;
    result[i] = Number(prevEMA.toFixed(2));
  }
  return result;
}

/**
 * Calculates Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period) return result;

  const tr: number[] = [];
  tr.push(candles[0].high - candles[0].low);

  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const prevC = candles[i - 1].close;
    const currentTR = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    tr.push(currentTR);
  }

  let atrSum = 0;
  for (let i = 0; i < period; i++) {
    atrSum += tr[i];
  }
  let currentATR = atrSum / period;
  result[period - 1] = currentATR;

  for (let i = period; i < candles.length; i++) {
    currentATR = (currentATR * (period - 1) + tr[i]) / period;
    result[i] = Number(currentATR.toFixed(2));
  }
  return result;
}

/**
 * Calculates Relative Strength Index (RSI)
 */
export function calculateRSI(candles: Candle[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = Number((100 - (100 / (1 + rs))).toFixed(2));

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = Number((100 - (100 / (1 + rs))).toFixed(2));
  }

  return result;
}

/**
 * Detects Smart Money Concepts (SMC):
 * 1. Order Blocks (OB)
 * 2. Fair Value Gaps (FVG)
 * 3. Market Structure Breaks (BOS / CHoCH)
 * 4. Key Psychological & Liquidity Levels
 */
export function detectSmartMoneyConcepts(candles: Candle[], atrValues: (number | null)[]): {
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  structures: SMCStructure[];
  liquidityLevels: LiquidityLevel[];
} {
  const orderBlocks: OrderBlock[] = [];
  const fairValueGaps: FairValueGap[] = [];
  const structures: SMCStructure[] = [];
  const liquidityLevels: LiquidityLevel[] = [];

  const n = candles.length;
  if (n < 5) {
    return { orderBlocks, fairValueGaps, structures, liquidityLevels };
  }

  // 1. Fair Value Gaps (FVG) - 3 candle imbalance
  for (let i = 2; i < n; i++) {
    const c1 = candles[i - 2];
    const c3 = candles[i];
    const currentClose = candles[n - 1].close;

    // Bullish FVG: Low of candle 3 is higher than High of candle 1
    if (c3.low > c1.high) {
      const top = c3.low;
      const bottom = c1.high;
      const filled = currentClose <= bottom;
      fairValueGaps.push({
        id: `fvg-bull-${i}`,
        type: 'BULLISH',
        top: Number(top.toFixed(2)),
        bottom: Number(bottom.toFixed(2)),
        candleIndex: i - 1,
        time: candles[i - 1].timestamp,
        filled,
      });
    }

    // Bearish FVG: High of candle 3 is lower than Low of candle 1
    if (c3.high < c1.low) {
      const top = c1.low;
      const bottom = c3.high;
      const filled = currentClose >= top;
      fairValueGaps.push({
        id: `fvg-bear-${i}`,
        type: 'BEARISH',
        top: Number(top.toFixed(2)),
        bottom: Number(bottom.toFixed(2)),
        candleIndex: i - 1,
        time: candles[i - 1].timestamp,
        filled,
      });
    }
  }

  // 2. Swing Highs & Lows (Fractals, window of 2 before & 2 after)
  const swingHighs: { index: number; price: number }[] = [];
  const swingLows: { index: number; price: number }[] = [];

  for (let i = 2; i < n - 2; i++) {
    const h = candles[i].high;
    const l = candles[i].low;

    if (
      h > candles[i - 1].high &&
      h > candles[i - 2].high &&
      h > candles[i + 1].high &&
      h > candles[i + 2].high
    ) {
      swingHighs.push({ index: i, price: h });
    }

    if (
      l < candles[i - 1].low &&
      l < candles[i - 2].low &&
      l < candles[i + 1].low &&
      l < candles[i + 2].low
    ) {
      swingLows.push({ index: i, price: l });
    }
  }

  // 3. BOS & CHoCH Structure Detection
  let lastBullishTrend = true;
  for (let i = 1; i < swingHighs.length; i++) {
    const prevSH = swingHighs[i - 1];
    const currSH = swingHighs[i];

    if (currSH.price > prevSH.price) {
      structures.push({
        type: lastBullishTrend ? 'BOS' : 'CHoCH',
        direction: 'BULLISH',
        price: Number(prevSH.price.toFixed(2)),
        index: currSH.index,
        time: candles[currSH.index].timestamp,
      });
      lastBullishTrend = true;
    }
  }

  for (let i = 1; i < swingLows.length; i++) {
    const prevSL = swingLows[i - 1];
    const currSL = swingLows[i];

    if (currSL.price < prevSL.price) {
      structures.push({
        type: !lastBullishTrend ? 'BOS' : 'CHoCH',
        direction: 'BEARISH',
        price: Number(prevSL.price.toFixed(2)),
        index: currSL.index,
        time: candles[currSL.index].timestamp,
      });
      lastBullishTrend = false;
    }
  }

  // 4. Order Blocks (OB)
  // Look for strong displacement candles (body > 1.5 * ATR)
  for (let i = 3; i < n; i++) {
    const candle = candles[i];
    const prev = candles[i - 1];
    const currentAtr = atrValues[i] || 3.5;
    const body = Math.abs(candle.close - candle.open);

    const isStrongExpansion = body > currentAtr * 1.3;

    // Bullish OB: prev candle was bearish or narrow, followed by strong green displacement
    if (isStrongExpansion && candle.close > candle.open && prev.close <= prev.open) {
      const top = Math.max(prev.open, prev.close);
      const bottom = prev.low;
      const mitigated = candles.slice(i + 1).some((c) => c.low <= top);

      orderBlocks.push({
        id: `ob-bull-${i}`,
        type: 'BULLISH',
        top: Number(top.toFixed(2)),
        bottom: Number(bottom.toFixed(2)),
        candleIndex: i - 1,
        time: prev.timestamp,
        mitigated,
      });
    }

    // Bearish OB: prev candle was bullish or narrow, followed by strong red displacement
    if (isStrongExpansion && candle.close < candle.open && prev.close >= prev.open) {
      const top = prev.high;
      const bottom = Math.min(prev.open, prev.close);
      const mitigated = candles.slice(i + 1).some((c) => c.high >= bottom);

      orderBlocks.push({
        id: `ob-bear-${i}`,
        type: 'BEARISH',
        top: Number(top.toFixed(2)),
        bottom: Number(bottom.toFixed(2)),
        candleIndex: i - 1,
        time: prev.timestamp,
        mitigated,
      });
    }
  }

  // 5. Psychological Gold Levels & Equal Highs/Lows
  const latestPrice = candles[n - 1].close;
  const baseRound = Math.floor(latestPrice / 25) * 25;
  const levels = [baseRound - 50, baseRound - 25, baseRound, baseRound + 25, baseRound + 50];

  levels.forEach((lvl) => {
    liquidityLevels.push({
      id: `psych-${lvl}`,
      type: 'PSYCHOLOGICAL',
      price: lvl,
      label: `$${lvl}.00 Key Psych Level`,
      swept: Math.abs(latestPrice - lvl) < 2.0,
    });
  });

  // Equal Highs / Lows (within 0.50 gold price diff)
  for (let i = 0; i < swingHighs.length - 1; i++) {
    for (let j = i + 1; j < swingHighs.length; j++) {
      if (Math.abs(swingHighs[i].price - swingHighs[j].price) <= 0.6) {
        liquidityLevels.push({
          id: `eqh-${i}-${j}`,
          type: 'EQH',
          price: Number(swingHighs[j].price.toFixed(2)),
          label: 'Equal Highs (Buy-Side Liquidity Pool)',
          swept: latestPrice > swingHighs[j].price,
        });
        break;
      }
    }
  }

  for (let i = 0; i < swingLows.length - 1; i++) {
    for (let j = i + 1; j < swingLows.length; j++) {
      if (Math.abs(swingLows[i].price - swingLows[j].price) <= 0.6) {
        liquidityLevels.push({
          id: `eql-${i}-${j}`,
          type: 'EQL',
          price: Number(swingLows[j].price.toFixed(2)),
          label: 'Equal Lows (Sell-Side Liquidity Pool)',
          swept: latestPrice < swingLows[j].price,
        });
        break;
      }
    }
  }

  return {
    orderBlocks: orderBlocks.slice(-8), // Keep relevant recent active OBs
    fairValueGaps: fairValueGaps.slice(-8),
    structures: structures.slice(-10),
    liquidityLevels: liquidityLevels.slice(-8),
  };
}

/**
 * Calculates LuxAlgo Signals & Overlays (Trend Ribbon, Adaptive Volatility Bands, Confirmation Signals)
 */
export function calculateLuxAlgoIndicators(candles: Candle[]): LuxAlgoIndicatorData {
  const closes = candles.map((c) => c.close);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const atr = calculateATR(candles, 14);
  const rsi = calculateRSI(candles, 14);

  const trendRibbon: LuxAlgoIndicatorData['trendRibbon'] = [];
  const confirmationSignals: LuxAlgoIndicatorData['confirmationSignals'] = [];

  for (let i = 0; i < candles.length; i++) {
    const e20 = ema20[i] ?? candles[i].close;
    const e50 = ema50[i] ?? candles[i].close;
    const currentAtr = atr[i] ?? 3.5;

    // Adaptive Baseline
    const baseline = Number((e20 * 0.65 + e50 * 0.35).toFixed(2));
    const trend = e20 >= e50 ? 'BULLISH' : 'BEARISH';
    const upperBand = Number((baseline + currentAtr * 1.618).toFixed(2));
    const lowerBand = Number((baseline - currentAtr * 1.618).toFixed(2));

    trendRibbon.push({
      baseline,
      upperBand,
      lowerBand,
      trend,
    });

    // Confirmation Signals calculation (Momentum breakout + Band rejection + Volume confirmation)
    if (i >= 20) {
      const prevTrend = trendRibbon[i - 1]?.trend;
      const currClose = candles[i].close;
      const prevClose = candles[i - 1].close;
      const currVol = candles[i].volume;
      const prevVol = candles[i - 1].volume;
      const currRsi = rsi[i] ?? 50;

      const isVolSpike = currVol > prevVol * 1.25;

      // Strong Buy: Trend shifts to Bullish, RSI crossed 50 upwards, close above upper half of baseline
      if (trend === 'BULLISH' && prevTrend === 'BEARISH') {
        const isStrong = currClose > baseline && currRsi > 52 && isVolSpike;
        confirmationSignals.push({
          index: i,
          time: candles[i].timestamp,
          type: isStrong ? 'STRONG_BUY' : 'BUY',
          price: currClose,
          strength: isStrong ? 92 : 78,
        });
      }
      // Bullish baseline bounce inside established trend
      else if (
        trend === 'BULLISH' &&
        candles[i].low <= baseline &&
        currClose > baseline &&
        currClose > prevClose &&
        currRsi >= 48 &&
        currRsi <= 68
      ) {
        // Confirmation Buy on retest
        if (i % 6 === 0) { // avoid signal flooding
          confirmationSignals.push({
            index: i,
            time: candles[i].timestamp,
            type: 'BUY',
            price: currClose,
            strength: 84,
          });
        }
      }

      // Strong Sell: Trend shifts to Bearish, RSI crossed 50 downwards, close below lower half
      if (trend === 'BEARISH' && prevTrend === 'BULLISH') {
        const isStrong = currClose < baseline && currRsi < 48 && isVolSpike;
        confirmationSignals.push({
          index: i,
          time: candles[i].timestamp,
          type: isStrong ? 'STRONG_SELL' : 'SELL',
          price: currClose,
          strength: isStrong ? 91 : 76,
        });
      }
      // Bearish baseline rejection inside established trend
      else if (
        trend === 'BEARISH' &&
        candles[i].high >= baseline &&
        currClose < baseline &&
        currClose < prevClose &&
        currRsi <= 52 &&
        currRsi >= 32
      ) {
        if (i % 6 === 0) {
          confirmationSignals.push({
            index: i,
            time: candles[i].timestamp,
            type: 'SELL',
            price: currClose,
            strength: 83,
          });
        }
      }
    }
  }

  const smc = detectSmartMoneyConcepts(candles, atr);

  return {
    trendRibbon,
    confirmationSignals: confirmationSignals.slice(-15),
    orderBlocks: smc.orderBlocks,
    fairValueGaps: smc.fairValueGaps,
    structures: smc.structures,
    liquidityLevels: smc.liquidityLevels,
    ema20,
    ema50,
    ema200,
    rsi,
    atr,
  };
}

/**
 * Calculates current market session based on current UTC time
 */
export function getCurrentSession(): 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'LONDON_NY_OVERLAP' {
  const now = new Date();
  const utcHour = now.getUTCHours();

  if (utcHour >= 12 && utcHour < 16) {
    return 'LONDON_NY_OVERLAP';
  } else if (utcHour >= 7 && utcHour < 16) {
    return 'LONDON';
  } else if (utcHour >= 12 && utcHour < 21) {
    return 'NEW_YORK';
  } else {
    return 'ASIAN';
  }
}

/**
 * Evaluates high-probability confluence signal based on all indicators, SMC, and session factors.
 * Institutional Gold criteria requires >= 75% score.
 */
export function generateConfluenceSignal(
  candles: Candle[],
  indicators: LuxAlgoIndicatorData,
  timeframe: Timeframe = 'M15'
): TradingSignal | null {
  if (candles.length < 30) return null;

  const lastCandle = candles[candles.length - 1];
  const lastIndex = candles.length - 1;
  const currentPrice = lastCandle.close;
  const currentAtr = indicators.atr[lastIndex] || 3.8;
  const currentRsi = indicators.rsi[lastIndex] || 50;
  const currentTrend = indicators.trendRibbon[lastIndex]?.trend || 'BULLISH';
  const baseline = indicators.trendRibbon[lastIndex]?.baseline || currentPrice;
  const session = getCurrentSession();

  // Find recent confirmation signal within last 3 bars
  const recentSignal = indicators.confirmationSignals.find(
    (s) => s.index >= lastIndex - 3
  );

  // Active unmitigated order blocks near current price (within 1.5 ATR)
  const nearbyBullishOB = indicators.orderBlocks.find(
    (ob) => !ob.mitigated && ob.type === 'BULLISH' && Math.abs(currentPrice - ob.top) <= currentAtr * 1.5
  );
  const nearbyBearishOB = indicators.orderBlocks.find(
    (ob) => !ob.mitigated && ob.type === 'BEARISH' && Math.abs(currentPrice - ob.bottom) <= currentAtr * 1.5
  );

  // Active FVGs
  const nearbyBullishFVG = indicators.fairValueGaps.find(
    (f) => !f.filled && f.type === 'BULLISH' && Math.abs(currentPrice - f.bottom) <= currentAtr * 1.2
  );
  const nearbyBearishFVG = indicators.fairValueGaps.find(
    (f) => !f.filled && f.type === 'BEARISH' && Math.abs(currentPrice - f.top) <= currentAtr * 1.2
  );

  // Check recent structure break
  const recentStructure = indicators.structures.slice(-2);
  const hasBullishStructure = recentStructure.some((s) => s.direction === 'BULLISH');
  const hasBearishStructure = recentStructure.some((s) => s.direction === 'BEARISH');

  // Let's test BUY confluence
  let buyScore = 0;
  const buyReasons: string[] = [];

  if (currentTrend === 'BULLISH') {
    buyScore += 20;
    buyReasons.push('LuxAlgo Trend Tracker in Strong Bullish alignment');
  }

  if (recentSignal && (recentSignal.type === 'STRONG_BUY' || recentSignal.type === 'BUY')) {
    buyScore += recentSignal.type === 'STRONG_BUY' ? 25 : 20;
    buyReasons.push(`LuxAlgo Confirmation ${recentSignal.type === 'STRONG_BUY' ? 'Strong Buy' : 'Buy'} alert confirmed`);
  }

  if (nearbyBullishOB) {
    buyScore += 20;
    buyReasons.push(`Retest of Bullish Order Block demand zone ($${nearbyBullishOB.bottom} - $${nearbyBullishOB.top})`);
  }

  if (nearbyBullishFVG) {
    buyScore += 10;
    buyReasons.push(`Fair Value Gap (FVG) discount rebalance at $${nearbyBullishFVG.bottom}`);
  }

  if (hasBullishStructure) {
    buyScore += 15;
    buyReasons.push('Recent Market Structure Break (BOS/CHoCH) to the upside');
  }

  if (currentRsi >= 45 && currentRsi <= 62) {
    buyScore += 10;
    buyReasons.push(`RSI momentum (${currentRsi.toFixed(1)}) healthy with room for upside expansion`);
  }

  if (session === 'LONDON_NY_OVERLAP' || session === 'LONDON' || session === 'NEW_YORK') {
    buyScore += 10;
    buyReasons.push(`High institutional liquidity window: ${session.replace(/_/g, ' ')} Session`);
  }

  // Let's test SELL confluence
  let sellScore = 0;
  const sellReasons: string[] = [];

  if (currentTrend === 'BEARISH') {
    sellScore += 20;
    sellReasons.push('LuxAlgo Trend Tracker in Strong Bearish alignment');
  }

  if (recentSignal && (recentSignal.type === 'STRONG_SELL' || recentSignal.type === 'SELL')) {
    sellScore += recentSignal.type === 'STRONG_SELL' ? 25 : 20;
    sellReasons.push(`LuxAlgo Confirmation ${recentSignal.type === 'STRONG_SELL' ? 'Strong Sell' : 'Sell'} alert confirmed`);
  }

  if (nearbyBearishOB) {
    sellScore += 20;
    sellReasons.push(`Retest of Bearish Order Block supply zone ($${nearbyBearishOB.bottom} - $${nearbyBearishOB.top})`);
  }

  if (nearbyBearishFVG) {
    sellScore += 10;
    sellReasons.push(`Fair Value Gap (FVG) premium fill at $${nearbyBearishFVG.top}`);
  }

  if (hasBearishStructure) {
    sellScore += 15;
    sellReasons.push('Recent Market Structure Breakdown (BOS/CHoCH) to the downside');
  }

  if (currentRsi <= 55 && currentRsi >= 38) {
    sellScore += 10;
    sellReasons.push(`RSI momentum (${currentRsi.toFixed(1)}) poised for downside continuation`);
  }

  if (session === 'LONDON_NY_OVERLAP' || session === 'LONDON' || session === 'NEW_YORK') {
    sellScore += 10;
    sellReasons.push(`High institutional liquidity window: ${session.replace(/_/g, ' ')} Session`);
  }

  // High probability threshold is >= 75
  const isBuyValid = buyScore >= 75;
  const isSellValid = sellScore >= 75;

  if (!isBuyValid && !isSellValid) {
    // Generate an illustrative high-probability signal if none active right now
    // So the trader always has a live verified setup to review and test!
    return null;
  }

  if (buyScore >= sellScore) {
    const slDistance = Number((currentAtr * 1.5).toFixed(2));
    const sl = Number((currentPrice - slDistance).toFixed(2));
    const tp1 = Number((currentPrice + slDistance * 1.5).toFixed(2));
    const tp2 = Number((currentPrice + slDistance * 2.5).toFixed(2));
    const tp3 = Number((currentPrice + slDistance * 4.0).toFixed(2));
    const rr = Number(((tp2 - currentPrice) / (currentPrice - sl)).toFixed(2));

    return {
      id: `sig-buy-${lastCandle.timestamp}`,
      timestamp: lastCandle.timestamp,
      symbol: 'XAUUSD',
      timeframe,
      direction: buyScore >= 85 ? 'STRONG_BUY' : 'BUY',
      entryPrice: currentPrice,
      stopLoss: sl,
      tp1,
      tp2,
      tp3,
      riskReward: rr,
      confluenceScore: Math.min(buyScore, 98),
      isHighProbability: true,
      reasons: buyReasons,
      status: 'ACTIVE',
      pipsRisk: Number(((currentPrice - sl) * 10).toFixed(1)),
      pipsReward: Number(((tp2 - currentPrice) * 10).toFixed(1)),
      session,
    };
  } else {
    const slDistance = Number((currentAtr * 1.5).toFixed(2));
    const sl = Number((currentPrice + slDistance).toFixed(2));
    const tp1 = Number((currentPrice - slDistance * 1.5).toFixed(2));
    const tp2 = Number((currentPrice - slDistance * 2.5).toFixed(2));
    const tp3 = Number((currentPrice - slDistance * 4.0).toFixed(2));
    const rr = Number(((currentPrice - tp2) / (sl - currentPrice)).toFixed(2));

    return {
      id: `sig-sell-${lastCandle.timestamp}`,
      timestamp: lastCandle.timestamp,
      symbol: 'XAUUSD',
      timeframe,
      direction: sellScore >= 85 ? 'STRONG_SELL' : 'SELL',
      entryPrice: currentPrice,
      stopLoss: sl,
      tp1,
      tp2,
      tp3,
      riskReward: rr,
      confluenceScore: Math.min(sellScore, 98),
      isHighProbability: true,
      reasons: sellReasons,
      status: 'ACTIVE',
      pipsRisk: Number(((sl - currentPrice) * 10).toFixed(1)),
      pipsReward: Number(((currentPrice - tp2) * 10).toFixed(1)),
      session,
    };
  }
}
