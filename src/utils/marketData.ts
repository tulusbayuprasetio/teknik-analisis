import { Candle, Timeframe } from '../types/trading';

// Base benchmark anchor price for XAUUSD (~$2680 - $2710 area)
const DEFAULT_GOLD_BASE = 2685.40;

/**
 * Generates an institutional series of synthetic historical Gold (XAUUSD) candles
 * with realistic macroeconomic volatility, London/NY session breakouts, and liquidity sweeps.
 */
export function generateHistoricalCandles(count: number = 200, timeframe: Timeframe = 'M15'): Candle[] {
  const candles: Candle[] = [];
  const now = Date.now();
  
  // Interval in ms
  const intervalMsMap: Record<Timeframe, number> = {
    M1: 60 * 1000,
    M5: 5 * 60 * 1000,
    M15: 15 * 60 * 1000,
    H1: 60 * 60 * 1000,
    H4: 4 * 60 * 60 * 1000,
    D1: 24 * 60 * 60 * 1000,
  };

  const intervalMs = intervalMsMap[timeframe];
  const startTime = now - count * intervalMs;

  let currentPrice = DEFAULT_GOLD_BASE - 32.0; // Start slightly lower to simulate natural gold trend
  let trendBias = 0.05; // Gentle upward structural bias

  // Volatility scale per timeframe (Gold moves ~ $3-5 on M15, ~$12-25 on H4)
  const volMultiplierMap: Record<Timeframe, number> = {
    M1: 0.8,
    M5: 1.6,
    M15: 2.8,
    H1: 5.5,
    H4: 12.0,
    D1: 22.0,
  };
  const baseVol = volMultiplierMap[timeframe];

  for (let i = 0; i < count; i++) {
    const timestamp = startTime + i * intervalMs;
    const date = new Date(timestamp);
    const utcHour = date.getUTCHours();

    // Session volatility multiplier: London (7-16) and NY (12-21) have higher expansion
    let sessionVol = 1.0;
    if (utcHour >= 12 && utcHour < 16) {
      sessionVol = 1.8; // Peak overlap
    } else if ((utcHour >= 7 && utcHour < 12) || (utcHour >= 16 && utcHour < 20)) {
      sessionVol = 1.3;
    } else {
      sessionVol = 0.65; // Asian session consolidation
    }

    // Occasional structural shifts / news shock
    if (i % 35 === 0) {
      trendBias = (Math.random() - 0.48) * 0.4;
    }

    const candleDrift = (Math.random() - 0.48 + trendBias) * baseVol * sessionVol;
    const open = Number(currentPrice.toFixed(2));
    const close = Number((open + candleDrift).toFixed(2));

    const wickUp = Math.random() * baseVol * 0.6 * sessionVol;
    const wickDown = Math.random() * baseVol * 0.6 * sessionVol;

    const high = Number((Math.max(open, close) + wickUp).toFixed(2));
    const low = Number((Math.min(open, close) - wickDown).toFixed(2));

    const baseVolume = 800 + Math.floor(Math.random() * 1200);
    const volume = Math.floor(baseVolume * sessionVol * (1 + Math.abs(candleDrift) / baseVol));

    candles.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }

  return candles;
}

/**
 * Simulates a real-time Gold tick with fractional sub-pip micro-fluctuation,
 * maintaining institutional bid/ask spread (e.g. 18 to 26 pips).
 */
export function simulateNextTick(
  lastCandle: Candle,
  timeframe: Timeframe = 'M15'
): {
  updatedCandle: Candle;
  isNewCandle: boolean;
  bid: number;
  ask: number;
  spreadPips: number;
} {
  const now = Date.now();
  const intervalMsMap: Record<Timeframe, number> = {
    M1: 60 * 1000,
    M5: 5 * 60 * 1000,
    M15: 15 * 60 * 1000,
    H1: 60 * 60 * 1000,
    H4: 4 * 60 * 60 * 1000,
    D1: 24 * 60 * 60 * 1000,
  };

  const intervalMs = intervalMsMap[timeframe];
  const isNewCandle = now - lastCandle.timestamp >= intervalMs;

  // Realistic gold micro-tick (moves between -0.35 and +0.35 per tick)
  const tickDelta = (Math.random() - 0.495) * 0.28;
  const newPrice = Number((lastCandle.close + tickDelta).toFixed(2));

  // Dynamic institutional gold spread between 1.8 and 2.4 pips (0.18 to 0.24 USD)
  const spreadUsd = Number((0.18 + Math.random() * 0.08).toFixed(2));
  const bid = Number((newPrice - spreadUsd / 2).toFixed(2));
  const ask = Number((newPrice + spreadUsd / 2).toFixed(2));
  const spreadPips = Number((spreadUsd * 100).toFixed(1));

  if (isNewCandle) {
    const freshCandle: Candle = {
      timestamp: now,
      open: newPrice,
      high: newPrice,
      low: newPrice,
      close: newPrice,
      volume: 12,
    };
    return {
      updatedCandle: freshCandle,
      isNewCandle: true,
      bid,
      ask,
      spreadPips,
    };
  } else {
    const updatedCandle: Candle = {
      ...lastCandle,
      high: Math.max(lastCandle.high, newPrice),
      low: Math.min(lastCandle.low, newPrice),
      close: newPrice,
      volume: lastCandle.volume + Math.floor(Math.random() * 15 + 1),
    };
    return {
      updatedCandle,
      isNewCandle: false,
      bid,
      ask,
      spreadPips,
    };
  }
}

/**
 * Attempts to fetch live gold quote from public Binance PAXG (Tokenized Gold Spot equivalent)
 * Fallback to null on offline or network boundary.
 */
export async function fetchLiveGoldPrice(): Promise<number | null> {
  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT', {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const price = parseFloat(data.price);
    if (!isNaN(price) && price > 1500) {
      return Number(price.toFixed(2));
    }
    return null;
  } catch {
    return null;
  }
}
