import React, { useState, useEffect } from "react";
import { tradingApi, MarketAnalysis, TradingSession } from "../services/api";

interface MarketAnalysisProps {
  symbol: string;
}

const MarketAnalysisComponent: React.FC<MarketAnalysisProps> = ({ symbol }) => {
  const [analysis, setAnalysis] = useState<MarketAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<TradingSession[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState(symbol);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadAnalysis();
    loadActiveSessions();
  }, [selectedSymbol]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadAnalysis();
        loadActiveSessions();
      }, 30000); // Оновлення кожні 30 секунд
      return () => clearInterval(interval);
    }
  }, [selectedSymbol, autoRefresh]);

  useEffect(() => {
    setSelectedSymbol(symbol);
  }, [symbol]);

  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tradingApi.getMarketAnalysis(selectedSymbol);
      setAnalysis(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Помилка завантаження аналізу");
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSessions = async () => {
    try {
      const response = await tradingApi.getAllSessions();
      const active = response.data.filter(
        (session: TradingSession) => session.status === "active"
      );
      setActiveSessions(active);
    } catch (error) {
      console.error("Помилка завантаження активних сесій:", error);
    }
  };

  const getVolatilityColor = (volatility: string) => {
    switch (volatility) {
      case "low":
        return "text-green-600 bg-green-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "high":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
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
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Контроли */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Символ
              </label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {activeSessions.map((session) => (
                  <option key={session.symbol} value={session.symbol}>
                    {session.symbol}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoRefresh" className="text-sm text-gray-700">
                Автооновлення
              </label>
            </div>
          </div>
          <button
            onClick={loadAnalysis}
            disabled={loading}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {loading ? "Оновлення..." : "Оновити"}
          </button>
        </div>
      </div>

      {/* Результати аналізу */}
      {analysis.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {analysis.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-4 md:p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900">
                    {item.symbol}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Таймфрейм: {item.timeframe}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg md:text-xl font-bold text-gray-900">
                    ${item.currentPrice.toFixed(4)}
                  </p>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getVolatilityColor(
                      item.volatility
                    )}`}
                  >
                    {item.volatility === "low"
                      ? "Низька"
                      : item.volatility === "medium"
                      ? "Середня"
                      : "Висока"}
                  </span>
                </div>
              </div>

              {/* Індикатори */}
              <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">
                    SMA 20
                  </h4>
                  <p className="text-sm font-semibold text-gray-900">
                    ${item.indicators.sma20.toFixed(4)}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">
                    SMA 50
                  </h4>
                  <p className="text-sm font-semibold text-gray-900">
                    ${item.indicators.sma50.toFixed(4)}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">
                    RSI
                  </h4>
                  <p className="text-sm font-semibold text-gray-900">
                    {item.indicators.rsi.toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">
                    ATR
                  </h4>
                  <p className="text-sm font-semibold text-gray-900">
                    ${item.indicators.atr.toFixed(4)}
                  </p>
                </div>
              </div>

              {/* Bollinger Bands */}
              <div className="space-y-2 mb-4">
                <h4 className="text-sm font-medium text-gray-700">
                  Bollinger Bands
                </h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-red-50 p-2 rounded">
                    <span className="text-red-600 font-medium">Верхня</span>
                    <p className="text-red-900">
                      ${item.indicators.bbUpper.toFixed(4)}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <span className="text-blue-600 font-medium">Середня</span>
                    <p className="text-blue-900">
                      ${item.indicators.bbMiddle.toFixed(4)}
                    </p>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <span className="text-green-600 font-medium">Нижня</span>
                    <p className="text-green-900">
                      ${item.indicators.bbLower.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Рівні підтримки та опору */}
              <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <h4 className="text-xs font-medium text-green-600 mb-1">
                    Підтримка
                  </h4>
                  <p className="text-sm font-semibold text-green-900">
                    ${item.supportLevel.toFixed(4)}
                  </p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <h4 className="text-xs font-medium text-red-600 mb-1">
                    Опір
                  </h4>
                  <p className="text-sm font-semibold text-red-900">
                    ${item.resistanceLevel.toFixed(4)}
                  </p>
                </div>
              </div>

              {/* Додаткова інформація */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Консолідація:</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.consolidation
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {item.consolidation ? "Так" : "Ні"}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">Вага:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatPercentage(item.weight)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 text-center">
          <p className="text-gray-500 mb-4">
            Немає даних аналізу для {selectedSymbol}
          </p>
          <button
            onClick={loadAnalysis}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Завантажити аналіз
          </button>
        </div>
      )}
    </div>
  );
};

export default MarketAnalysisComponent;
