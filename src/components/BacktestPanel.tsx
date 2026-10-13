import React, { useState } from 'react';
import {
  Candle,
  BacktestConfig,
  BacktestResult,
  BacktestTrade,
  Timeframe,
} from '../types/trading';
import { runStrategyBacktest } from '../utils/backtestEngine';
import {
  Play,
  RotateCcw,
  Download,
  TrendingUp,
  Percent,
  DollarSign,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface BacktestPanelProps {
  candles: Candle[];
}

export const BacktestPanel: React.FC<BacktestPanelProps> = ({ candles }) => {
  const [config, setConfig] = useState<BacktestConfig>({
    strategyId: 'LUX_SMC_CONFLUENCE',
    timeframe: 'M15',
    initialBalance: 10000,
    riskPercent: 1.5,
    rrTarget: 2.5,
    atrMultiplierSL: 1.5,
    useTrailingStop: true,
    moveBreakevenAtTP1: true,
    minConfluenceScore: 75,
    maxCandles: 300,
  });

  const [result, setResult] = useState<BacktestResult>(() =>
    runStrategyBacktest(candles, config)
  );

  const [isRunning, setIsRunning] = useState(false);
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'WINS' | 'LOSSES'>('ALL');

  const handleRunBacktest = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runStrategyBacktest(candles, config);
      setResult(res);
      setIsRunning(false);
    }, 250);
  };

  const handleExportCSV = () => {
    if (!result || result.trades.length === 0) return;
    const headers = ['Trade ID', 'Direction', 'Entry Time', 'Exit Time', 'Entry Price', 'Exit Price', 'Lots', 'PnL ($)', 'PnL (%)', 'Pips', 'Exit Reason', 'Confluence'];
    const rows = result.trades.map((t) => [
      t.id,
      t.direction,
      new Date(t.entryTime).toISOString(),
      new Date(t.exitTime).toISOString(),
      t.entryPrice,
      t.exitPrice,
      t.lots,
      t.pnl,
      t.pnlPercent,
      t.pips,
      t.exitReason,
      t.confluenceScore,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `XAUUSD_Backtest_${config.strategyId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTrades = result.trades.filter((t) => {
    if (tradeFilter === 'WINS') return t.pnl > 0;
    if (tradeFilter === 'LOSSES') return t.pnl <= 0;
    return true;
  });

  // Calculate coordinates for SVG Equity Curve
  const equityPoints = result.equityCurve;
  const minEquity = Math.min(...equityPoints.map((p) => p.equity)) * 0.98;
  const maxEquity = Math.max(...equityPoints.map((p) => p.equity)) * 1.02;
  const equitySpan = maxEquity - minEquity || 1;

  const svgWidth = 800;
  const svgHeight = 220;

  const polylineCoords = equityPoints
    .map((p, i) => {
      const x = (i / (equityPoints.length - 1 || 1)) * svgWidth;
      const y = svgHeight - ((p.equity - minEquity) / equitySpan) * svgHeight;
      return `${x},${y}`;
    })
    .join(' ');

  const isNetProfitPositive = result.netProfit >= 0;

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] rounded border border-[#1e2638] overflow-hidden">
      {/* Control Configuration Bar */}
      <div className="p-4 bg-[#0d121c] border-b border-[#1b2230]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Institutional Strategy Backtest & Validation Engine
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulates historical Gold execution over {candles.length} candles with pip value, ATR stop loss, and breakeven automation.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded text-xs font-medium text-slate-300 bg-[#161c28] border border-[#232c3d] hover:text-white hover:bg-[#1e2638] flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              Export CSV
            </button>

            <button
              onClick={handleRunBacktest}
              disabled={isRunning}
              className="px-4 py-1.5 rounded text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 active:bg-amber-500 flex items-center gap-1.5 transition-colors shadow-sm shadow-amber-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              {isRunning ? 'Simulating...' : 'Run Backtest'}
            </button>
          </div>
        </div>

        {/* Parameter Inputs Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Strategy Select */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400 font-medium">Strategy</label>
            <select
              value={config.strategyId}
              onChange={(e) => setConfig({ ...config, strategyId: e.target.value as BacktestConfig['strategyId'] })}
              className="bg-[#141a26] border border-[#232d3f] text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono focus:border-amber-400 outline-none"
            >
              <option value="LUX_SMC_CONFLUENCE">LuxAlgo + SMC Confluence</option>
              <option value="ORDER_BLOCK_REVERSAL">SMC Order Block Reversal</option>
              <option value="VOLATILITY_BREAKOUT">ATR Volatility Breakout</option>
              <option value="EMA_TREND_RIDER">EMA Dynamic Trend Rider</option>
            </select>
          </div>

          {/* Capital */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400 font-medium">Initial Capital ($)</label>
            <input
              type="number"
              value={config.initialBalance}
              onChange={(e) => setConfig({ ...config, initialBalance: Math.max(100, Number(e.target.value)) })}
              className="bg-[#141a26] border border-[#232d3f] text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono focus:border-amber-400 outline-none"
            />
          </div>

          {/* Risk % */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400 font-medium">Risk Per Trade (%)</label>
            <input
              type="number"
              step="0.1"
              value={config.riskPercent}
              onChange={(e) => setConfig({ ...config, riskPercent: Number(e.target.value) })}
              className="bg-[#141a26] border border-[#232d3f] text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono focus:border-amber-400 outline-none"
            />
          </div>

          {/* R:R Target */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400 font-medium">Take Profit (R:R)</label>
            <input
              type="number"
              step="0.5"
              value={config.rrTarget}
              onChange={(e) => setConfig({ ...config, rrTarget: Number(e.target.value) })}
              className="bg-[#141a26] border border-[#232d3f] text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono focus:border-amber-400 outline-none"
            />
          </div>

          {/* ATR Multiplier SL */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400 font-medium">SL (ATR Multiplier)</label>
            <input
              type="number"
              step="0.1"
              value={config.atrMultiplierSL}
              onChange={(e) => setConfig({ ...config, atrMultiplierSL: Number(e.target.value) })}
              className="bg-[#141a26] border border-[#232d3f] text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono focus:border-amber-400 outline-none"
            />
          </div>

          {/* Confluence Threshold */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400 font-medium">Min Confluence %</label>
            <input
              type="number"
              value={config.minConfluenceScore}
              onChange={(e) => setConfig({ ...config, minConfluenceScore: Number(e.target.value) })}
              className="bg-[#141a26] border border-[#232d3f] text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono focus:border-amber-400 outline-none"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1b2230] text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={config.useTrailingStop}
              onChange={(e) => setConfig({ ...config, useTrailingStop: e.target.checked })}
              className="accent-amber-400 w-3.5 h-3.5"
            />
            <span>Enable ATR Trailing Stop</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={config.moveBreakevenAtTP1}
              onChange={(e) => setConfig({ ...config, moveBreakevenAtTP1: e.target.checked })}
              className="accent-amber-400 w-3.5 h-3.5"
            />
            <span>Move SL to Breakeven at TP1</span>
          </label>
        </div>
      </div>

      {/* KPI Performance Metrics Cards */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-[#0f141f] border border-[#1b2333] p-3 rounded">
          <div className="text-[11px] text-slate-400 font-medium">Net Profit</div>
          <div className={`text-base font-bold font-mono tabular-nums mt-0.5 ${isNetProfitPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isNetProfitPositive ? '+' : ''}${result.netProfit.toLocaleString()} ({isNetProfitPositive ? '+' : ''}{result.netProfitPercent}%)
          </div>
        </div>

        <div className="bg-[#0f141f] border border-[#1b2333] p-3 rounded">
          <div className="text-[11px] text-slate-400 font-medium">Win Rate</div>
          <div className="text-base font-bold font-mono tabular-nums mt-0.5 text-white">
            {result.winRate}% <span className="text-xs font-normal text-slate-400">({result.winningTrades}W / {result.losingTrades}L)</span>
          </div>
        </div>

        <div className="bg-[#0f141f] border border-[#1b2333] p-3 rounded">
          <div className="text-[11px] text-slate-400 font-medium">Profit Factor</div>
          <div className="text-base font-bold font-mono tabular-nums mt-0.5 text-amber-400">
            {result.profitFactor.toFixed(2)}
          </div>
        </div>

        <div className="bg-[#0f141f] border border-[#1b2333] p-3 rounded">
          <div className="text-[11px] text-slate-400 font-medium">Max Drawdown</div>
          <div className="text-base font-bold font-mono tabular-nums mt-0.5 text-rose-400">
            -{result.maxDrawdownPercent}% (${result.maxDrawdown})
          </div>
        </div>

        <div className="bg-[#0f141f] border border-[#1b2333] p-3 rounded">
          <div className="text-[11px] text-slate-400 font-medium">Sharpe Ratio</div>
          <div className="text-base font-bold font-mono tabular-nums mt-0.5 text-sky-400">
            {result.sharpeRatio}
          </div>
        </div>

        <div className="bg-[#0f141f] border border-[#1b2333] p-3 rounded">
          <div className="text-[11px] text-slate-400 font-medium">Streak (W / L)</div>
          <div className="text-base font-bold font-mono tabular-nums mt-0.5 text-slate-200">
            {result.maxConsecutiveWins} wins / {result.maxConsecutiveLosses} losses
          </div>
        </div>
      </div>

      {/* Equity Curve SVG Graph */}
      <div className="px-4 pb-4">
        <div className="bg-[#0c1018] border border-[#1a2233] rounded p-3">
          <div className="flex items-center justify-between mb-2 text-xs font-mono">
            <span className="text-slate-400 font-semibold">Account Equity Curve ($)</span>
            <span className="text-slate-400 tabular-nums">
              Initial: ${result.initialBalance.toLocaleString()} → Ending: <strong className="text-emerald-400">${result.endingBalance.toLocaleString()}</strong>
            </span>
          </div>

          <div className="relative w-full h-[180px]">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Baseline initial balance line */}
              <line
                x1="0"
                y1={svgHeight - ((result.initialBalance - minEquity) / equitySpan) * svgHeight}
                x2={svgWidth}
                y2={svgHeight - ((result.initialBalance - minEquity) / equitySpan) * svgHeight}
                stroke="#334155"
                strokeDasharray="4 4"
                strokeWidth="1"
              />

              {/* Area gradient under line */}
              <polygon
                points={`0,${svgHeight} ${polylineCoords} ${svgWidth},${svgHeight}`}
                fill="url(#equityGrad)"
              />

              {/* Equity Curve Polyline */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                points={polylineCoords}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Trade Log Table */}
      <div className="flex-1 px-4 pb-4 flex flex-col min-h-[220px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Trade History Log ({filteredTrades.length} trades)
            </h3>
          </div>

          <div className="flex items-center gap-1 bg-[#131924] p-0.5 rounded border border-[#1f2838] text-[11px]">
            <button
              onClick={() => setTradeFilter('ALL')}
              className={`px-2 py-0.5 rounded ${tradeFilter === 'ALL' ? 'bg-amber-400 text-black font-semibold' : 'text-slate-400'}`}
            >
              All
            </button>
            <button
              onClick={() => setTradeFilter('WINS')}
              className={`px-2 py-0.5 rounded ${tradeFilter === 'WINS' ? 'bg-emerald-500 text-black font-semibold' : 'text-slate-400'}`}
            >
              Wins ({result.winningTrades})
            </button>
            <button
              onClick={() => setTradeFilter('LOSSES')}
              className={`px-2 py-0.5 rounded ${tradeFilter === 'LOSSES' ? 'bg-rose-500 text-white font-semibold' : 'text-slate-400'}`}
            >
              Losses ({result.losingTrades})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#0d121c] border border-[#1b2333] rounded">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#121824] text-slate-400 border-b border-[#1b2333] sticky top-0">
              <tr>
                <th className="py-2 px-3 font-semibold">Trade ID</th>
                <th className="py-2 px-3 font-semibold">Type</th>
                <th className="py-2 px-3 font-semibold">Entry</th>
                <th className="py-2 px-3 font-semibold">Exit</th>
                <th className="py-2 px-3 font-semibold">Lots</th>
                <th className="py-2 px-3 font-semibold text-right">Pips</th>
                <th className="py-2 px-3 font-semibold text-right">PnL ($)</th>
                <th className="py-2 px-3 font-semibold text-right">Return %</th>
                <th className="py-2 px-3 font-semibold">Exit Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171e2c]">
              {filteredTrades.map((trade) => {
                const isWin = trade.pnl > 0;
                return (
                  <tr key={trade.id} className="hover:bg-[#121824] transition-colors tabular-nums">
                    <td className="py-2 px-3 text-slate-400">{trade.id}</td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${trade.direction === 'BUY' ? 'text-emerald-400 bg-emerald-950/50' : 'text-rose-400 bg-rose-950/50'}`}>
                        {trade.direction}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-300">${trade.entryPrice.toFixed(2)}</td>
                    <td className="py-2 px-3 text-slate-300">${trade.exitPrice.toFixed(2)}</td>
                    <td className="py-2 px-3 text-slate-400">{trade.lots}</td>
                    <td className={`py-2 px-3 text-right font-semibold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? '+' : ''}{trade.pips}
                    </td>
                    <td className={`py-2 px-3 text-right font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? '+' : ''}${trade.pnl.toFixed(2)}
                    </td>
                    <td className={`py-2 px-3 text-right ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? '+' : ''}{trade.pnlPercent}%
                    </td>
                    <td className="py-2 px-3 text-slate-400">
                      <span className="text-[11px]">{trade.exitReason}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
