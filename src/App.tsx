import React, { useState, useEffect, useRef } from 'react';
import {
  Candle,
  Timeframe,
  LuxAlgoIndicatorData,
  TradingSignal,
  BrokerConfig,
  LivePosition,
} from './types/trading';
import {
  generateHistoricalCandles,
  simulateNextTick,
  fetchLiveGoldPrice,
} from './utils/marketData';
import {
  calculateLuxAlgoIndicators,
  generateConfluenceSignal,
} from './utils/indicators';
import { soundEngine } from './utils/audioAlerts';
import {
  calculateDynamicLotSize,
  validateRiskSafeguards,
  executeBrokerOrder,
  generateBrokerWebhookPayload,
} from './utils/brokerBridge';

import { Header } from './components/Header';
import { SessionBar } from './components/SessionBar';
import { TradingChart } from './components/TradingChart';
import { SignalFeed } from './components/SignalFeed';
import { BacktestPanel } from './components/BacktestPanel';
import { BrokerPanel } from './components/BrokerPanel';
import { ManualOrderModal } from './components/ManualOrderModal';

import {
  Sparkles,
  TrendingUp,
  Layers,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export default function App() {
  const [timeframe, setTimeframe] = useState<Timeframe>('M15');
  const [activeTab, setActiveTab] = useState<'terminal' | 'signals' | 'backtest' | 'broker'>('terminal');
  const [isMuted, setIsMuted] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Notifications toast
  const [toastMessage, setToastMessage] = useState<{
    id: number;
    title: string;
    desc: string;
    type: 'success' | 'alert' | 'info';
  } | null>(null);

  // Candles & Market State
  const [candles, setCandles] = useState<Candle[]>(() =>
    generateHistoricalCandles(160, 'M15')
  );

  const [currentBid, setCurrentBid] = useState<number>(2685.20);
  const [currentAsk, setCurrentAsk] = useState<number>(2685.42);
  const [spreadPips, setSpreadPips] = useState<number>(22.0);

  // Indicators State
  const [indicators, setIndicators] = useState<LuxAlgoIndicatorData>(() =>
    calculateLuxAlgoIndicators(candles)
  );

  // Broker Configuration
  const [broker, setBroker] = useState<BrokerConfig>({
    platform: 'MT4_MT5',
    connected: true,
    accountNumber: 'MT5-9048124',
    balance: 10000.0,
    equity: 10000.0,
    leverage: 100,
    serverName: 'MetaQuotes-Real',
    webhookUrl: '',
    secretToken: 'AURAGOLD_EA_SECRET_KEY_8899',
    apiKey: '',
    apiSecret: '',
    isTestnet: false,
    autoExecute: true, // Enabled by default for automated responsiveness
    riskPerTradePercent: 1.0,
    maxDailyDrawdownPercent: 4.0,
    maxConcurrentTrades: 2,
    maxSpreadPips: 30,
    autoBreakeven: true,
    partialTakeProfit: true,
    dailyLossSoFar: 0.0,
    isKillSwitchActive: false,
  });

  // Active Open Positions
  const [positions, setPositions] = useState<LivePosition[]>([]);

  // Generated Signals List
  const [signals, setSignals] = useState<TradingSignal[]>(() => {
    // Generate initial verified signals from historical structure
    const initialList: TradingSignal[] = [];
    const lastPrice = candles[candles.length - 1].close;

    // Seed realistic active high-probability setup
    initialList.push({
      id: `sig-init-1`,
      timestamp: Date.now() - 15 * 60 * 1000,
      symbol: 'XAUUSD',
      timeframe: 'M15',
      direction: 'STRONG_BUY',
      entryPrice: Number((lastPrice - 1.2).toFixed(2)),
      stopLoss: Number((lastPrice - 6.5).toFixed(2)),
      tp1: Number((lastPrice + 7.8).toFixed(2)),
      tp2: Number((lastPrice + 13.5).toFixed(2)),
      tp3: Number((lastPrice + 22.0).toFixed(2)),
      riskReward: 2.55,
      confluenceScore: 92,
      isHighProbability: true,
      reasons: [
        'LuxAlgo Strong Buy Confirmation validated at candle close',
        'Bullish Order Block demand retest ($2678.50 - $2681.20)',
        'Market Structure Break (BOS) upside continuation',
        'London / New York Session Overlap peak liquidity window',
      ],
      status: 'ACTIVE',
      pipsRisk: 53.0,
      pipsReward: 147.0,
      session: 'LONDON_NY_OVERLAP',
    });

    initialList.push({
      id: `sig-init-2`,
      timestamp: Date.now() - 90 * 60 * 1000,
      symbol: 'XAUUSD',
      timeframe: 'M15',
      direction: 'BUY',
      entryPrice: Number((lastPrice - 8.4).toFixed(2)),
      stopLoss: Number((lastPrice - 13.8).toFixed(2)),
      tp1: Number((lastPrice - 2.5).toFixed(2)),
      tp2: Number((lastPrice + 4.2).toFixed(2)),
      tp3: Number((lastPrice + 12.0).toFixed(2)),
      riskReward: 2.33,
      confluenceScore: 86,
      isHighProbability: true,
      reasons: [
        'Fair Value Gap (FVG) discount rebalance',
        'LuxAlgo Dynamic Trend Ribbon Bullish baseline support',
        'RSI momentum bounce above 50.0 level',
      ],
      status: 'TP1_HIT',
      pipsRisk: 54.0,
      pipsReward: 126.0,
      session: 'LONDON',
    });

    return initialList;
  });

  const latestCandle = candles[candles.length - 1];
  const currentPrice = latestCandle?.close || 2685.40;
  const prevClose = candles[candles.length - 2]?.close || currentPrice;
  const priceChange = ((currentPrice - prevClose) / prevClose) * 100;

  // Handle timeframe change
  const handleTimeframeChange = (newTf: Timeframe) => {
    setTimeframe(newTf);
    const newCandles = generateHistoricalCandles(160, newTf);
    setCandles(newCandles);
    const newInd = calculateLuxAlgoIndicators(newCandles);
    setIndicators(newInd);
  };

  // Show Toast Helper
  const triggerToast = (title: string, desc: string, type: 'success' | 'alert' | 'info' = 'info') => {
    setToastMessage({ id: Date.now(), title, desc, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Real-time Tick Loop & Candle Update
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setCandles((prevCandles) => {
        if (prevCandles.length === 0) return prevCandles;

        const last = prevCandles[prevCandles.length - 1];
        const tick = simulateNextTick(last, timeframe);

        setCurrentBid(tick.bid);
        setCurrentAsk(tick.ask);
        setSpreadPips(tick.spreadPips);

        let nextCandles: Candle[];
        if (tick.isNewCandle) {
          nextCandles = [...prevCandles.slice(1), tick.updatedCandle];
        } else {
          nextCandles = [...prevCandles.slice(0, -1), tick.updatedCandle];
        }

        // Recalculate indicators
        const updatedIndicators = calculateLuxAlgoIndicators(nextCandles);
        setIndicators(updatedIndicators);

        // Check for new High Probability Confluence Signal
        const newSig = generateConfluenceSignal(nextCandles, updatedIndicators, timeframe);
        if (newSig) {
          setSignals((prevSignals) => {
            const alreadyExists = prevSignals.some((s) => s.id === newSig.id);
            if (!alreadyExists) {
              if (newSig.direction.includes('BUY')) {
                soundEngine.playBullishSignal();
              } else {
                soundEngine.playBearishSignal();
              }
              triggerToast(
                `A+ Confluence Signal: ${newSig.direction}`,
                `${newSig.confluenceScore}% Confluence @ $${newSig.entryPrice} with 1:${newSig.riskReward} R:R`,
                'success'
              );

              // Auto-Execution Bot check
              if (broker.autoExecute && !broker.isKillSwitchActive) {
                const riskCheck = validateRiskSafeguards(broker, tick.spreadPips, positions.length, newSig);
                if (riskCheck.allowed) {
                  const lotCalc = calculateDynamicLotSize(
                    broker.balance,
                    broker.riskPerTradePercent,
                    newSig.entryPrice,
                    newSig.stopLoss
                  );

                  const autoPos: LivePosition = {
                    id: `auto-pos-${Date.now()}`,
                    ticket: `BOT-${Math.floor(100000 + Math.random() * 900000)}`,
                    symbol: 'XAUUSD',
                    direction: newSig.direction.includes('BUY') ? 'BUY' : 'SELL',
                    lots: lotCalc.lots,
                    entryPrice: newSig.entryPrice,
                    currentPrice: newSig.entryPrice,
                    sl: newSig.stopLoss,
                    tp: newSig.tp2,
                    pnl: 0,
                    pips: 0,
                    openTime: Date.now(),
                    isBreakeven: false,
                    status: 'OPEN',
                  };

                  setPositions((p) => [...p, autoPos]);
                  soundEngine.playOrderExecuted();
                  triggerToast(
                    `Bot Executed ${autoPos.direction} ${autoPos.lots} Lots`,
                    `Automatic entry filled @ $${autoPos.entryPrice} on ${broker.platform}`,
                    'info'
                  );
                }
              }

              return [newSig, ...prevSignals.slice(0, 19)];
            }
            return prevSignals;
          });
        }

        return nextCandles;
      });

      // Update Live Positions floating PnL & Check TP/SL
      setPositions((prevPositions) => {
        if (prevPositions.length === 0) return prevPositions;

        return prevPositions
          .map((pos) => {
            const currentP = currentAsk;
            const pips =
              pos.direction === 'BUY'
                ? Number(((currentP - pos.entryPrice) * 10).toFixed(1))
                : Number(((pos.entryPrice - currentP) * 10).toFixed(1));

            // Gold: 1 lot = $10 per pip
            const pnl = Number((pips * pos.lots * 10).toFixed(2));

            // Check Auto-Breakeven trigger
            let isBreakeven = pos.isBreakeven;
            let currentSL = pos.sl;
            if (broker.autoBreakeven && !isBreakeven && pips >= 35) {
              isBreakeven = true;
              currentSL = pos.entryPrice;
              triggerToast('SL Moved to Breakeven', `${pos.ticket} now risk-free at entry $${pos.entryPrice}`, 'info');
            }

            // Check Take Profit hit
            const isTpHit =
              pos.direction === 'BUY' ? currentP >= pos.tp : currentP <= pos.tp;
            if (isTpHit) {
              soundEngine.playBullishSignal();
              triggerToast('Take Profit Hit! 🎉', `Closed ${pos.ticket} with +$${pnl} profit`, 'success');
              setBroker((b) => ({
                ...b,
                balance: Number((b.balance + pnl).toFixed(2)),
                equity: Number((b.equity + pnl).toFixed(2)),
              }));
              return null; // remove closed position
            }

            // Check Stop Loss hit
            const isSlHit =
              pos.direction === 'BUY' ? currentP <= currentSL : currentP >= currentSL;
            if (isSlHit) {
              soundEngine.playRiskWarning();
              triggerToast('Stop Loss Hit', `Closed ${pos.ticket} with -$${Math.abs(pnl)} loss`, 'alert');
              setBroker((b) => {
                const loss = Math.abs(pnl);
                const newDailyLoss = b.dailyLossSoFar + loss;
                const maxAllowedLoss = (b.balance * b.maxDailyDrawdownPercent) / 100;
                const killSwitch = newDailyLoss >= maxAllowedLoss;
                return {
                  ...b,
                  balance: Number((b.balance + pnl).toFixed(2)),
                  equity: Number((b.equity + pnl).toFixed(2)),
                  dailyLossSoFar: Number(newDailyLoss.toFixed(2)),
                  isKillSwitchActive: killSwitch,
                };
              });
              return null;
            }

            return {
              ...pos,
              currentPrice: currentP,
              pips,
              pnl,
              sl: currentSL,
              isBreakeven,
            };
          })
          .filter((p): p is LivePosition => p !== null);
      });
    }, 1100);

    return () => clearInterval(tickInterval);
  }, [timeframe, currentAsk, broker, positions.length]);

  // Execute manual or signal order
  const handleExecuteSignal = async (sig: TradingSignal) => {
    const lotCalc = calculateDynamicLotSize(
      broker.balance,
      broker.riskPerTradePercent,
      sig.entryPrice,
      sig.stopLoss
    );

    const riskCheck = validateRiskSafeguards(broker, spreadPips, positions.length, sig);
    if (!riskCheck.allowed) {
      triggerToast('Risk Rule Alert', riskCheck.reason || 'Execution rejected by risk guard.', 'alert');
      soundEngine.playRiskWarning();
      return;
    }

    const res = await executeBrokerOrder(broker, sig, lotCalc.lots);

    const newPos: LivePosition = {
      id: `pos-${Date.now()}`,
      ticket: res.ticket,
      symbol: 'XAUUSD',
      direction: sig.direction.includes('BUY') ? 'BUY' : 'SELL',
      lots: lotCalc.lots,
      entryPrice: sig.entryPrice,
      currentPrice: sig.entryPrice,
      sl: sig.stopLoss,
      tp: sig.tp2,
      pnl: 0,
      pips: 0,
      openTime: Date.now(),
      isBreakeven: false,
      status: 'OPEN',
    };

    setPositions((prev) => [...prev, newPos]);
    soundEngine.playOrderExecuted();
    triggerToast(
      `Order Transmitted: ${sig.direction}`,
      `Filled ${lotCalc.lots} Lots @ $${sig.entryPrice} with SL: $${sig.stopLoss}`,
      'success'
    );
  };

  const handleCopyPayload = (sig: TradingSignal) => {
    const lotCalc = calculateDynamicLotSize(
      broker.balance,
      broker.riskPerTradePercent,
      sig.entryPrice,
      sig.stopLoss
    );
    const payload = generateBrokerWebhookPayload(broker, sig, lotCalc.lots);
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    triggerToast('EA Payload Copied', 'Paste into your MT4/MT5 webhook listener or Postman', 'info');
  };

  const handleClosePosition = (id: string) => {
    const pos = positions.find((p) => p.id === id);
    if (!pos) return;

    setBroker((b) => ({
      ...b,
      balance: Number((b.balance + pos.pnl).toFixed(2)),
      equity: Number((b.equity + pos.pnl).toFixed(2)),
    }));

    setPositions((prev) => prev.filter((p) => p.id !== id));
    soundEngine.playOrderExecuted();
    triggerToast('Position Closed', `Realized PnL: ${pos.pnl >= 0 ? '+' : ''}$${pos.pnl}`, 'info');
  };

  const handleMoveBreakeven = (id: string) => {
    setPositions((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            sl: p.entryPrice,
            isBreakeven: true,
          };
        }
        return p;
      })
    );
    soundEngine.playOrderExecuted();
    triggerToast('SL Moved to Breakeven', 'Position is now risk-neutral (SL @ entry)', 'success');
  };

  const highProbabilityCount = signals.filter((s) => s.confluenceScore >= 80).length;

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0e14] text-slate-100 font-sans">
      
      {/* 1. Header with Top Bar Contract */}
      <Header
        currentPrice={currentPrice}
        priceChange={priceChange}
        spreadPips={spreadPips}
        timeframe={timeframe}
        onTimeframeChange={handleTimeframeChange}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        broker={broker}
        onToggleAutoExecute={() => {
          setBroker((b) => {
            const nextState = !b.autoExecute;
            triggerToast(
              nextState ? 'Auto-Bot Activated' : 'Auto-Bot Paused',
              nextState ? 'Orders will execute on A+ confluence signals' : 'Manual execution only',
              'info'
            );
            return { ...b, autoExecute: nextState };
          });
        }}
        isMuted={isMuted}
        onToggleMute={() => {
          const nextMute = !isMuted;
          setIsMuted(nextMute);
          soundEngine.setMuted(nextMute);
        }}
        onOpenOrderModal={() => setIsOrderModalOpen(true)}
        highProbabilityCount={highProbabilityCount}
      />

      {/* 2. Market Session Bar (Asian / London / New York / Overlap Volatility) */}
      <SessionBar />

      {/* 3. Main Workspace Content */}
      <main className="flex-1 p-3 lg:p-4 max-w-[1720px] w-full mx-auto">
        
        {/* VIEW 1: LIVE TERMINAL */}
        {activeTab === 'terminal' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 h-[calc(100vh-140px)] min-h-[640px]">
            {/* Chart View (8 cols) */}
            <div className="lg:col-span-8 flex flex-col h-full">
              <TradingChart
                candles={candles}
                indicators={indicators}
                timeframe={timeframe}
                onTimeframeChange={handleTimeframeChange}
                currentBid={currentBid}
                currentAsk={currentAsk}
                spreadPips={spreadPips}
              />
            </div>

            {/* Right Side: High Confluence Signal Feed & Risk Snapshot (4 cols) */}
            <div className="lg:col-span-4 flex flex-col h-full gap-3">
              <div className="flex-1 overflow-hidden">
                <SignalFeed
                  signals={signals}
                  broker={broker}
                  onExecuteSignal={handleExecuteSignal}
                  onCopyPayload={handleCopyPayload}
                  currentPrice={currentPrice}
                />
              </div>

              {/* Quick Position & Safeguard Monitor */}
              <div className="bg-[#0f1420] border border-[#1e2638] rounded p-3 text-xs font-mono">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 font-bold font-sans flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    Open Exposure ({positions.length}/{broker.maxConcurrentTrades})
                  </span>
                  <span className="text-slate-400">
                    Equity: <strong className="text-white">${broker.balance.toLocaleString()}</strong>
                  </span>
                </div>

                {positions.length > 0 ? (
                  <div className="space-y-1.5">
                    {positions.map((p) => (
                      <div key={p.id} className="flex items-center justify-between bg-[#151c2a] p-2 rounded tabular-nums">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1 py-0.2 rounded text-[10px] font-bold ${p.direction === 'BUY' ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'}`}>
                            {p.direction}
                          </span>
                          <span className="text-slate-300">{p.lots} Lots @ ${p.entryPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${p.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleClosePosition(p.id)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 text-center py-2 text-[11px]">
                    No active market exposure. Bot scanning for A+ confluences.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CONFLUENCE SIGNALS FEED */}
        {activeTab === 'signals' && (
          <div className="h-[calc(100vh-140px)] min-h-[640px]">
            <SignalFeed
              signals={signals}
              broker={broker}
              onExecuteSignal={handleExecuteSignal}
              onCopyPayload={handleCopyPayload}
              currentPrice={currentPrice}
            />
          </div>
        )}

        {/* VIEW 3: STRATEGY BACKTESTING */}
        {activeTab === 'backtest' && (
          <div className="h-[calc(100vh-140px)] min-h-[640px]">
            <BacktestPanel candles={candles} />
          </div>
        )}

        {/* VIEW 4: BROKER API & RISK CONTROLS */}
        {activeTab === 'broker' && (
          <div className="h-[calc(100vh-140px)] min-h-[640px]">
            <BrokerPanel
              broker={broker}
              onUpdateBroker={setBroker}
              positions={positions}
              onClosePosition={handleClosePosition}
              onMoveBreakeven={handleMoveBreakeven}
              currentPrice={currentPrice}
            />
          </div>
        )}

      </main>

      {/* Manual Order Modal */}
      <ManualOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        currentPrice={currentPrice}
        spreadPips={spreadPips}
        broker={broker}
        onExecuteOrder={(newPos) => {
          setPositions((prev) => [...prev, newPos]);
          triggerToast('Manual Order Filled', `${newPos.direction} ${newPos.lots} Lots @ $${newPos.entryPrice}`, 'success');
        }}
        openPositionsCount={positions.length}
      />

      {/* Floating Real-Time Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#121826] border border-[#232f47] p-3.5 rounded shadow-2xl flex items-start gap-3 max-w-sm animate-in slide-in-from-bottom duration-200">
          <div className="mt-0.5">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : toastMessage.type === 'alert' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-white font-sans">{toastMessage.title}</h4>
            <p className="text-xs text-slate-300 mt-0.5">{toastMessage.desc}</p>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-500 hover:text-white text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}
