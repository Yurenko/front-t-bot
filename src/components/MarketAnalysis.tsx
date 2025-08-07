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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Заголовок з перемиканням пар */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Аналіз ринку {selectedSymbol}
          </h2>

          {/* Перемикач активних пар */}
          {activeSessions.length > 0 && (
            <div className="flex space-x-2">
              {activeSessions.map((session) => (
                <button
                  key={session.symbol}
                  onClick={() => setSelectedSymbol(session.symbol)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    selectedSymbol === session.symbol
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {session.symbol}
                </button>
              ))}
            </div>
          )}
        </div>

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
            onClick={loadAnalysis}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Оновлення..." : "Оновити"}
          </button>
        </div>
      </div>

      {analysis.length === 0 ? (
        <p className="text-gray-500">Немає даних для аналізу</p>
      ) : (
        <div className="space-y-6">
          {analysis.map((item, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-gray-50 to-white"
            >
              {/* Заголовок таймфрейму з індикаторами */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <h3 className="text-xl font-bold text-gray-800">
                    {item.timeframe}
                  </h3>
                  <div className="flex space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getVolatilityColor(
                        item.volatility
                      )}`}
                    >
                      {item.volatility === "low"
                        ? "Низька"
                        : item.volatility === "medium"
                        ? "Середня"
                        : "Висока"}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getVolatilityColor(
                        item.volatility
                      )}`}
                    >
                      {item.volatility === "low"
                        ? "Низька"
                        : item.volatility === "medium"
                        ? "Середня"
                        : "Висока"}{" "}
                      волатильність
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      Вага: {formatPercentage(item.weight)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Основні метрики */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Поточна ціна
                  </h4>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(item.currentPrice)}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Рівень підтримки
                  </h4>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(item.supportLevel)}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Рівень опору
                  </h4>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(item.resistanceLevel)}
                  </p>
                </div>
              </div>

              {/* Технічні індикатори - покращений дизайн */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">
                  Технічні індикатори
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        SMA 20
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(item.indicators.sma20)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        SMA 50
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(item.indicators.sma50)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        RSI
                      </p>
                      <p
                        className={`text-lg font-bold ${
                          item.indicators.rsi > 70
                            ? "text-red-600"
                            : item.indicators.rsi < 30
                            ? "text-green-600"
                            : "text-gray-900"
                        }`}
                      >
                        {item.indicators.rsi
                          ? item.indicators.rsi.toFixed(2)
                          : "0.00"}
                      </p>
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              item.indicators.rsi > 70
                                ? "bg-red-500"
                                : item.indicators.rsi < 30
                                ? "bg-green-500"
                                : "bg-blue-500"
                            }`}
                            style={{
                              width: `${Math.min(100, item.indicators.rsi)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        ATR
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(item.indicators.atr)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Смуги Боллінджера - покращений дизайн */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">
                  Смуги Боллінджера
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Верхня смуга
                      </p>
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(item.indicators.bbUpper)}
                      </p>
                      <div className="mt-2">
                        <div className="w-full bg-red-100 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: "100%" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Середня смуга
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(item.indicators.bbMiddle)}
                      </p>
                      <div className="mt-2">
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-gray-500 h-2 rounded-full"
                            style={{ width: "100%" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Нижня смуга
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(item.indicators.bbLower)}
                      </p>
                      <div className="mt-2">
                        <div className="w-full bg-green-100 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: "100%" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Статус консолідації */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      item.consolidation
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {item.consolidation ? "Консолідація" : "Тренд"}
                  </span>
                  {item.consolidation && (
                    <span className="text-sm text-gray-600">
                      Ринок у стані консолідації - сприятливо для входу в
                      позицію
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketAnalysisComponent;
