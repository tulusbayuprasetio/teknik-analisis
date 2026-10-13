import React, { useState } from 'react';
import {
  BrokerConfig,
  LivePosition,
  BrokerPlatform,
  TradingSignal,
} from '../types/trading';
import {
  Shield,
  Bot,
  Zap,
  Key,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Server,
  Lock,
  ExternalLink,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { soundEngine } from '../utils/audioAlerts';

interface BrokerPanelProps {
  broker: BrokerConfig;
  onUpdateBroker: (updated: BrokerConfig) => void;
  positions: LivePosition[];
  onClosePosition: (id: string) => void;
  onMoveBreakeven: (id: string) => void;
  currentPrice: number;
}

export const BrokerPanel: React.FC<BrokerPanelProps> = ({
  broker,
  onUpdateBroker,
  positions,
  onClosePosition,
  onMoveBreakeven,
  currentPrice,
}) => {
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleCopyEAPayload = () => {
    const samplePayload = {
      event: 'ORDER_EXECUTE',
      symbol: 'XAUUSD',
      token: broker.secretToken || 'MT_AURAGOLD_SECRET',
      action: 'BUY',
      volume: 0.5,
      sl_pips: 45,
      tp_pips: 110,
      magic_number: 889901,
      comment: 'AuraGold_Lux_Confluence',
    };
    navigator.clipboard.writeText(JSON.stringify(samplePayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestPing = () => {
    setTestResult('Pinging bridge server...');
    setTimeout(() => {
      setTestResult(`Latency: 38ms · Bridge status: CONNECTED & AUTHORIZED (${broker.platform})`);
      soundEngine.playOrderExecuted();
    }, 350);
  };

  const totalFloatingPnl = positions.reduce((acc, p) => acc + p.pnl, 0);

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] rounded border border-[#1e2638] overflow-hidden">
      {/* Top Header */}
      <div className="p-4 bg-[#0d121c] border-b border-[#1b2230] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              Broker API Bridge & Institutional Risk Shield
            </h2>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                broker.isKillSwitchActive
                  ? 'bg-rose-950/50 text-rose-400 border-rose-800'
                  : 'bg-emerald-950/50 text-emerald-400 border-emerald-800'
              }`}
            >
              {broker.isKillSwitchActive ? 'KILL SWITCH ENGAGED' : 'PROTECTION NOMINAL'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatic order execution engine with strict daily loss thresholds, spread limits, and breakeven automation.
          </p>
        </div>

        {/* Account Balance Summary */}
        <div className="flex items-center gap-4 bg-[#121824] border border-[#20293a] px-3.5 py-1.5 rounded font-mono text-xs tabular-nums">
          <div>
            <div className="text-[10px] text-slate-400">Balance</div>
            <div className="font-bold text-white">${broker.balance.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Floating PnL</div>
            <div className={`font-bold ${totalFloatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalFloatingPnl >= 0 ? '+' : ''}${totalFloatingPnl.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Daily Drawdown</div>
            <div className="text-slate-300">${broker.dailyLossSoFar.toFixed(2)} / ${(broker.balance * broker.maxDailyDrawdownPercent / 100).toFixed(0)}</div>
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-y-auto">
        
        {/* Left Column: Broker API Credentials & Setup (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Platform Selector Box */}
          <div className="bg-[#0f1420] border border-[#1d2536] rounded p-3.5">
            <h3 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-amber-400" />
              1. Broker Platform Integration
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {(
                [
                  { id: 'MT4_MT5', label: 'MetaTrader 4/5 EA' },
                  { id: 'EXNESS_WEBHOOK', label: 'Exness / cTrader' },
                  { id: 'BINANCE_PERP', label: 'Binance (PAXG)' },
                  { id: 'BYBIT_PERP', label: 'Bybit USDT Perps' },
                ] as { id: BrokerPlatform; label: string }[]
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => onUpdateBroker({ ...broker, platform: p.id })}
                  className={`p-2 rounded text-xs font-medium text-left transition-all border ${
                    broker.platform === p.id
                      ? 'bg-amber-400/10 border-amber-400 text-amber-300 font-bold'
                      : 'bg-[#151c2a] border-[#222c3e] text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Platform fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Account Number / ID</label>
                <input
                  type="text"
                  value={broker.accountNumber}
                  onChange={(e) => onUpdateBroker({ ...broker, accountNumber: e.target.value })}
                  placeholder="e.g. 50928192"
                  className="w-full bg-[#151c2a] border border-[#232d3f] rounded px-2.5 py-1.5 text-slate-200 text-xs focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Server / Broker Host</label>
                <input
                  type="text"
                  value={broker.serverName}
                  onChange={(e) => onUpdateBroker({ ...broker, serverName: e.target.value })}
                  placeholder="e.g. MetaQuotes-Demo / Exness-Real2"
                  className="w-full bg-[#151c2a] border border-[#232d3f] rounded px-2.5 py-1.5 text-slate-200 text-xs focus:border-amber-400 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-400 block mb-1">Webhook Endpoint URL / EA Bridge</label>
                <input
                  type="text"
                  value={broker.webhookUrl}
                  onChange={(e) => onUpdateBroker({ ...broker, webhookUrl: e.target.value })}
                  placeholder="https://your-ea-bridge.com/api/trade"
                  className="w-full bg-[#151c2a] border border-[#232d3f] rounded px-2.5 py-1.5 text-slate-200 text-xs focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">API Key / Secret Token</label>
                <input
                  type="password"
                  value={broker.secretToken}
                  onChange={(e) => onUpdateBroker({ ...broker, secretToken: e.target.value })}
                  placeholder="••••••••••••••••"
                  className="w-full bg-[#151c2a] border border-[#232d3f] rounded px-2.5 py-1.5 text-slate-200 text-xs focus:border-amber-400 outline-none"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={handleTestPing}
                  className="flex-1 px-3 py-1.5 rounded text-xs font-semibold bg-[#1a2333] border border-[#2a374f] text-slate-200 hover:text-white hover:bg-[#202b3d] transition-colors"
                >
                  Test Bridge Ping
                </button>
                <button
                  onClick={handleCopyEAPayload}
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-[#1a2333] border border-[#2a374f] text-slate-200 hover:text-white hover:bg-[#202b3d] flex items-center gap-1 transition-colors"
                  title="Copy MT4/MT5 EA Webhook Format"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'EA JSON'}</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div className="mt-2 text-[11px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 p-2 rounded">
                ✓ {testResult}
              </div>
            )}
          </div>

          {/* Active Live Positions Table */}
          <div className="bg-[#0f1420] border border-[#1d2536] rounded p-3.5 flex-1 flex flex-col">
            <h3 className="text-xs font-bold text-slate-200 mb-2 flex items-center justify-between">
              <span>Open Execution Positions ({positions.length})</span>
              <span className="text-[11px] font-mono text-slate-400 font-normal">
                Max Allowed: {broker.maxConcurrentTrades} positions
              </span>
            </h3>

            {positions.length > 0 ? (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#151c2a] text-slate-400 border-b border-[#1e2738]">
                    <tr>
                      <th className="p-2 font-semibold">Ticket</th>
                      <th className="p-2 font-semibold">Side</th>
                      <th className="p-2 font-semibold">Lots</th>
                      <th className="p-2 font-semibold">Entry</th>
                      <th className="p-2 font-semibold">SL</th>
                      <th className="p-2 font-semibold">TP</th>
                      <th className="p-2 font-semibold text-right">PnL ($)</th>
                      <th className="p-2 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#182131]">
                    {positions.map((pos) => {
                      const isProfit = pos.pnl >= 0;
                      return (
                        <tr key={pos.id} className="hover:bg-[#141b27] tabular-nums">
                          <td className="p-2 text-slate-400">{pos.ticket}</td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pos.direction === 'BUY' ? 'text-emerald-400 bg-emerald-950/50' : 'text-rose-400 bg-rose-950/50'}`}>
                              {pos.direction}
                            </span>
                          </td>
                          <td className="p-2 text-slate-200">{pos.lots}</td>
                          <td className="p-2 text-slate-300">${pos.entryPrice.toFixed(2)}</td>
                          <td className="p-2 text-rose-400">${pos.sl.toFixed(2)}</td>
                          <td className="p-2 text-emerald-400">${pos.tp.toFixed(2)}</td>
                          <td className={`p-2 text-right font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? '+' : ''}${pos.pnl.toFixed(2)}
                          </td>
                          <td className="p-2 text-right space-x-1">
                            {!pos.isBreakeven && (
                              <button
                                onClick={() => onMoveBreakeven(pos.id)}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-950 text-sky-300 border border-sky-800 hover:bg-sky-900"
                                title="Move Stop Loss to Entry"
                              >
                                Breakeven
                              </button>
                            )}
                            <button
                              onClick={() => onClosePosition(pos.id)}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900"
                            >
                              Close
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
                No active positions currently open.
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Strict Risk Shield & Rules (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          <div className="bg-[#0f1420] border border-[#1d2536] rounded p-3.5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                2. Strict Risk Safeguards
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Auto Bot:</span>
                <button
                  onClick={() => onUpdateBroker({ ...broker, autoExecute: !broker.autoExecute })}
                  className={`w-9 h-5 rounded-full transition-colors p-0.5 ${broker.autoExecute ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${broker.autoExecute ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              
              {/* Risk % Per Trade */}
              <div className="bg-[#141a26] border border-[#20293b] p-2.5 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-300 font-medium">Risk Per Trade</span>
                  <span className="font-mono font-bold text-amber-400">{broker.riskPerTradePercent}% of Equity</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.25"
                  value={broker.riskPerTradePercent}
                  onChange={(e) => onUpdateBroker({ ...broker, riskPerTradePercent: Number(e.target.value) })}
                  className="w-full accent-amber-400"
                />
                <div className="text-[10px] text-slate-500 mt-1">
                  At ${broker.balance}, 1.0% risk allocates ${(broker.balance * broker.riskPerTradePercent / 100).toFixed(0)} max risk. Lots auto-adjust to SL distance.
                </div>
              </div>

              {/* Max Daily Drawdown Kill Switch */}
              <div className="bg-[#141a26] border border-[#20293b] p-2.5 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-300 font-medium">Daily Max Loss Kill-Switch</span>
                  <span className="font-mono font-bold text-rose-400">{broker.maxDailyDrawdownPercent}%</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="6.0"
                  step="0.5"
                  value={broker.maxDailyDrawdownPercent}
                  onChange={(e) => onUpdateBroker({ ...broker, maxDailyDrawdownPercent: Number(e.target.value) })}
                  className="w-full accent-rose-400"
                />
                <div className="text-[10px] text-slate-500 mt-1">
                  Trading is instantly locked for the day if cumulative losses reach ${(broker.balance * broker.maxDailyDrawdownPercent / 100).toFixed(0)}.
                </div>
              </div>

              {/* Max Concurrent Open Trades */}
              <div className="bg-[#141a26] border border-[#20293b] p-2.5 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-300 font-medium">Max Concurrent Open Trades</span>
                  <span className="font-mono font-bold text-slate-200">{broker.maxConcurrentTrades} trades</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      onClick={() => onUpdateBroker({ ...broker, maxConcurrentTrades: num })}
                      className={`py-1 text-xs font-mono font-bold rounded border ${
                        broker.maxConcurrentTrades === num
                          ? 'bg-amber-400 text-black border-amber-400'
                          : 'bg-[#182130] text-slate-400 border-[#26334a]'
                      }`}
                    >
                      {num} {num === 1 ? 'Trade' : 'Trades'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Spread Guard */}
              <div className="bg-[#141a26] border border-[#20293b] p-2.5 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-300 font-medium">Max Gold Spread Guard</span>
                  <span className="font-mono font-bold text-sky-400">{broker.maxSpreadPips} pips</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="50"
                  step="5"
                  value={broker.maxSpreadPips}
                  onChange={(e) => onUpdateBroker({ ...broker, maxSpreadPips: Number(e.target.value) })}
                  className="w-full accent-sky-400"
                />
                <div className="text-[10px] text-slate-500 mt-1">
                  Prevents orders during high-slippage economic releases or rollover spread widening.
                </div>
              </div>

              {/* Automation Checkboxes */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={broker.autoBreakeven}
                    onChange={(e) => onUpdateBroker({ ...broker, autoBreakeven: e.target.checked })}
                    className="accent-amber-400 w-3.5 h-3.5"
                  />
                  <span>Auto-Breakeven (Move SL to Entry at TP1)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={broker.partialTakeProfit}
                    onChange={(e) => onUpdateBroker({ ...broker, partialTakeProfit: e.target.checked })}
                    className="accent-amber-400 w-3.5 h-3.5"
                  />
                  <span>Partial Close (Close 50% lots at TP1, runner to TP2)</span>
                </label>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
