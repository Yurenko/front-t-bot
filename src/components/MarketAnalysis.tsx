import React, { useState, useEffect, useCallback } from "react";
import { MarketAnalysis, TradingSession } from "../services/api";
import { websocketService } from "../services/websocket";

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
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("connecting");
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [cacheTimeout] = useState(60000); // 60 секунд кешування

  const loadAnalysis = useCallback(async () => {
    // Перевіряємо кеш - якщо дані недавно оновлювалися, не робимо новий запит
    const now = Date.now();
    if (analysis.length > 0 && now - lastUpdateTime < cacheTimeout) {
      console.log(
        `📊 Використовуємо кешовані дані для ${selectedSymbol} (останнє оновлення: ${Math.round(
          (now - lastUpdateTime) / 1000
        )}с тому)`
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Спочатку пробуємо WebSocket
      let data;
      try {
        data = await websocketService.getMarketAnalysis(selectedSymbol);
        console.log(
          `📊 Отримано дані через WebSocket для ${selectedSymbol}:`,
          data
        );
      } catch (wsError) {
        console.warn(
          `⚠️ WebSocket помилка для ${selectedSymbol}, переключаємося на REST API:`,
          wsError
        );
        // Fallback на REST API
        const response = await fetch(
          `/api/trading/market/analysis/${selectedSymbol}`
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        data = await response.json();
        console.log(
          `📊 Отримано дані через REST API для ${selectedSymbol}:`,
          data
        );
      }

      // Перевіряємо чи дані не пусті або не містять тільки нулі
      if (!data || data.length === 0) {
        throw new Error("Немає даних для відображення");
      }

      // Перевіряємо чи всі значення не нулі
      const hasValidData = data.some((item: any) => {
        return (
          item &&
          ((item.currentPrice && item.currentPrice > 0) ||
            (item.indicators &&
              (item.indicators.sma20 > 0 ||
                item.indicators.sma50 > 0 ||
                item.indicators.rsi > 0)))
        );
      });

      if (!hasValidData) {
        console.warn(
          `⚠️ Дані для ${selectedSymbol} містять тільки нулі або невалідні значення:`,
          data
        );
        throw new Error("Отримано невалідні дані (нулі)");
      }

      setAnalysis(data);
      setLastUpdateTime(Date.now()); // Оновлюємо час останнього оновлення
    } catch (err: any) {
      console.error(
        `❌ Помилка завантаження аналізу для ${selectedSymbol}:`,
        err
      );
      setError(err.message || "Помилка завантаження аналізу");
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol, analysis.length, lastUpdateTime, cacheTimeout]);

  useEffect(() => {
    // Підписуємося на оновлення аналізу ринку для цього символу
    websocketService.subscribeToMarketAnalysis(selectedSymbol);

    // Слухаємо оновлення аналізу
    websocketService.on(
      `market_analysis_${selectedSymbol}`,
      (data: MarketAnalysis[]) => {
        setAnalysis(data);
      }
    );

    // Підписуємося на оновлення сесій
    websocketService.subscribeToSessions();

    // Слухаємо оновлення сесій
    websocketService.on("sessions", (data: TradingSession[]) => {
      const active = data.filter((session) => session.status === "active");
      setActiveSessions(active);
    });

    // Слухаємо стан з'єднання
    websocketService.on("connect", () => {
      setConnectionStatus("connected");
    });

    websocketService.on("disconnect", () => {
      setConnectionStatus("disconnected");
    });

    // Перевіряємо поточний стан з'єднання
    if (websocketService.isWebSocketConnected()) {
      setConnectionStatus("connected");
    } else {
      setConnectionStatus("disconnected");
    }

    loadAnalysis();
    loadActiveSessions();

    return () => {
      websocketService.unsubscribeFromMarketAnalysis(selectedSymbol);
      websocketService.unsubscribeFromSessions();
    };
  }, [selectedSymbol]);

  useEffect(() => {
    setSelectedSymbol(symbol);
    // Автоматично завантажуємо аналіз коли змінюється символ
    if (symbol && symbol !== selectedSymbol) {
      loadAnalysis();
    }
  }, [symbol]);

  // Автоматичне оновлення даних
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      console.log(`🔄 Автоматичне оновлення аналізу для ${selectedSymbol}`);
      loadAnalysis();
    }, 60000); // 60 секунд (збільшуємо для зменшення навантаження на API)

    return () => clearInterval(interval);
  }, [autoRefresh, selectedSymbol, loadAnalysis]);

  const loadActiveSessions = async () => {
    try {
      const data = await websocketService.getAllSessions();
      const active = data.filter(
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

  // const formatCurrency = (amount: number) => {
  //   return new Intl.NumberFormat("en-US", {
  //     style: "currency",
  //     currency: "USD",
  //   }).format(amount);
  // };

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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">
                Помилка завантаження аналізу
              </h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={loadAnalysis}
              className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Спробувати знову
            </button>
          </div>
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
            <div className="flex items-center space-x-2">
              <button
                onClick={loadAnalysis}
                disabled={loading}
                className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Оновлення..." : "Оновити"}
              </button>
              <div className="flex items-center space-x-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-green-500"
                      : connectionStatus === "connecting"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                ></div>
                <span className="text-xs text-gray-500">
                  {connectionStatus === "connected"
                    ? "WebSocket"
                    : connectionStatus === "connecting"
                    ? "Підключення..."
                    : "REST API"}
                </span>
                {lastUpdateTime > 0 && (
                  <span className="text-xs text-gray-400">
                    {Math.round((Date.now() - lastUpdateTime) / 1000)}с тому
                  </span>
                )}
              </div>
            </div>
          </div>
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
                    $
                    {item.currentPrice && item.currentPrice > 0
                      ? item.currentPrice.toFixed(4)
                      : "0.0000"}
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
                    $
                    {item.indicators.sma20 && item.indicators.sma20 > 0
                      ? item.indicators.sma20.toFixed(4)
                      : "0.0000"}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">
                    SMA 50
                  </h4>
                  <p className="text-sm font-semibold text-gray-900">
                    $
                    {item.indicators.sma50 && item.indicators.sma50 > 0
                      ? item.indicators.sma50.toFixed(4)
                      : "0.0000"}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">
                    RSI
                  </h4>
                  <p className="text-sm font-semibold text-gray-900">
                    {item.indicators.rsi && item.indicators.rsi > 0
                      ? item.indicators.rsi.toFixed(2)
                      : "0.00"}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">
                    ATR
                  </h4>
                  <p className="text-sm font-semibold text-gray-900">
                    $
                    {item.indicators.atr && item.indicators.atr > 0
                      ? item.indicators.atr.toFixed(4)
                      : "0.0000"}
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
                      $
                      {item.indicators.bbUpper && item.indicators.bbUpper > 0
                        ? item.indicators.bbUpper.toFixed(4)
                        : "0.0000"}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <span className="text-blue-600 font-medium">Середня</span>
                    <p className="text-blue-900">
                      $
                      {item.indicators.bbMiddle && item.indicators.bbMiddle > 0
                        ? item.indicators.bbMiddle.toFixed(4)
                        : "0.0000"}
                    </p>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <span className="text-green-600 font-medium">Нижня</span>
                    <p className="text-green-900">
                      $
                      {item.indicators.bbLower && item.indicators.bbLower > 0
                        ? item.indicators.bbLower.toFixed(4)
                        : "0.0000"}
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
                    $
                    {item.supportLevel && item.supportLevel > 0
                      ? item.supportLevel.toFixed(4)
                      : "0.0000"}
                  </p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <h4 className="text-xs font-medium text-red-600 mb-1">
                    Опір
                  </h4>
                  <p className="text-sm font-semibold text-red-900">
                    $
                    {item.resistanceLevel && item.resistanceLevel > 0
                      ? item.resistanceLevel.toFixed(4)
                      : "0.0000"}
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
