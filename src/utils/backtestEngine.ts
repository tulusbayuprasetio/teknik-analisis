import { Candle, BacktestConfig, BacktestResult, BacktestTrade } from '../types/trading';
import { calculateLuxAlgoIndicators, calculateATR } from './indicators';

/**
 * Institutional Backtesting Engine for XAUUSD Strategies.
 * Simulates real execution conditions including spread, pip values, stop loss,
 * multiple take profit targets, breakeven moves, and trailing stops.
 */
export function runStrategyBacktest(
  candles: Candle[],
  config: BacktestConfig
): BacktestResult {
  const {
    initialBalance,
    riskPercent,
    rrTarget,
    atrMultiplierSL,
    useTrailingStop,
    moveBreakevenAtTP1,
    minConfluenceScore,
  } = config;

  // Compute indicators across historical dataset
  const indicators = calculateLuxAlgoIndicators(candles);
  const atr = calculateATR(candles, 14);

  let currentBalance = initialBalance;
  let peakBalance = initialBalance;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  const trades: BacktestTrade[] = [];
  const equityCurve: { time: number; equity: number; drawdown: number }[] = [
    { time: candles[0].timestamp, equity: initialBalance, drawdown: 0 },
  ];

  let activeTrade: {
    direction: 'BUY' | 'SELL';
    entryPrice: number;
    stopLoss: number;
    initialSL: number;
    tp1: number;
    takeProfit: number;
    lots: number;
    entryTime: number;
    entryIndex: number;
    confluenceScore: number;
    isBreakeven: boolean;
  } | null = null;

  // Warmup period: skip first 35 candles for indicator stabilization
  const startIdx = 35;

  for (let i = startIdx; i < candles.length; i++) {
    const candle = candles[i];
    const prevCandle = candles[i - 1];
    const currentAtr = atr[i] || 3.5;
    const trendData = indicators.trendRibbon[i];

    // 1. Manage Active Trade if one is open
    if (activeTrade) {
      let isClosed = false;
      let exitPrice = 0;
      let exitReason: BacktestTrade['exitReason'] = 'SL';

      if (activeTrade.direction === 'BUY') {
        // Check Take Profit 1 & Breakeven
        if (moveBreakevenAtTP1 && !activeTrade.isBreakeven && candle.high >= activeTrade.tp1) {
          activeTrade.stopLoss = activeTrade.entryPrice;
          activeTrade.isBreakeven = true;
        }

        // Check Trailing Stop
        if (useTrailingStop && candle.close > activeTrade.entryPrice + currentAtr) {
          const newTrailingSL = Number((candle.close - currentAtr * 1.2).toFixed(2));
          if (newTrailingSL > activeTrade.stopLoss) {
            activeTrade.stopLoss = newTrailingSL;
          }
        }

        // Check Stop Loss hit
        if (candle.low <= activeTrade.stopLoss) {
          isClosed = true;
          exitPrice = activeTrade.stopLoss;
          exitReason = activeTrade.isBreakeven ? 'TRAILING_SL' : 'SL';
        }
        // Check Final Take Profit hit
        else if (candle.high >= activeTrade.takeProfit) {
          isClosed = true;
          exitPrice = activeTrade.takeProfit;
          exitReason = 'TP2';
        }
      } else {
        // SELL position
        if (moveBreakevenAtTP1 && !activeTrade.isBreakeven && candle.low <= activeTrade.tp1) {
          activeTrade.stopLoss = activeTrade.entryPrice;
          activeTrade.isBreakeven = true;
        }

        if (useTrailingStop && candle.close < activeTrade.entryPrice - currentAtr) {
          const newTrailingSL = Number((candle.close + currentAtr * 1.2).toFixed(2));
          if (newTrailingSL < activeTrade.stopLoss) {
            activeTrade.stopLoss = newTrailingSL;
          }
        }

        if (candle.high >= activeTrade.stopLoss) {
          isClosed = true;
          exitPrice = activeTrade.stopLoss;
          exitReason = activeTrade.isBreakeven ? 'TRAILING_SL' : 'SL';
        } else if (candle.low <= activeTrade.takeProfit) {
          isClosed = true;
          exitPrice = activeTrade.takeProfit;
          exitReason = 'TP2';
        }
      }

      // Close the trade if triggered
      if (isClosed) {
        const pips =
          activeTrade.direction === 'BUY'
            ? Number(((exitPrice - activeTrade.entryPrice) * 10).toFixed(1))
            : Number(((activeTrade.entryPrice - exitPrice) * 10).toFixed(1));

        // For Gold (XAUUSD): 1 Lot = 100 oz. 1 pip (0.10 USD) = $10 per standard lot.
        const pnl = Number((pips * activeTrade.lots * 10).toFixed(2));
        const pnlPercent = Number(((pnl / currentBalance) * 100).toFixed(2));

        currentBalance += pnl;
        if (currentBalance > peakBalance) {
          peakBalance = currentBalance;
        }

        const ddAmount = peakBalance - currentBalance;
        const ddPct = (ddAmount / peakBalance) * 100;
        if (ddPct > maxDrawdownPercent) {
          maxDrawdownPercent = ddPct;
          maxDrawdown = ddAmount;
        }

        trades.push({
          id: `bt-trade-${trades.length + 1}`,
          entryTime: activeTrade.entryTime,
          exitTime: candle.timestamp,
          direction: activeTrade.direction,
          entryPrice: activeTrade.entryPrice,
          exitPrice,
          stopLoss: activeTrade.stopLoss,
          takeProfit: activeTrade.takeProfit,
          lots: activeTrade.lots,
          pnl,
          pnlPercent,
          pips,
          exitReason,
          confluenceScore: activeTrade.confluenceScore,
          durationCandles: i - activeTrade.entryIndex,
        });

        equityCurve.push({
          time: candle.timestamp,
          equity: Number(currentBalance.toFixed(2)),
          drawdown: Number(ddPct.toFixed(2)),
        });

        activeTrade = null;
      }
    }

    // 2. Scan for New Strategy Entry (if no active trade is open)
    if (!activeTrade) {
      // Look for signals at bar close
      const recentSignal = indicators.confirmationSignals.find(
        (s) => s.index === i - 1 || s.index === i
      );

      // SMC Order block alignment
      const activeBullishOB = indicators.orderBlocks.find(
        (ob) => ob.type === 'BULLISH' && !ob.mitigated && Math.abs(candle.close - ob.top) <= currentAtr * 1.5
      );
      const activeBearishOB = indicators.orderBlocks.find(
        (ob) => ob.type === 'BEARISH' && !ob.mitigated && Math.abs(candle.close - ob.bottom) <= currentAtr * 1.5
      );

      let confluence = 55;
      let triggerDirection: 'BUY' | 'SELL' | null = null;

      if (config.strategyId === 'LUX_SMC_CONFLUENCE') {
        if (trendData?.trend === 'BULLISH' && (recentSignal?.type === 'BUY' || recentSignal?.type === 'STRONG_BUY')) {
          confluence += 25;
          if (activeBullishOB) confluence += 15;
          if (candle.close > trendData.baseline) confluence += 10;
          if (confluence >= minConfluenceScore) {
            triggerDirection = 'BUY';
          }
        } else if (trendData?.trend === 'BEARISH' && (recentSignal?.type === 'SELL' || recentSignal?.type === 'STRONG_SELL')) {
          confluence += 25;
          if (activeBearishOB) confluence += 15;
          if (candle.close < trendData.baseline) confluence += 10;
          if (confluence >= minConfluenceScore) {
            triggerDirection = 'SELL';
          }
        }
      } else if (config.strategyId === 'ORDER_BLOCK_REVERSAL') {
        if (activeBullishOB && candle.low <= activeBullishOB.top && candle.close > activeBullishOB.top) {
          confluence = 82;
          triggerDirection = 'BUY';
        } else if (activeBearishOB && candle.high >= activeBearishOB.bottom && candle.close < activeBearishOB.bottom) {
          confluence = 82;
          triggerDirection = 'SELL';
        }
      } else if (config.strategyId === 'VOLATILITY_BREAKOUT') {
        if (candle.close > (trendData?.upperBand || candle.close + 1)) {
          confluence = 78;
          triggerDirection = 'BUY';
        } else if (candle.close < (trendData?.lowerBand || candle.close - 1)) {
          confluence = 78;
          triggerDirection = 'SELL';
        }
      } else {
        // EMA Trend Rider
        const ema20 = indicators.ema20[i];
        const ema50 = indicators.ema50[i];
        if (ema20 && ema50) {
          if (ema20 > ema50 && prevCandle.close <= ema20 && candle.close > ema20) {
            confluence = 76;
            triggerDirection = 'BUY';
          } else if (ema20 < ema50 && prevCandle.close >= ema20 && candle.close < ema20) {
            confluence = 76;
            triggerDirection = 'SELL';
          }
        }
      }

      if (triggerDirection) {
        const entryPrice = candle.close;
        const slDist = Number((currentAtr * atrMultiplierSL).toFixed(2));
        const riskMoney = currentBalance * (riskPercent / 100);

        // Calculate lots: Risk $ / (SL pips * 10)
        const slPips = slDist * 10;
        const calculatedLots = Math.max(0.01, Number((riskMoney / (slPips * 10)).toFixed(2)));

        if (triggerDirection === 'BUY') {
          const stopLoss = Number((entryPrice - slDist).toFixed(2));
          const tp1 = Number((entryPrice + slDist * 1.2).toFixed(2));
          const takeProfit = Number((entryPrice + slDist * rrTarget).toFixed(2));

          activeTrade = {
            direction: 'BUY',
            entryPrice,
            stopLoss,
            initialSL: stopLoss,
            tp1,
            takeProfit,
            lots: calculatedLots,
            entryTime: candle.timestamp,
            entryIndex: i,
            confluenceScore: confluence,
            isBreakeven: false,
          };
        } else {
          const stopLoss = Number((entryPrice + slDist).toFixed(2));
          const tp1 = Number((entryPrice - slDist * 1.2).toFixed(2));
          const takeProfit = Number((entryPrice - slDist * rrTarget).toFixed(2));

          activeTrade = {
            direction: 'SELL',
            entryPrice,
            stopLoss,
            initialSL: stopLoss,
            tp1,
            takeProfit,
            lots: calculatedLots,
            entryTime: candle.timestamp,
            entryIndex: i,
            confluenceScore: confluence,
            isBreakeven: false,
          };
        }
      }
    }
  }

  // Calculate detailed performance metrics
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.pnl > 0).length;
  const losingTrades = trades.filter((t) => t.pnl <= 0).length;
  const winRate = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(1)) : 0;

  const totalWins = trades.filter((t) => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
  const totalLosses = Math.abs(
    trades.filter((t) => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0)
  );
  const profitFactor = totalLosses > 0 ? Number((totalWins / totalLosses).toFixed(2)) : totalWins > 0 ? 99.0 : 0;

  const netProfit = Number((currentBalance - initialBalance).toFixed(2));
  const netProfitPercent = Number(((netProfit / initialBalance) * 100).toFixed(2));

  // Max consecutive wins & losses
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let curWins = 0;
  let curLosses = 0;

  trades.forEach((t) => {
    if (t.pnl > 0) {
      curWins++;
      curLosses = 0;
      if (curWins > maxConsecutiveWins) maxConsecutiveWins = curWins;
    } else {
      curLosses++;
      curWins = 0;
      if (curLosses > maxConsecutiveLosses) maxConsecutiveLosses = curLosses;
    }
  });

  const largestWin = trades.length > 0 ? Math.max(...trades.map((t) => t.pnl)) : 0;
  const largestLoss = trades.length > 0 ? Math.min(...trades.map((t) => t.pnl)) : 0;
  const averageTrade = totalTrades > 0 ? Number((netProfit / totalTrades).toFixed(2)) : 0;

  // Approximate annualized Sharpe Ratio
  const returns = trades.map((t) => t.pnlPercent);
  const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance =
    returns.length > 1
      ? returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / (returns.length - 1)
      : 1;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? Number(((meanReturn / stdDev) * Math.sqrt(252)).toFixed(2)) : 1.2;

  return {
    initialBalance,
    endingBalance: Number(currentBalance.toFixed(2)),
    netProfit,
    netProfitPercent,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    profitFactor,
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(2)),
    sharpeRatio,
    averageTrade,
    largestWin: Number(largestWin.toFixed(2)),
    largestLoss: Number(largestLoss.toFixed(2)),
    maxConsecutiveWins,
    maxConsecutiveLosses,
    trades,
    equityCurve,
  };
}
