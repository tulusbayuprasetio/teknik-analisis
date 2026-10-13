import React, { useState } from 'react';
import { BrokerConfig, LivePosition } from '../types/trading';
import { X, ArrowUpRight, ArrowDownRight, ShieldCheck, Zap } from 'lucide-react';
import { calculateDynamicLotSize, validateRiskSafeguards } from '../utils/brokerBridge';
import { soundEngine } from '../utils/audioAlerts';

interface ManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrice: number;
  spreadPips: number;
  broker: BrokerConfig;
  onExecuteOrder: (pos: LivePosition) => void;
  openPositionsCount: number;
}

export const ManualOrderModal: React.FC<ManualOrderModalProps> = ({
  isOpen,
  onClose,
  currentPrice,
  spreadPips,
  broker,
  onExecuteOrder,
  openPositionsCount,
}) => {
  if (!isOpen) return null;

  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [slPipsInput, setSlPipsInput] = useState<number>(45);
  const [tpPipsInput, setTpPipsInput] = useState<number>(110);
  const [customLots, setCustomLots] = useState<number | null>(null);

  const slPrice = orderType === 'BUY'
    ? Number((currentPrice - slPipsInput / 10).toFixed(2))
    : Number((currentPrice + slPipsInput / 10).toFixed(2));

  const tpPrice = orderType === 'BUY'
    ? Number((currentPrice + tpPipsInput / 10).toFixed(2))
    : Number((currentPrice - tpPipsInput / 10).toFixed(2));

  const autoCalc = calculateDynamicLotSize(
    broker.balance,
    broker.riskPerTradePercent,
    currentPrice,
    slPrice
  );

  const activeLots = customLots ?? autoCalc.lots;
  const potentialLoss = Number((activeLots * slPipsInput * 10).toFixed(2));
  const potentialWin = Number((activeLots * tpPipsInput * 10).toFixed(2));
  const rrRatio = Number((tpPipsInput / slPipsInput).toFixed(2));

  const handleExecute = () => {
    // Validate risk
    if (broker.isKillSwitchActive) {
      alert('Cannot place order: Max Daily Drawdown Kill-Switch is active!');
      return;
    }
    if (openPositionsCount >= broker.maxConcurrentTrades) {
      alert(`Max open positions reached (${broker.maxConcurrentTrades}).`);
      return;
    }
    if (spreadPips > broker.maxSpreadPips) {
      alert(`Spread is too high (${spreadPips} pips > ${broker.maxSpreadPips} pips limit).`);
      return;
    }

    const newPosition: LivePosition = {
      id: `pos-${Date.now()}`,
      ticket: `TKT-${Math.floor(100000 + Math.random() * 900000)}`,
      symbol: 'XAUUSD',
      direction: orderType,
      lots: activeLots,
      entryPrice: currentPrice,
      currentPrice,
      sl: slPrice,
      tp: tpPrice,
      pnl: 0,
      pips: 0,
      openTime: Date.now(),
      isBreakeven: false,
      status: 'OPEN',
    };

    onExecuteOrder(newPosition);
    soundEngine.playOrderExecuted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-[#0f1420] border border-[#222d42] rounded-lg max-w-md w-full p-5 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1c2436] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
              Au
            </div>
            <h3 className="text-sm font-bold text-white font-sans">
              Instant Order Desk · XAU/USD
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#1a2233]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Direction Switcher (Buy / Sell) */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setOrderType('BUY')}
            className={`py-2 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-all border ${
              orderType === 'BUY'
                ? 'bg-emerald-500 text-black border-emerald-400 shadow-sm shadow-emerald-500/20'
                : 'bg-[#151c2a] border-[#222c3d] text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            Market BUY @ ${currentPrice.toFixed(2)}
          </button>

          <button
            onClick={() => setOrderType('SELL')}
            className={`py-2 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-all border ${
              orderType === 'SELL'
                ? 'bg-rose-500 text-white border-rose-400 shadow-sm shadow-rose-500/20'
                : 'bg-[#151c2a] border-[#222c3d] text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            Market SELL @ ${currentPrice.toFixed(2)}
          </button>
        </div>

        {/* Pricing & Stop Levels Configuration */}
        <div className="space-y-3 text-xs mb-4">
          
          {/* SL & TP Pips */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#141b27] border border-[#222c3d] p-2.5 rounded">
              <label className="text-[11px] text-rose-400 font-semibold block mb-1">
                Stop Loss (Pips)
              </label>
              <input
                type="number"
                value={slPipsInput}
                onChange={(e) => setSlPipsInput(Math.max(10, Number(e.target.value)))}
                className="w-full bg-[#0d121c] border border-[#2b374c] rounded px-2 py-1 text-rose-400 font-mono font-bold text-xs outline-none focus:border-rose-400"
              />
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                Target SL Price: ${slPrice}
              </div>
            </div>

            <div className="bg-[#141b27] border border-[#222c3d] p-2.5 rounded">
              <label className="text-[11px] text-emerald-400 font-semibold block mb-1">
                Take Profit (Pips)
              </label>
              <input
                type="number"
                value={tpPipsInput}
                onChange={(e) => setTpPipsInput(Math.max(10, Number(e.target.value)))}
                className="w-full bg-[#0d121c] border border-[#2b374c] rounded px-2 py-1 text-emerald-400 font-mono font-bold text-xs outline-none focus:border-emerald-400"
              />
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                Target TP Price: ${tpPrice}
              </div>
            </div>
          </div>

          {/* Lot Size Calculation */}
          <div className="bg-[#141b27] border border-[#222c3d] p-2.5 rounded font-mono">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 font-sans text-xs">Risk-Calculated Volume</span>
              <span className="text-amber-400 font-bold">{activeLots} Lots</span>
            </div>
            <div className="text-[11px] text-slate-400 mb-2">
              Equity: ${broker.balance.toLocaleString()} · Risk: {broker.riskPerTradePercent}% (${autoCalc.riskAmountUsd})
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="20"
                value={activeLots}
                onChange={(e) => setCustomLots(Math.max(0.01, Number(e.target.value)))}
                className="flex-1 bg-[#0d121c] border border-[#2b374c] rounded px-2 py-1 text-slate-200 text-xs outline-none focus:border-amber-400"
              />
              <button
                onClick={() => setCustomLots(null)}
                className="text-[11px] font-sans px-2.5 py-1 rounded bg-[#20293b] text-slate-300 hover:text-white"
              >
                Auto Size
              </button>
            </div>
          </div>

          {/* Trade Risk Summary Card */}
          <div className="bg-[#0b0e14] border border-[#1a2333] p-2.5 rounded font-mono text-xs tabular-nums space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Risk-to-Reward Ratio:</span>
              <span className="text-slate-200 font-bold">1:{rrRatio}</span>
            </div>
            <div className="flex justify-between text-rose-400">
              <span>Max Loss at SL:</span>
              <span>-${potentialLoss} USD</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>Potential Profit at TP:</span>
              <span>+${potentialWin} USD</span>
            </div>
          </div>

        </div>

        {/* Execution Button */}
        <button
          onClick={handleExecute}
          className={`w-full py-2.5 rounded font-bold text-xs tracking-wider transition-all uppercase ${
            orderType === 'BUY'
              ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/25'
              : 'bg-rose-500 hover:bg-rose-400 text-white shadow-md shadow-rose-500/25'
          }`}
        >
          Confirm & Execute {orderType} ({activeLots} Lots)
        </button>

      </div>
    </div>
  );
};
