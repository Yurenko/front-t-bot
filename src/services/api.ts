import axios from "axios";

const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://back-t-bot.onrender.com"
    : process.env.REACT_APP_API_URL || "http://localhost:3007";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // Збільшуємо timeout до 30 секунд
});

// Додаємо інтерцептор для логування запитів
api.interceptors.request.use(
  (config) => {
    console.log("API Request:", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Додаємо інтерцептор для логування відповідей
api.interceptors.response.use(
  (response) => {
    console.log("API Response:", response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error(
      "API Response Error:",
      error.response?.status,
      error.response?.data
    );
    return Promise.reject(error);
  }
);

export interface TradingSession {
  id: string;
  symbol: string;
  initialBalance: number;
  reserveBalance: number;
  tradingBalance: number;
  currentBalance: number;
  totalPnL: number;
  status: "active" | "closed" | "liquidated";
  averageEntryPrice: number | null;
  totalPositionSize: number;
  averagingCount: number;
  liquidationPrice: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Trade {
  id: string;
  sessionId: string;
  type: "entry" | "averaging" | "exit";
  side: "buy" | "sell";
  price: number;
  quantity: number;
  value: number;
  pnl: number | null;
  roi: number | null;
  binanceOrderId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface MarketAnalysis {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  indicators: {
    sma20: number;
    sma50: number;
    rsi: number;
    bbUpper: number;
    bbMiddle: number;
    bbLower: number;
    atr: number;
  };
  volatility: "low" | "medium" | "high";
  consolidation: boolean;
  supportLevel: number;
  resistanceLevel: number;
  weight: number;
}

export interface BinanceBalance {
  accountAlias: string;
  asset: string;
  balance: string;
  crossWalletBalance: string;
  crossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
}

export interface TotalBalance {
  totalWalletBalance: number;
  totalUnrealizedProfit: number;
  totalMarginBalance: number;
  totalAvailableBalance: number;
  totalUsedBalance: number;
}

export interface ActiveSessionWithROI {
  symbol: string;
  sessionId: string;
  status: string;
  hasPosition: boolean;
  currentPrice?: number;
  entryPrice?: number;
  roi?: number;
  pnl?: number;
  positionSize?: number;
  totalPnL: number;
  initialBalance: number;
  currentBalance: number;
  tradingBalance: number;
}

export interface BinancePosition {
  symbol: string;
  initialMargin: string;
  maintMargin: string;
  unrealizedProfit: string;
  positionInitialMargin: string;
  openOrderInitialMargin: string;
  leverage: string;
  isolated: boolean;
  entryPrice: string;
  maxNotional: string;
  bidNotional: string;
  askNotional: string;
  marginType: string;
  isAutoAddMargin: string;
  positionSide: string;
  notional: string;
  isolatedWallet: string;
  updateTime: number;
  positionAmt: string;
  takeProfit: string;
  stopLoss: string;
}

export const tradingApi = {
  // Сесії
  initializeSession: (symbol: string, initialBalance: number) =>
    api.post<TradingSession>("/trading/session/initialize", {
      symbol,
      initialBalance,
    }),

  analyzeAndTrade: (symbol: string) =>
    api.post("/trading/session/" + symbol + "/analyze"),

  getSessionStatus: (symbol: string) =>
    api.get<TradingSession>("/trading/session/" + symbol + "/status"),

  getAllSessions: () => api.get<TradingSession[]>("/trading/sessions"),

  getSessionTrades: (sessionId: string) =>
    api.get<Trade[]>("/trading/session/" + sessionId + "/trades"),

  closeSession: (sessionId: string) =>
    api.delete<TradingSession>("/trading/session/" + sessionId),

  // Символи
  getAvailableSymbols: () => api.get<string[]>("/trading/available-symbols"),

  getActiveSymbols: () => api.get<string[]>("/trading/active-symbols"),

  getActivePositionsCount: () =>
    api.get<{ count: number }>("/trading/active-positions-count"),

  getActiveSessionsWithROI: () =>
    api.get<ActiveSessionWithROI[]>("/trading/active-sessions-roi"),

  // Аналіз ринку
  getMarketAnalysis: (symbol: string) =>
    api.get<MarketAnalysis[]>("/trading/market/analysis/" + symbol),

  getMarketAnalysisBatch: (symbols: string[]) =>
    api.get<{
      results: Array<{
        symbol: string;
        analysis: MarketAnalysis[] | null;
        success: boolean;
        error?: string;
      }>;
      totalTime: number;
      successful: number;
      failed: number;
    }>(`/trading/market/analysis-batch?symbols=${symbols.join(",")}`),

  // Binance дані
  getBalance: () => api.get<BinanceBalance[]>("/trading/balance"),

  getTotalBalance: () => api.get<TotalBalance>("/trading/total-balance"),

  getPositions: () => api.get<BinancePosition[]>("/trading/positions"),

  getPosition: (symbol: string) =>
    api.get<BinancePosition>("/trading/position/" + symbol),

  // Автоматичний аналіз торгівлі
  startAutoTrading: (intervalMs?: number) =>
    api.post("/trading/auto-trading/start", { intervalMs }),

  stopAutoTrading: () => api.post("/trading/auto-trading/stop"),

  getAutoTradingStatus: () => api.get("/trading/auto-trading/status"),

  updateAutoTradingInterval: (intervalMs: number) =>
    api.post("/trading/auto-trading/interval", { intervalMs }),
};

export default api;
