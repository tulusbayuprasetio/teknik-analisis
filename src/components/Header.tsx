import React from 'react';
import { Volume2, VolumeX, Shield, Bot, ArrowUpRight, ArrowDownRight, Layers, Sliders } from 'lucide-react';
import { BrokerConfig, Timeframe } from '../types/trading';
import { soundEngine } from '../utils/audioAlerts';

interface HeaderProps {
  currentPrice: number;
  priceChange: number;
  spreadPips: number;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  activeTab: 'terminal' | 'signals' | 'backtest' | 'broker';
  setActiveTab: (tab: 'terminal' | 'signals' | 'backtest' | 'broker') => void;
  broker: BrokerConfig;
  onToggleAutoExecute: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenOrderModal: () => void;
  highProbabilityCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentPrice,
  priceChange,
  spreadPips,
  timeframe,
  onTimeframeChange,
  activeTab,
  setActiveTab,
  broker,
  onToggleAutoExecute,
  isMuted,
  onToggleMute,
  onOpenOrderModal,
  highProbabilityCount,
}) => {
  const isPositive = priceChange >= 0;

  return (
    <header className="border-b border-[#1e2638] bg-[#0d111a] px-4 lg:px-6 py-2.5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Zone 1: Wordmark & Live XAUUSD Ticker */}
        <div className="flex items-center gap-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-bold text-black text-sm shadow-sm shadow-amber-500/20">
              Au
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white font-sans">
                  AuraGold
                </span>
                <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#1c2333] text-amber-400 border border-[#2d3748]">
                  XAU/USD
                </span>
              </div>
            </div>
          </div>

          {/* Clean live price quote with tabular figures */}
          <div className="hidden sm:flex items-baseline gap-2.5 pl-3 border-l border-[#222c3d]">
            <span className="text-lg font-mono font-bold tracking-tight tabular-nums text-white">
              ${currentPrice.toFixed(2)}
            </span>
            <span
              className={`text-xs font-mono font-medium flex items-center gap-0.5 tabular-nums ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {isPositive ? '+' : ''}
              {priceChange.toFixed(2)}%
            </span>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              Spread {spreadPips} pips
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Clean single-line text links) */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'terminal'
                ? 'bg-[#1e2738] text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-[#161c28]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Live Terminal
          </button>

          <button
            onClick={() => setActiveTab('signals')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'signals'
                ? 'bg-[#1e2738] text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-[#161c28]'
            }`}
          >
            Confluence Signals
            {highProbabilityCount > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono rounded-sm">
                {highProbabilityCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('backtest')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'backtest'
                ? 'bg-[#1e2738] text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-[#161c28]'
            }`}
          >
            Strategy Backtesting
          </button>

          <button
            onClick={() => setActiveTab('broker')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'broker'
                ? 'bg-[#1e2738] text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-[#161c28]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Broker & Risk
          </button>
        </nav>

        {/* Zone 3: Interactive Controls & Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Audio Chime Mute Toggle */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Audio Alerts' : 'Mute Audio Alerts'}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1c2333] rounded transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Auto-Pilot Bot Toggle */}
          <button
            onClick={onToggleAutoExecute}
            title={broker.autoExecute ? 'Auto-Pilot Execution is ACTIVE' : 'Auto-Pilot Execution is PAUSED'}
            className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors border ${
              broker.autoExecute
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/60'
                : 'bg-[#161c28] text-slate-400 border-[#263147] hover:text-white'
            }`}
          >
            <Bot className={`w-3.5 h-3.5 ${broker.autoExecute ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="whitespace-nowrap">Bot {broker.autoExecute ? 'Active' : 'Standby'}</span>
          </button>

          {/* 1-Click Order Execution Button */}
          <button
            onClick={onOpenOrderModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 active:bg-amber-500 rounded transition-colors whitespace-nowrap shadow-sm shadow-amber-500/20"
          >
            Order Desk
          </button>
        </div>

      </div>
    </header>
  );
};
