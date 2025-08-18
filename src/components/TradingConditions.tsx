import React, { useState, useEffect, useRef } from "react";
import { MarketAnalysis } from "../services/api";
import { websocketService } from "../services/websocket";

interface TradingConditionsProps {
  symbol: string;
}

interface ConditionStatus {
  name: string;
  status: boolean;
  description: string;
  weight: number;
  details?: string; // Додаємо детальну інформацію
  value?: string; // Додаємо конкретне значення
}

const TradingConditions: React.FC<TradingConditionsProps> = ({ symbol }) => {
  const [conditions, setConditions] = useState<ConditionStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Використовуємо useRef для зберігання інтервалу
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateConditions = (analysis: MarketAnalysis) => {
    const currentConditions: ConditionStatus[] = [
      {
        name: "Консолідація ринку",
        status: analysis.consolidation,
        description: "Ринок в стані консолідації (низька волатильність)",
        weight: 35,
        details: `Діапазон цін: ${(
          ((analysis.resistanceLevel - analysis.supportLevel) /
            analysis.currentPrice) *
          100
        ).toFixed(2)}%`,
        value: analysis.consolidation ? "✅ Консолідація" : "❌ Тренд",
      },
      {
        name: "Позиція в коридорі",
        status: isInLowerThird(analysis),
        description: "Ціна в нижній третині коридору",
        weight: 30,
        details: `Позиція: ${(
          ((analysis.currentPrice - analysis.supportLevel) /
            (analysis.resistanceLevel - analysis.supportLevel)) *
          100
        ).toFixed(1)}% від діапазону`,
        value: isInLowerThird(analysis)
          ? "✅ В нижній третині"
          : "❌ Не в нижній третині",
      },
      {
        name: "Волатильність",
        status: analysis.volatility !== "high",
        description: "Волатильність не висока",
        weight: 25,
        details: `ATR: ${analysis.indicators.atr.toFixed(4)} (${
          analysis.volatility
        })`,
        value:
          analysis.volatility === "low"
            ? "✅ Низька"
            : analysis.volatility === "medium"
            ? "⚠️ Середня"
            : "❌ Висока",
      },

      {
        name: "Технічні індикатори",
        status: checkTechnicalIndicators(analysis),
        description: "RSI, SMA та інші індикатори в нормі",
        weight: 10,
        details: `SMA20: ${analysis.indicators.sma20.toFixed(
          2
        )}, RSI: ${analysis.indicators.rsi.toFixed(2)}`,
        value: checkTechnicalIndicators(analysis)
          ? "✅ В нормі"
          : "❌ Не в нормі",
      },
    ];

    setConditions(currentConditions);
    setLastUpdate(new Date().toISOString());
  };

  const loadConditions = async () => {
    if (loading) {
      console.log("⏳ Умови торгівлі вже завантажуються, пропускаємо...");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await websocketService.getMarketAnalysis(symbol);

      // Перевіряємо, чи data є масивом
      if (!Array.isArray(data)) {
        console.error("API повернув не масив:", data);
        setError("Неправильний формат даних від сервера");
        return;
      }

      const analysis = data.find((a) => a.timeframe === "1d") || data[0];

      if (analysis) {
        updateConditions(analysis);
      } else {
        setError("Не знайдено аналіз для цього символу");
      }
    } catch (err: any) {
      console.error("Помилка завантаження умов торгівлі:", err);
      setError(err.message || "Помилка завантаження умов");
    } finally {
      setLoading(false);
    }
  };

  // useEffect для керування WebSocket підписками
  useEffect(() => {
    // Підписуємося на оновлення аналізу ринку для цього символу
    websocketService.subscribeToMarketAnalysis(symbol);

    // Слухаємо оновлення аналізу
    websocketService.on(
      `market_analysis_${symbol}`,
      (data: MarketAnalysis[]) => {
        if (Array.isArray(data)) {
          const analysis = data.find((a) => a.timeframe === "1d") || data[0];
          if (analysis) {
            updateConditions(analysis);
          }
        } else {
          console.error("WebSocket повернув не масив:", data);
        }
      }
    );

    loadConditions();

    return () => {
      websocketService.unsubscribeFromMarketAnalysis(symbol);
    };
  }, [symbol]);

  const isInLowerThird = (analysis: MarketAnalysis): boolean => {
    const corridorRange = analysis.resistanceLevel - analysis.supportLevel;
    if (corridorRange <= 0) return false;

    const pricePosition =
      (analysis.currentPrice - analysis.supportLevel) / corridorRange;
    return pricePosition <= 0.33;
  };

  const checkTechnicalIndicators = (analysis: MarketAnalysis): boolean => {
    // Перевіряємо RSI
    const rsiOk =
      analysis.indicators.rsi >= 30 && analysis.indicators.rsi <= 70;

    // Перевіряємо SMA
    const smaOk = analysis.currentPrice > analysis.indicators.sma20;

    return rsiOk && smaOk;
  };

  const getOverallStatus = () => {
    if (conditions.length === 0) return 0;

    const totalWeight = conditions.reduce(
      (sum, condition) => sum + condition.weight,
      0
    );
    const satisfiedWeight = conditions
      .filter((condition) => condition.status)
      .reduce((sum, condition) => sum + condition.weight, 0);

    return (satisfiedWeight / totalWeight) * 100;
  };

  const getOverallPercentage = () => {
    if (conditions.length === 0) return 0;
    return (getOverallStatus() / 100) * 100; // Переводимо відсоток у відсоток
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusIcon = (status: boolean) => {
    return status ? "✅" : "❌";
  };

  if (loading && conditions.length === 0) {
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
    <div className="space-y-4 md:space-y-6">
      {/* Контроли */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
              Умови торгівлі для {symbol}
            </h2>
            <p className="text-sm text-gray-600">
              Аналіз поточних умов для входу в позицію
            </p>
            {lastUpdate && (
              <p className="text-xs text-gray-500 mt-1">
                Останнє оновлення: {new Date(lastUpdate).toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3"></div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Загальний статус */}
      {conditions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
            Загальний статус умов
          </h3>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">
                  {getStatusIcon(getOverallStatus() > 0)}
                </span>
                <span className="text-lg font-semibold text-gray-900">
                  {getOverallStatus() > 0
                    ? "Умови виконані"
                    : "Умови не виконані"}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(
                    getOverallPercentage()
                  )}`}
                  style={{ width: `${getOverallPercentage()}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Виконано: {getOverallPercentage().toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Детальні умови */}
      {conditions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
            Детальні умови
          </h3>
          <div className="space-y-4">
            {conditions.map((condition, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  condition.status
                    ? "bg-green-50 border-green-400"
                    : "bg-red-50 border-red-400"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">
                        {getStatusIcon(condition.status)}
                      </span>
                      <h4 className="text-sm md:text-base font-semibold text-gray-900">
                        {condition.name}
                      </h4>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          condition.status
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {condition.weight}%
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 mb-2">
                      {condition.description}
                    </p>
                    {condition.details && (
                      <p className="text-xs text-gray-500 mb-1">
                        {condition.details}
                      </p>
                    )}
                    {condition.value && (
                      <p className="text-xs font-medium text-gray-700">
                        {condition.value}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Рекомендації */}
      {conditions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
            Рекомендації
          </h3>
          <div className="space-y-3">
            {getOverallStatus() > 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-green-500 text-lg">✅</span>
                  <div>
                    <h4 className="text-sm font-semibold text-green-800 mb-1">
                      Умови для входу виконані
                    </h4>
                    <p className="text-xs text-green-700">
                      Можна розглядати відкриття позиції. Рекомендується
                      використовувати стратегію усереднення.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-yellow-500 text-lg">⚠️</span>
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                      Умови не виконані
                    </h4>
                    <p className="text-xs text-yellow-700">
                      Рекомендується очікувати покращення умов або
                      використовувати менший розмір позиції.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <span className="text-blue-500 text-lg">ℹ️</span>
                <div>
                  <h4 className="text-sm font-semibold text-blue-800 mb-1">
                    Стратегія усереднення
                  </h4>
                  <p className="text-xs text-blue-700">
                    При падінні ціни на 2-3% можна додавати до позиції. Максимум
                    4 усереднення.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Повідомлення про відсутність даних */}
      {conditions.length === 0 && !loading && !error && (
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 text-center">
          <p className="text-gray-500 mb-4">
            Немає даних для аналізу умов торгівлі
          </p>
          <button
            onClick={loadConditions}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Завантажити аналіз
          </button>
        </div>
      )}
    </div>
  );
};

export default TradingConditions;
