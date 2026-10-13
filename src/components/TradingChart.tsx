import React, { useRef, useState, useEffect } from 'react';
import {
  Candle,
  LuxAlgoIndicatorData,
  Timeframe,
  OrderBlock,
  FairValueGap,
} from '../types/trading';
import {
  Maximize2,
  Sliders,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  Zap,
  TrendingUp,
} from 'lucide-react';

interface TradingChartProps {
  candles: Candle[];
  indicators: LuxAlgoIndicatorData;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  currentBid: number;
  currentAsk: number;
  spreadPips: number;
}

export const TradingChart: React.FC<TradingChartProps> = ({
  candles,
  indicators,
  timeframe,
  onTimeframeChange,
  currentBid,
  currentAsk,
  spreadPips,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Indicators toggle state
  const [showLuxSignals, setShowLuxSignals] = useState(true);
  const [showTrendRibbon, setShowTrendRibbon] = useState(true);
  const [showVolatilityBands, setShowVolatilityBands] = useState(false);
  const [showOrderBlocks, setShowOrderBlocks] = useState(true);
  const [showFVG, setShowFVG] = useState(true);
  const [showStructureLines, setShowStructureLines] = useState(true);
  const [showEMAs, setShowEMAs] = useState(false);

  // Viewport / zoom / pan state
  const [visibleCandleCount, setVisibleCandleCount] = useState(70);
  const [panOffset, setPanOffset] = useState(0); // 0 means latest candle is on right
  const [hoveredCandle, setHoveredCandle] = useState<{
    candle: Candle;
    x: number;
    y: number;
    index: number;
  } | null>(null);

  // Handle window resizing
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 900, height: 500 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setCanvasDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 520,
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main Canvas Rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvasDimensions.width;
    const height = canvasDimensions.height;

    // Set high-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Layout configuration
    const paddingRight = 75; // for price axis
    const paddingBottom = 32; // for time axis
    const volumeHeight = 65; // height reserved for volume
    const chartHeight = height - paddingBottom - volumeHeight;
    const chartWidth = width - paddingRight;

    // Determine slice of visible candles
    const totalCandles = candles.length;
    const count = Math.min(visibleCandleCount, totalCandles);
    const endIdx = Math.max(count, totalCandles - panOffset);
    const startIdx = Math.max(0, endIdx - count);
    const sliceCandles = candles.slice(startIdx, endIdx);

    if (sliceCandles.length === 0) return;

    // Find min & max price for visible range
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    sliceCandles.forEach((c) => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    });

    // Expand margin slightly for breathing room
    const priceMargin = (maxPrice - minPrice) * 0.08 || 4;
    minPrice -= priceMargin;
    maxPrice += priceMargin;
    const priceRange = maxPrice - minPrice || 1;

    // Helper functions for coordinates
    const candleWidth = Math.max(2, chartWidth / sliceCandles.length);
    const barSpacing = candleWidth * 0.8;

    const getX = (indexInSlice: number) => {
      return indexInSlice * candleWidth + candleWidth / 2;
    };

    const getY = (price: number) => {
      return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    };

    // 1. Draw Clean Dark Background
    ctx.fillStyle = '#0c1018';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Subtle Horizontal Grid Lines & Price Labels
    ctx.strokeStyle = '#161c28';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';

    const gridSteps = 6;
    for (let i = 0; i <= gridSteps; i++) {
      const p = minPrice + (priceRange / gridSteps) * i;
      const y = getY(p);

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price label on right margin
      ctx.fillText(`$${p.toFixed(2)}`, chartWidth + 6, y + 3);
    }

    // 3. Draw Vertical Grid Lines & Time Labels
    const timeSteps = 5;
    const stepInterval = Math.max(1, Math.floor(sliceCandles.length / timeSteps));
    for (let i = 0; i < sliceCandles.length; i += stepInterval) {
      const x = getX(i);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height - paddingBottom);
      ctx.stroke();

      const date = new Date(sliceCandles[i].timestamp);
      const timeStr = date.toTimeString().slice(0, 5);
      ctx.fillText(timeStr, x - 14, height - 10);
    }

    // 4. Draw SMC Fair Value Gaps (FVG)
    if (showFVG && indicators.fairValueGaps) {
      indicators.fairValueGaps.forEach((fvg) => {
        const topY = getY(fvg.top);
        const bottomY = getY(fvg.bottom);
        const fvgHeight = Math.abs(bottomY - topY);

        ctx.fillStyle =
          fvg.type === 'BULLISH'
            ? fvg.filled ? 'rgba(16, 185, 129, 0.04)' : 'rgba(16, 185, 129, 0.15)'
            : fvg.filled ? 'rgba(244, 63, 94, 0.04)' : 'rgba(244, 63, 94, 0.15)';
        ctx.strokeStyle =
          fvg.type === 'BULLISH'
            ? 'rgba(16, 185, 129, 0.4)'
            : 'rgba(244, 63, 94, 0.4)';
        ctx.setLineDash([3, 3]);

        ctx.fillRect(0, Math.min(topY, bottomY), chartWidth, fvgHeight);
        ctx.strokeRect(0, Math.min(topY, bottomY), chartWidth, fvgHeight);
        ctx.setLineDash([]);
      });
    }

    // 5. Draw SMC Order Blocks (OB)
    if (showOrderBlocks && indicators.orderBlocks) {
      indicators.orderBlocks.forEach((ob) => {
        const topY = getY(ob.top);
        const bottomY = getY(ob.bottom);
        const obHeight = Math.max(2, Math.abs(bottomY - topY));

        ctx.fillStyle =
          ob.type === 'BULLISH'
            ? ob.mitigated ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.22)'
            : ob.mitigated ? 'rgba(244, 63, 94, 0.06)' : 'rgba(244, 63, 94, 0.22)';
        ctx.strokeStyle =
          ob.type === 'BULLISH'
            ? 'rgba(16, 185, 129, 0.65)'
            : 'rgba(244, 63, 94, 0.65)';
        ctx.lineWidth = 1;

        ctx.fillRect(0, Math.min(topY, bottomY), chartWidth, obHeight);
        ctx.strokeRect(0, Math.min(topY, bottomY), chartWidth, obHeight);

        // OB Label text
        ctx.fillStyle = ob.type === 'BULLISH' ? '#34d399' : '#fb7185';
        ctx.font = '9px "JetBrains Mono", monospace';
        const label = `${ob.type === 'BULLISH' ? '+OB (Demand)' : '-OB (Supply)'} $${ob.bottom} - $${ob.top}`;
        ctx.fillText(label, 12, Math.min(topY, bottomY) + 12);
      });
    }

    // 6. Draw LuxAlgo Dynamic Trend Ribbon & Baseline
    if (showTrendRibbon && indicators.trendRibbon) {
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;

      for (let i = 0; i < sliceCandles.length; i++) {
        const globalIdx = startIdx + i;
        const ribbon = indicators.trendRibbon[globalIdx];
        if (!ribbon) continue;

        const x = getX(i);
        const y = getY(ribbon.baseline);

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle = '#eab308'; // Lux Gold baseline
      ctx.stroke();

      // Draw Volatility Bands if enabled
      if (showVolatilityBands) {
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        // Upper Band
        ctx.beginPath();
        for (let i = 0; i < sliceCandles.length; i++) {
          const globalIdx = startIdx + i;
          const ribbon = indicators.trendRibbon[globalIdx];
          if (!ribbon) continue;
          const x = getX(i);
          const y = getY(ribbon.upperBand);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.stroke();

        // Lower Band
        ctx.beginPath();
        for (let i = 0; i < sliceCandles.length; i++) {
          const globalIdx = startIdx + i;
          const ribbon = indicators.trendRibbon[globalIdx];
          if (!ribbon) continue;
          const x = getX(i);
          const y = getY(ribbon.lowerBand);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 7. Draw Volume Bars in bottom zone
    for (let i = 0; i < sliceCandles.length; i++) {
      const c = sliceCandles[i];
      const x = getX(i) - barSpacing / 2;
      const isGreen = c.close >= c.open;
      const volRatio = maxVolume > 0 ? c.volume / maxVolume : 0;
      const barH = Math.max(1, volRatio * volumeHeight * 0.85);
      const y = height - paddingBottom - barH;

      ctx.fillStyle = isGreen ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)';
      ctx.fillRect(x, y, barSpacing, barH);
    }

    // 8. Draw Main Candlesticks
    for (let i = 0; i < sliceCandles.length; i++) {
      const c = sliceCandles[i];
      const x = getX(i);
      const isGreen = c.close >= c.open;
      const color = isGreen ? '#10b981' : '#f43f5e';

      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

      ctx.fillStyle = color;
      ctx.fillRect(x - barSpacing / 2, bodyTop, barSpacing, bodyHeight);
    }

    // 9. Draw LuxAlgo Confirmation Signal Tags
    if (showLuxSignals && indicators.confirmationSignals) {
      indicators.confirmationSignals.forEach((sig) => {
        const sliceIdx = sig.index - startIdx;
        if (sliceIdx >= 0 && sliceIdx < sliceCandles.length) {
          const c = sliceCandles[sliceIdx];
          const x = getX(sliceIdx);

          if (sig.type.includes('BUY')) {
            const y = getY(c.low) + 14;
            const isStrong = sig.type === 'STRONG_BUY';

            ctx.fillStyle = isStrong ? '#059669' : '#10b981';
            ctx.beginPath();
            ctx.moveTo(x, y - 6);
            ctx.lineTo(x - 5, y);
            ctx.lineTo(x + 5, y);
            ctx.closePath();
            ctx.fill();

            // Label
            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.fillStyle = '#10b981';
            ctx.textAlign = 'center';
            ctx.fillText(isStrong ? 'STRONG BUY' : 'BUY', x, y + 12);
          } else {
            const y = getY(c.high) - 14;
            const isStrong = sig.type === 'STRONG_SELL';

            ctx.fillStyle = isStrong ? '#dc2626' : '#f43f5e';
            ctx.beginPath();
            ctx.moveTo(x, y + 6);
            ctx.lineTo(x - 5, y);
            ctx.lineTo(x + 5, y);
            ctx.closePath();
            ctx.fill();

            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.fillStyle = '#f43f5e';
            ctx.textAlign = 'center';
            ctx.fillText(isStrong ? 'STRONG SELL' : 'SELL', x, y - 8);
          }
        }
      });
    }

    // 10. Draw Live Bid/Ask Horizontal Price Ray
    const latestPrice = sliceCandles[sliceCandles.length - 1].close;
    const currentPriceY = getY(latestPrice);

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(0, currentPriceY);
    ctx.lineTo(chartWidth, currentPriceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Live Price Tag box on Axis
    ctx.fillStyle = '#eab308';
    ctx.fillRect(chartWidth + 1, currentPriceY - 9, paddingRight - 4, 18);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`$${latestPrice.toFixed(2)}`, chartWidth + paddingRight / 2 - 2, currentPriceY + 3.5);

    // 11. Crosshair & Inspection Guide
    if (hoveredCandle) {
      const hx = hoveredCandle.x;
      const hy = hoveredCandle.y;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, height - paddingBottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, hy);
      ctx.lineTo(chartWidth, hy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    canvasDimensions,
    candles,
    indicators,
    visibleCandleCount,
    panOffset,
    showLuxSignals,
    showTrendRibbon,
    showVolatilityBands,
    showOrderBlocks,
    showFVG,
    showStructureLines,
    showEMAs,
    hoveredCandle,
  ]);

  // Mouse interactivity: Crosshair & Tooltip inspection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const chartWidth = canvasDimensions.width - 75;
    const totalCandles = candles.length;
    const count = Math.min(visibleCandleCount, totalCandles);
    const endIdx = Math.max(count, totalCandles - panOffset);
    const startIdx = Math.max(0, endIdx - count);
    const sliceCandles = candles.slice(startIdx, endIdx);

    const candleWidth = chartWidth / sliceCandles.length;
    const sliceIdx = Math.floor(x / candleWidth);

    if (sliceIdx >= 0 && sliceIdx < sliceCandles.length) {
      setHoveredCandle({
        candle: sliceCandles[sliceIdx],
        x,
        y,
        index: startIdx + sliceIdx,
      });
    } else {
      setHoveredCandle(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      // Zoom in
      setVisibleCandleCount((prev) => Math.max(30, prev - 5));
    } else {
      // Zoom out
      setVisibleCandleCount((prev) => Math.min(180, prev + 5));
    }
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className="flex flex-col h-full bg-[#0c1018] rounded border border-[#1e2638] overflow-hidden select-none"
    >
      {/* Chart Top Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[#1b2230] bg-[#0e131d]">
        
        {/* Timeframe Switcher */}
        <div className="flex items-center gap-1 bg-[#141b27] p-0.5 rounded border border-[#232c3d]">
          {(['M1', 'M5', 'M15', 'H1', 'H4', 'D1'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2 py-0.5 text-xs font-mono font-medium rounded transition-colors ${
                timeframe === tf
                  ? 'bg-amber-400 text-black font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-[#1f2838]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* LuxAlgo & SMC Overlay Toggles */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowLuxSignals(!showLuxSignals)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition-colors border ${
              showLuxSignals
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                : 'bg-[#141b27] text-slate-500 border-[#222b3b]'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            Lux Signals
          </button>

          <button
            onClick={() => setShowTrendRibbon(!showTrendRibbon)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition-colors border ${
              showTrendRibbon
                ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                : 'bg-[#141b27] text-slate-500 border-[#222b3b]'
            }`}
          >
            <TrendingUp className="w-3 h-3 text-sky-400" />
            Trend Ribbon
          </button>

          <button
            onClick={() => setShowOrderBlocks(!showOrderBlocks)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition-colors border ${
              showOrderBlocks
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-[#141b27] text-slate-500 border-[#222b3b]'
            }`}
          >
            SMC Order Blocks
          </button>

          <button
            onClick={() => setShowFVG(!showFVG)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition-colors border ${
              showFVG
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                : 'bg-[#141b27] text-slate-500 border-[#222b3b]'
            }`}
          >
            FVG Gaps
          </button>

          <button
            onClick={() => setShowVolatilityBands(!showVolatilityBands)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded flex items-center gap-1 transition-colors border ${
              showVolatilityBands
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                : 'bg-[#141b27] text-slate-500 border-[#222b3b]'
            }`}
          >
            ATR Bands
          </button>
        </div>

        {/* Reset View Zoom */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setVisibleCandleCount(70);
              setPanOffset(0);
            }}
            className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-[#141b27] border border-[#232c3d]"
          >
            Reset Scale
          </button>
        </div>

      </div>

      {/* Main Canvas Chart Area */}
      <div className="relative flex-1 w-full h-full min-h-[420px]">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full cursor-crosshair block"
        />

        {/* Hover Inspection Overlay Panel */}
        {hoveredCandle && (
          <div className="absolute top-3 left-4 bg-[#0e1420]/90 backdrop-blur-sm border border-[#222d40] px-3 py-2 rounded text-xs font-mono pointer-events-none shadow-lg shadow-black/40">
            <div className="flex items-center gap-3 text-slate-300 mb-1">
              <span className="text-amber-400 font-bold">XAUUSD ({timeframe})</span>
              <span className="text-slate-400">
                {new Date(hoveredCandle.candle.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-3 tabular-nums text-[11px]">
              <span>O: <strong className="text-white">${hoveredCandle.candle.open.toFixed(2)}</strong></span>
              <span>H: <strong className="text-emerald-400">${hoveredCandle.candle.high.toFixed(2)}</strong></span>
              <span>L: <strong className="text-rose-400">${hoveredCandle.candle.low.toFixed(2)}</strong></span>
              <span>C: <strong className={hoveredCandle.candle.close >= hoveredCandle.candle.open ? 'text-emerald-400' : 'text-rose-400'}>${hoveredCandle.candle.close.toFixed(2)}</strong></span>
              <span>Vol: <strong className="text-slate-300">{hoveredCandle.candle.volume}</strong></span>
            </div>
          </div>
        )}

        {/* Watermark brand watermark in chart field */}
        <div className="absolute bottom-10 left-6 text-slate-800 font-bold text-2xl font-mono select-none pointer-events-none opacity-40">
          XAUUSD · 100oz Gold
        </div>
      </div>
    </div>
  );
};
