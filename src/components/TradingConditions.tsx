import React, { useState, useEffect, useRef } from "react";
import { tradingApi, MarketAnalysis } from "../services/api";

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

  const loadConditions = async () => {
    if (loading) {
      console.log("⏳ Умови торгівлі вже завантажуються, пропускаємо...");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await tradingApi.getMarketAnalysis(symbol);
      const analysis =
        response.data.find((a) => a.timeframe === "1d") || response.data[0];

      if (analysis) {
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
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Помилка завантаження умов");
    } finally {
      setLoading(false);
    }
  };

  // useEffect для керування інтервалом
  useEffect(() => {
    // Очищаємо попередній інтервал
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Запускаємо перший аналіз
    if (autoRefresh) {
      loadConditions();

      // Встановлюємо інтервал
      intervalRef.current = setInterval(() => {
        if (autoRefresh) {
          loadConditions();
        }
      }, 60000); // Оновлення кожні 60 секунд
    }

    // Cleanup функція
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, symbol]); // Видаляємо loadConditions з залежностей

  // Окремий useEffect для завантаження при зміні символу
  useEffect(() => {
    if (symbol && !loading) {
      loadConditions();
    }
  }, [symbol]); // Тільки при зміні символу

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

  const getStatusColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
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

  const overallStatus = getOverallStatus();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Умови торгівлі {symbol}
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
            onClick={loadConditions}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Оновлення..." : "Оновити"}
          </button>
        </div>
      </div>

      {/* Загальний статус */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-semibold text-gray-700">
            Загальний статус
          </span>
          <span
            className={`text-lg font-bold ${getStatusColor(overallStatus)}`}
          >
            {overallStatus.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              overallStatus >= 80
                ? "bg-green-500"
                : overallStatus >= 60
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
            style={{ width: `${overallStatus}%` }}
          ></div>
        </div>
      </div>

      {/* Детальні умови */}
      <div className="space-y-4">
        {conditions.map((condition, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              <span className="text-xl">{getStatusIcon(condition.status)}</span>
              <div>
                <h3 className="font-medium text-gray-800">{condition.name}</h3>
                <p className="text-sm text-gray-600">{condition.description}</p>
                {condition.details && (
                  <p className="text-xs text-gray-500 mt-1">
                    {condition.details}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-gray-500">
                Вага: {condition.weight}%
              </span>
              {condition.value && (
                <div className="text-sm font-medium mt-1">
                  <span
                    className={
                      condition.status ? "text-green-600" : "text-red-600"
                    }
                  >
                    {condition.value}
                  </span>
                </div>
              )}
              <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className={`h-2 rounded-full ${
                    condition.status ? "bg-green-500" : "bg-red-500"
                  }`}
                  style={{ width: `${condition.weight}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Пояснення стратегії */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">
          Стратегія "Коридорна торгівля"
        </h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• Бот шукає консолідацію (коридор) на ринку</p>
          <p>• Заходить знизу коридору при сприятливих умовах</p>
          <p>• Закриває позицію при досягненні 1-3% прибутку</p>
          <p>• Використовує усереднення при падінні ціни</p>
        </div>
      </div>

      {/* Інформація про оптимізацію */}
      <div className="mt-4 p-3 bg-green-50 rounded-lg">
        <div className="text-sm text-green-700 space-y-1">
          <p>
            • <strong>Кешування:</strong> Дані кешуються на 30 секунд
          </p>
          <p>
            • <strong>Автооновлення:</strong> Кожні 60 секунд
          </p>
        </div>
      </div>

      {/* Останнє оновлення */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Останнє оновлення:{" "}
          {lastUpdate
            ? new Date(lastUpdate).toLocaleString("uk-UA")
            : "Немає даних"}
        </p>
      </div>
    </div>
  );
};

export default TradingConditions;
