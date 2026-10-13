import React from 'react';
import {
  TradingSignal,
  BrokerConfig,
} from '../types/trading';
import {
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Send,
  Zap,
  Target,
  Percent,
} from 'lucide-react';
import { calculateDynamicLotSize } from '../utils/brokerBridge';

interface SignalCardProps {
  signal: TradingSignal;
  broker: BrokerConfig;
  onExecute: (signal: TradingSignal) => void;
  onCopyPayload: (signal: TradingSignal) => void;
  currentPrice: number;
}

export const SignalCard: React.FC<SignalCardProps> = ({
  signal,
  broker,
  onExecute,
  onCopyPayload,
  currentPrice,
}) => {
  const isBuy = signal.direction.includes('BUY');
  const lotCalc = calculateDynamicLotSize(
    broker.balance,
    broker.riskPerTradePercent,
    signal.entryPrice,
    signal.stopLoss
  );

  // Status badge styling
  const statusStyles: Record<TradingSignal['status'], { text: string; bg: string }> = {
    ACTIVE: { text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
    TRIGGERED: { text: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' },
    TP1_HIT: { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
    TP2_HIT: { text: 'text-emerald-300 font-bold', bg: 'bg-emerald-500/20 border-emerald-500/40' },
    TP3_HIT: { text: 'text-emerald-200 font-bold', bg: 'bg-emerald-500/30 border-emerald-500/50' },
    STOPPED_OUT: { text: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
    CANCELLED: { text: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30' },
  };

  const statusInfo = statusStyles[signal.status] || statusStyles.ACTIVE;

  return (
    <div className="bg-[#111622] border border-[#1e2638] rounded p-4 flex flex-col justify-between transition-all hover:border-[#2d3a54]">
      {/* Top Row: Direction, Timeframe, Confluence Score */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded border ${
                isBuy
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                  : 'bg-rose-950/60 text-rose-400 border-rose-800'
              }`}
            >
              {isBuy ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {signal.direction}
            </span>

            <span className="text-xs font-mono text-slate-400">
              {signal.timeframe} · {signal.session.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Confluence Rating Tag */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-400">Confluence:</span>
            <span
              className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                signal.confluenceScore >= 85
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'bg-sky-400/20 text-sky-300 border border-sky-400/40'
              }`}
            >
              {signal.confluenceScore}% {signal.confluenceScore >= 85 ? 'A+ High-Prob' : 'Valid'}
            </span>
          </div>
        </div>

        {/* Pricing Metrics Grid */}
        <div className="grid grid-cols-4 gap-2 bg-[#0c1018] border border-[#1a2233] p-2.5 rounded font-mono text-xs tabular-nums mb-3">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Entry</div>
            <div className="font-semibold text-white mt-0.5">${signal.entryPrice.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[10px] text-rose-400 uppercase tracking-wider">Stop Loss</div>
            <div className="font-semibold text-rose-400 mt-0.5">${signal.stopLoss.toFixed(2)}</div>
            <div className="text-[10px] text-slate-500">-{signal.pipsRisk} pips</div>
          </div>
          <div>
            <div className="text-[10px] text-emerald-400 uppercase tracking-wider">Take Profit 1</div>
            <div className="font-semibold text-emerald-400 mt-0.5">${signal.tp1.toFixed(2)}</div>
            <div className="text-[10px] text-slate-500">1:1.5 RR</div>
          </div>
          <div>
            <div className="text-[10px] text-emerald-300 uppercase tracking-wider">TP 2 Target</div>
            <div className="font-semibold text-emerald-300 mt-0.5">${signal.tp2.toFixed(2)}</div>
            <div className="text-[10px] text-emerald-500">+{signal.pipsReward} pips</div>
          </div>
        </div>

        {/* Confluence Checklist Reasons */}
        <div className="mb-3">
          <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            <span>High-Probability Confluence Factors:</span>
          </div>
          <ul className="space-y-1 text-xs text-slate-300">
            {signal.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-amber-400 mt-0.5 font-mono text-[10px]">▶</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="pt-2 border-t border-[#1a2233] flex items-center justify-between gap-3 text-xs">
        <div className="text-[11px] font-mono text-slate-400">
          Auto Risk: <strong className="text-amber-400">{lotCalc.lots} Lots</strong> (${lotCalc.riskAmountUsd} @ {broker.riskPerTradePercent}%)
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onCopyPayload(signal)}
            title="Copy Webhook EA JSON"
            className="p-1.5 text-slate-400 hover:text-white bg-[#151c29] border border-[#222c3d] rounded transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onExecute(signal)}
            className={`px-3 py-1.5 rounded font-semibold text-xs flex items-center gap-1.5 transition-all ${
              isBuy
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-xs shadow-emerald-500/20'
                : 'bg-rose-500 hover:bg-rose-400 text-white shadow-xs shadow-rose-500/20'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Execute {signal.direction.includes('BUY') ? 'Buy' : 'Sell'}
          </button>
        </div>
      </div>
    </div>
  );
};
