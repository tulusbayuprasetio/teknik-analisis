import React, { useState } from 'react';
import { TradingSignal, BrokerConfig } from '../types/trading';
import { SignalCard } from './SignalCard';
import { Filter, Zap, CheckCircle2, ShieldAlert, Sparkles, Volume2 } from 'lucide-react';
import { soundEngine } from '../utils/audioAlerts';

interface SignalFeedProps {
  signals: TradingSignal[];
  broker: BrokerConfig;
  onExecuteSignal: (signal: TradingSignal) => void;
  onCopyPayload: (signal: TradingSignal) => void;
  currentPrice: number;
}

export const SignalFeed: React.FC<SignalFeedProps> = ({
  signals,
  broker,
  onExecuteSignal,
  onCopyPayload,
  currentPrice,
}) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'HIGH_PROB' | 'ACTIVE' | 'TARGET_HIT'>('HIGH_PROB');

  const filteredSignals = signals.filter((s) => {
    if (filterMode === 'HIGH_PROB') return s.confluenceScore >= 80;
    if (filterMode === 'ACTIVE') return s.status === 'ACTIVE' || s.status === 'TRIGGERED';
    if (filterMode === 'TARGET_HIT') return s.status.includes('TP');
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] rounded border border-[#1e2638] overflow-hidden">
      {/* Feed Header */}
      <div className="p-4 border-b border-[#1b2230] bg-[#0d121c] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Algorithmic Confluence Signal Feed
            </h2>
            <span className="text-[11px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800">
              Live Scanner
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Institutional signals generated via LuxAlgo confirmation, Smart Money order blocks, and session liquidity alignment.
          </p>
        </div>

        {/* Filter Controls (buttons adhering to zero-pill guidelines) */}
        <div className="flex items-center gap-1 bg-[#131924] p-1 rounded border border-[#1f2838]">
          <button
            onClick={() => setFilterMode('HIGH_PROB')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              filterMode === 'HIGH_PROB'
                ? 'bg-amber-400 text-black font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            A+ Confluence (≥80%)
          </button>
          <button
            onClick={() => setFilterMode('ACTIVE')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              filterMode === 'ACTIVE'
                ? 'bg-amber-400 text-black font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Active Setups
          </button>
          <button
            onClick={() => setFilterMode('TARGET_HIT')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              filterMode === 'TARGET_HIT'
                ? 'bg-amber-400 text-black font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Targets Reached
          </button>
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              filterMode === 'ALL'
                ? 'bg-amber-400 text-black font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Signals ({signals.length})
          </button>
        </div>
      </div>

      {/* Signals List / Empty State */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {filteredSignals.length > 0 ? (
          filteredSignals.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              broker={broker}
              onExecute={onExecuteSignal}
              onCopyPayload={onCopyPayload}
              currentPrice={currentPrice}
            />
          ))
        ) : (
          <div className="text-center py-16 px-4 bg-[#0d121c] border border-dashed border-[#1f293d] rounded">
            <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-300">
              No Signals Matching Confluence Filter
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              The algorithm filters out low-probability chop to protect your capital. Signals will appear automatically when high-confluence institutional criteria align.
            </p>
            <button
              onClick={() => setFilterMode('ALL')}
              className="mt-3 px-3 py-1 text-xs font-medium text-amber-400 hover:underline"
            >
              Show all scanned market setups
            </button>
          </div>
        )}
      </div>

      {/* Footer Info strip */}
      <div className="px-4 py-2 bg-[#0c1018] border-t border-[#1b2230] text-[11px] text-slate-500 flex items-center justify-between">
        <span>Confluence Weight: LuxAlgo 25% · SMC OB 20% · Trend Ribbon 20% · Structure 15% · Session 10% · RSI 10%</span>
        <button
          onClick={() => soundEngine.playBullishSignal()}
          className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
        >
          <Volume2 className="w-3 h-3" /> Test Chime Alert
        </button>
      </div>
    </div>
  );
};
