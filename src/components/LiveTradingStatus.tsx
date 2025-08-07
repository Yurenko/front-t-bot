import React, { useState, useEffect } from "react";
import { tradingApi, TradingSession, MarketAnalysis } from "../services/api";

interface LiveTradingStatusProps {
  session: TradingSession;
}

interface TradingStatus {
  symbol: string;
  currentPrice: number;
  entryPrice: number | null;
  positionSize: number;
  unrealizedPnL: number;
  roi: number;
  averagingCount: number;
  maxAveraging: number;
  liquidationPrice: number | null;
  distanceToLiquidation: number;
  marketAnalysis: MarketAnalysis | null;
  lastUpdate: string;
  activePositionsCount?: number; // Додаємо кількість активних позицій
}

const LiveTradingStatus: React.FC<LiveTradingStatusProps> = ({ session }) => {
  const [status, setStatus] = useState<TradingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (autoRefresh) {
      loadStatus();
      const interval = setInterval(loadStatus, 15000); // Оновлення кожні 15 секунд
      return () => clearInterval(interval);
    }
  }, [session.id, autoRefresh]);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      // Отримуємо поточний статус сесії
      const sessionResponse = await tradingApi.getSessionStatus(session.symbol);
      const currentSession = sessionResponse.data;

      // Отримуємо аналіз ринку
      const analysisResponse = await tradingApi.getMarketAnalysis(
        session.symbol
      );
      const analysis =
        analysisResponse.data.find((a) => a.timeframe === "1d") ||
        analysisResponse.data[0];

      // Отримуємо кількість активних позицій
      const positionsResponse = await tradingApi.getActivePositionsCount();
      const activePositionsCount = positionsResponse.data.count;

      if (currentSession && analysis) {
        const currentPrice = analysis.currentPrice;
        const entryPrice = currentSession.averageEntryPrice;
        const positionSize = currentSession.totalPositionSize || 0;
        const averagingCount = currentSession.averagingCount || 0;
        const liquidationPrice = currentSession.liquidationPrice;

        // Розраховуємо P&L
        let unrealizedPnL = 0;
        let roi = 0;

        if (entryPrice && positionSize > 0) {
          const priceChange = (currentPrice - entryPrice) / entryPrice;
          unrealizedPnL = priceChange * positionSize * currentPrice; // 3x leverage
          roi = priceChange * 3; // 3x leverage
        }

        // Розраховуємо відстань до ліквідації
        let distanceToLiquidation = 0;
        if (liquidationPrice) {
          distanceToLiquidation =
            ((currentPrice - liquidationPrice) / liquidationPrice) * 100;
        }

        const tradingStatus: TradingStatus = {
          symbol: session.symbol,
          currentPrice,
          entryPrice,
          positionSize,
          unrealizedPnL,
          roi,
          averagingCount,
          maxAveraging: 4,
          liquidationPrice,
          distanceToLiquidation,
          marketAnalysis: analysis,
          lastUpdate: new Date().toISOString(),
          activePositionsCount,
        };

        setStatus(tradingStatus);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Помилка завантаження статусу");
    } finally {
      setLoading(false);
    }
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return "text-green-600";
    if (pnl < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getLiquidationColor = (distance: number) => {
    if (distance < 5) return "text-red-600";
    if (distance < 10) return "text-yellow-600";
    return "text-green-600";
  };

  const getStatusColor = (averagingCount: number, maxAveraging: number) => {
    const percentage = (averagingCount / maxAveraging) * 100;
    if (percentage >= 75) return "text-red-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-green-600";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  if (loading && !status) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500 text-center">
          Немає даних для відображення
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Живий статус торгівлі {status.symbol}
        </h2>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600">Автооновлення</span>
          </label>
          <button
            onClick={loadStatus}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Оновлення..." : "Оновити"}
          </button>
        </div>
      </div>

      {/* Основні метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <h3 className="text-sm font-medium text-blue-600 mb-2">
            Поточна ціна
          </h3>
          <p className="text-2xl font-bold text-blue-900">
            {formatCurrency(status.currentPrice)}
          </p>
          {status.marketAnalysis && (
            <p className="text-xs text-blue-600 mt-1">
              {status.marketAnalysis.volatility === "high"
                ? "📊"
                : status.marketAnalysis.volatility === "medium"
                ? "📈"
                : "📉"}{" "}
              {status.marketAnalysis.volatility}
            </p>
          )}
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <h3 className="text-sm font-medium text-green-600 mb-2">P&L</h3>
          <p
            className={`text-2xl font-bold ${getPnLColor(
              status.unrealizedPnL
            )}`}
          >
            {formatCurrency(status.unrealizedPnL)}
          </p>
          <p className={`text-sm font-medium ${getPnLColor(status.roi)}`}>
            ROI: {formatPercentage(status.roi)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
          <h3 className="text-sm font-medium text-yellow-600 mb-2">
            Усереднення
          </h3>
          <p
            className={`text-2xl font-bold ${getStatusColor(
              status.averagingCount,
              status.maxAveraging
            )}`}
          >
            {status.averagingCount} / {status.maxAveraging}
          </p>
          <p className="text-sm text-yellow-600">
            {((status.averagingCount / status.maxAveraging) * 100).toFixed(0)}%
            використано
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
          <h3 className="text-sm font-medium text-red-600 mb-2">Ліквідація</h3>
          <p
            className={`text-2xl font-bold ${getLiquidationColor(
              status.distanceToLiquidation
            )}`}
          >
            {status.liquidationPrice
              ? formatCurrency(status.liquidationPrice)
              : "Н/Д"}
          </p>
          <p
            className={`text-sm font-medium ${getLiquidationColor(
              status.distanceToLiquidation
            )}`}
          >
            Відстань: {status.distanceToLiquidation.toFixed(2)}%
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <h3 className="text-sm font-medium text-purple-600 mb-2">
            Активні позиції
          </h3>
          <p className="text-2xl font-bold text-purple-900">
            {status.activePositionsCount || 0} / 3
          </p>
          <p className="text-sm text-purple-600 mt-1">
            {status.activePositionsCount && status.activePositionsCount > 0
              ? `${status.activePositionsCount} монет з відкритими позиціями`
              : "Немає активних позицій"}
          </p>
        </div>
      </div>

      {/* Детальна інформація */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Інформація про позицію */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Інформація про позицію
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Символ:</span>
              <span className="font-medium">{status.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Розмір позиції:</span>
              <span className="font-medium">
                {status.positionSize.toFixed(4)}
              </span>
            </div>
            {status.entryPrice && (
              <div className="flex justify-between">
                <span className="text-gray-600">Ціна входу:</span>
                <span className="font-medium">
                  {formatCurrency(status.entryPrice)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Плече:</span>
              <span className="font-medium">3x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Тейк-профіт:</span>
              <span className="font-medium">3-9% ROI (1-3% рух ринку)</span>
            </div>
          </div>
        </div>

        {/* Ринкові дані */}
        {status.marketAnalysis && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Ринкові дані (1D)
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Тренд:</span>
                <span
                  className={`font-medium ${
                    status.marketAnalysis.volatility === "low"
                      ? "text-green-600"
                      : status.marketAnalysis.volatility === "medium"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {status.marketAnalysis.volatility === "low"
                    ? "Низька"
                    : status.marketAnalysis.volatility === "medium"
                    ? "Середня"
                    : "Висока"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Волатильність:</span>
                <span className="font-medium">
                  {status.marketAnalysis.volatility === "low"
                    ? "Низька"
                    : status.marketAnalysis.volatility === "medium"
                    ? "Середня"
                    : "Висока"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">RSI:</span>
                <span className="font-medium">
                  {status.marketAnalysis.indicators.rsi.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Консолідація:</span>
                <span
                  className={`font-medium ${
                    status.marketAnalysis.consolidation
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {status.marketAnalysis.consolidation ? "Так" : "Ні"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Прогрес-бар усереднення */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Прогрес усереднення
          </span>
          <span className="text-sm text-gray-500">
            {status.averagingCount} з {status.maxAveraging}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              status.averagingCount >= status.maxAveraging * 0.75
                ? "bg-red-500"
                : status.averagingCount >= status.maxAveraging * 0.5
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
            style={{
              width: `${(status.averagingCount / status.maxAveraging) * 100}%`,
            }}
          ></div>
        </div>
      </div>

      {/* Останнє оновлення */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Останнє оновлення:{" "}
          {new Date(status.lastUpdate).toLocaleString("uk-UA")}
        </p>
      </div>
    </div>
  );
};

export default LiveTradingStatus;
