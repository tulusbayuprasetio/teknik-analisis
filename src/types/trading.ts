export type Timeframe = 'M1' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1';

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TrendDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type SignalType = 'STRONG_BUY' | 'BUY' | 'STRONG_SELL' | 'SELL';

export interface SMCStructure {
  type: 'BOS' | 'CHoCH';
  direction: 'BULLISH' | 'BEARISH';
  price: number;
  index: number;
  time: number;
}

export interface OrderBlock {
  id: string;
  type: 'BULLISH' | 'BEARISH';
  top: number;
  bottom: number;
  candleIndex: number;
  time: number;
  mitigated: boolean;
}

export interface FairValueGap {
  id: string;
  type: 'BULLISH' | 'BEARISH';
  top: number;
  bottom: number;
  candleIndex: number;
  time: number;
  filled: boolean;
}

export interface LiquidityLevel {
  id: string;
  type: 'EQH' | 'EQL' | 'PSYCHOLOGICAL';
  price: number;
  label: string;
  swept: boolean;
}

export interface LuxAlgoIndicatorData {
  trendRibbon: {
    baseline: number;
    upperBand: number;
    lowerBand: number;
    trend: 'BULLISH' | 'BEARISH';
  }[];
  confirmationSignals: {
    index: number;
    time: number;
    type: SignalType;
    price: number;
    strength: number; // 1-100
  }[];
  orderBlocks: OrderBlock[];
  fairValueGaps: FairValueGap[];
  structures: SMCStructure[];
  liquidityLevels: LiquidityLevel[];
  ema20: (number | null)[];
  ema50: (number | null)[];
  ema200: (number | null)[];
  rsi: (number | null)[];
  atr: (number | null)[];
}

export interface TradingSignal {
  id: string;
  timestamp: number;
  symbol: 'XAUUSD';
  timeframe: Timeframe;
  direction: SignalType;
  entryPrice: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  riskReward: number;
  confluenceScore: number; // 0 - 100%
  isHighProbability: boolean; // >= 75%
  reasons: string[];
  status: 'ACTIVE' | 'TRIGGERED' | 'TP1_HIT' | 'TP2_HIT' | 'TP3_HIT' | 'STOPPED_OUT' | 'CANCELLED';
  currentPnL?: number;
  currentPips?: number;
  pipsRisk: number;
  pipsReward: number;
  session: 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'LONDON_NY_OVERLAP';
}

export interface BacktestConfig {
  strategyId: 'LUX_SMC_CONFLUENCE' | 'ORDER_BLOCK_REVERSAL' | 'VOLATILITY_BREAKOUT' | 'EMA_TREND_RIDER';
  timeframe: Timeframe;
  initialBalance: number;
  riskPercent: number; // e.g., 1.5%
  rrTarget: number; // e.g., 2.5
  atrMultiplierSL: number; // e.g. 1.5
  useTrailingStop: boolean;
  moveBreakevenAtTP1: boolean;
  minConfluenceScore: number; // e.g. 75
  maxCandles: number;
}

export interface BacktestTrade {
  id: string;
  entryTime: number;
  exitTime: number;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  lots: number;
  pnl: number;
  pnlPercent: number;
  pips: number;
  exitReason: 'TP1' | 'TP2' | 'TP3' | 'SL' | 'TRAILING_SL' | 'SESSION_CLOSE';
  confluenceScore: number;
  durationCandles: number;
}

export interface BacktestResult {
  initialBalance: number;
  endingBalance: number;
  netProfit: number;
  netProfitPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  averageTrade: number;
  largestWin: number;
  largestLoss: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  trades: BacktestTrade[];
  equityCurve: {
    time: number;
    equity: number;
    drawdown: number;
  }[];
}

export type BrokerPlatform = 'MT4_MT5' | 'BINANCE_PERP' | 'BYBIT_PERP' | 'EXNESS_WEBHOOK';

export interface BrokerConfig {
  platform: BrokerPlatform;
  connected: boolean;
  accountNumber: string;
  balance: number;
  equity: number;
  leverage: number;
  serverName: string;
  webhookUrl: string;
  secretToken: string;
  apiKey: string;
  apiSecret: string;
  isTestnet: boolean;
  autoExecute: boolean;
  riskPerTradePercent: number;
  maxDailyDrawdownPercent: number;
  maxConcurrentTrades: number;
  maxSpreadPips: number;
  autoBreakeven: boolean;
  partialTakeProfit: boolean;
  dailyLossSoFar: number;
  isKillSwitchActive: boolean;
}

export interface LivePosition {
  id: string;
  ticket: string;
  symbol: 'XAUUSD';
  direction: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  currentPrice: number;
  sl: number;
  tp: number;
  pnl: number;
  pips: number;
  openTime: number;
  isBreakeven: boolean;
  status: 'OPEN' | 'CLOSED';
}

export interface MarketSession {
  name: 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'OVERLAP';
  label: string;
  city: string;
  utcHours: [number, number]; // e.g. [7, 16]
  isActive: boolean;
  volatilityRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  recommendation: string;
}
