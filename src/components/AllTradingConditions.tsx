import React, { useState, useEffect, useCallback, useRef } from "react";
import { tradingApi, MarketAnalysis, TradingSession } from "../services/api";

interface AllTradingConditionsProps {
  sessions: TradingSession[];
}

interface TradingCondition {
  name: string;
  description: string;
  isMet: boolean;
  value?: string;
  details?: string;
}

interface SessionConditions {
  session: TradingSession;
  conditions: TradingCondition[];
  analysis: MarketAnalysis[];
  overallStatus: string;
  percentage: number;
}

const AllTradingConditions: React.FC<AllTradingConditionsProps> = ({
  sessions,
}) => {
  // Фільтруємо тільки активні сесії
  const activeSessions = sessions.filter(
    (session) => session.status === "active"
  );
  const [sessionsConditions, setSessionsConditions] = useState<
    SessionConditions[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  // Використовуємо useRef для зберігання інтервалу
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadAllAnalysis = useCallback(async () => {
    // Захист від повторних викликів
    if (loading) {
      console.log("⏳ Аналіз вже виконується, пропускаємо...");
      return;
    }

    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: activeSessions.length });

    console.log(
      `Запуск аналізу для ${activeSessions.length} активних сесій...`
    );

    try {
      const symbols = activeSessions.map((session) => session.symbol);
      console.log(`📊 Запит пакетного аналізу для: ${symbols.join(", ")}`);

      const startTime = Date.now();
      const response = await tradingApi.getMarketAnalysisBatch(symbols);
      const endTime = Date.now();

      console.log(`✅ Пакетний аналіз завершено за ${endTime - startTime}мс`);
      console.log(
        `📈 Успішно: ${response.data.successful}, Помилок: ${response.data.failed}`
      );

      const results = response.data.results.map((result, index) => {
        const session = activeSessions[index];

        if (result.success && result.analysis) {
          const conditions = calculateConditions(result.analysis, session);
          const metConditions = conditions.filter((c) => c.isMet).length;
          const percentage = (metConditions / conditions.length) * 100;

          let overallStatus = "not-ready";
          // Нова логіка: потрібно виконати всі основні умови для входу
          const mainConditions = conditions.slice(0, 4); // Перші 4 умови - основні (без балансу та позицій)
          const mainConditionsMet = mainConditions.filter(
            (c) => c.isMet
          ).length;

          if (mainConditionsMet === mainConditions.length) {
            overallStatus = "ready";
          } else if (percentage >= 70) {
            overallStatus = "partial";
          }

          return {
            session,
            conditions,
            analysis: result.analysis,
            overallStatus,
            percentage,
          };
        } else {
          console.error(
            `❌ Помилка аналізу для ${session.symbol}:`,
            result.error
          );
          return {
            session,
            conditions: [],
            analysis: [],
            overallStatus: "error",
            percentage: 0,
          };
        }
      });

      setSessionsConditions(results);
    } catch (err: any) {
      console.error("❌ Загальна помилка аналізу:", err);
      setError(err.response?.data?.message || "Помилка завантаження аналізу");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [activeSessions, loading]);

  // Окремий useEffect для керування інтервалом
  useEffect(() => {
    // Очищаємо попередній інтервал
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Запускаємо перший аналіз
    if (autoRefresh && activeSessions.length > 0) {
      loadAllAnalysis();

      // Встановлюємо інтервал
      intervalRef.current = setInterval(() => {
        if (autoRefresh && activeSessions.length > 0) {
          loadAllAnalysis();
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
  }, [autoRefresh, activeSessions.length]); // Видаляємо loadAllAnalysis з залежностей

  // Окремий useEffect для завантаження при зміні сесій
  useEffect(() => {
    if (activeSessions.length > 0 && !loading) {
      loadAllAnalysis();
    }
  }, [activeSessions.length]); // Тільки при зміні кількості сесій

  const calculateConditions = (
    analysisData: MarketAnalysis[],
    currentSession: TradingSession
  ): TradingCondition[] => {
    if (analysisData.length === 0) return [];

    // Використовуємо аналіз з денного таймфрейму як основу
    const analysis =
      analysisData.find((a) => a.timeframe === "1d") || analysisData[0];

    const newConditions: TradingCondition[] = [];

    // 1. Консолідація ринку
    newConditions.push({
      name: "Консолідація ринку",
      description: "Ринок в стані консолідації (низька волатильність)",
      isMet: analysis.consolidation,
      value: analysis.consolidation ? "✅ Консолідація" : "❌ Тренд",
      details: `Діапазон цін: ${(
        ((analysis.resistanceLevel - analysis.supportLevel) /
          analysis.currentPrice) *
        100
      ).toFixed(2)}%`,
    });

    // 2. Позиція в коридорі
    const isInLowerThird = (analysis: MarketAnalysis): boolean => {
      const corridorRange = analysis.resistanceLevel - analysis.supportLevel;
      if (corridorRange <= 0) return false;

      const pricePosition =
        (analysis.currentPrice - analysis.supportLevel) / corridorRange;
      return pricePosition <= 0.33;
    };

    newConditions.push({
      name: "Позиція в коридорі",
      description: "Ціна в нижній третині коридору",
      isMet: isInLowerThird(analysis),
      value: isInLowerThird(analysis)
        ? "✅ В нижній третині"
        : "❌ Не в нижній третині",
      details: `Позиція: ${(
        ((analysis.currentPrice - analysis.supportLevel) /
          (analysis.resistanceLevel - analysis.supportLevel)) *
        100
      ).toFixed(1)}% від діапазону`,
    });

    // 3. Волатильність
    newConditions.push({
      name: "Волатильність",
      description: "Волатильність не висока",
      isMet: analysis.volatility !== "high",
      value:
        analysis.volatility === "low"
          ? "✅ Низька"
          : analysis.volatility === "medium"
          ? "⚠️ Середня"
          : "❌ Висока",
      details: `ATR: ${analysis.indicators.atr.toFixed(4)} (${
        analysis.volatility
      })`,
    });

    // 4. Технічні індикатори
    const checkTechnicalIndicators = (analysis: MarketAnalysis): boolean => {
      // Перевіряємо RSI
      const rsiOk =
        analysis.indicators.rsi >= 30 && analysis.indicators.rsi <= 70;

      // Перевіряємо SMA
      const smaOk = analysis.currentPrice > analysis.indicators.sma20;

      return rsiOk && smaOk;
    };

    newConditions.push({
      name: "Технічні індикатори",
      description: "RSI, SMA та інші індикатори в нормі",
      isMet: checkTechnicalIndicators(analysis),
      value: checkTechnicalIndicators(analysis)
        ? "✅ В нормі"
        : "❌ Не в нормі",
      details: `SMA20: ${analysis.indicators.sma20.toFixed(
        2
      )}, RSI: ${analysis.indicators.rsi.toFixed(2)}`,
    });

    // 5. Наявність балансу для торгівлі
    newConditions.push({
      name: "Торговий баланс",
      description: "Повинен бути доступний баланс для торгівлі",
      isMet: currentSession.tradingBalance > 0,
      value: currentSession.tradingBalance > 0 ? "✅ Доступно" : "❌ Вичерпано",
      details: `Доступно: $${currentSession.tradingBalance.toFixed(2)}`,
    });

    // 6. Відсутність активних позицій
    newConditions.push({
      name: "Активні позиції",
      description: "Не повинно бути активних позицій для нового входу",
      isMet: currentSession.averagingCount === 0,
      value:
        currentSession.averagingCount === 0
          ? "✅ Немає позицій"
          : "❌ Є активні позиції",
      details:
        currentSession.averagingCount > 0
          ? `Кількість усереднень: ${currentSession.averagingCount}/4`
          : "Готово до входу",
    });

    return newConditions;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "text-green-600 bg-green-100";
      case "partial":
        return "text-yellow-600 bg-yellow-100";
      case "not-ready":
        return "text-red-600 bg-red-100";
      case "error":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "ready":
        return "Готово до входу";
      case "partial":
        return "Частково готово";
      case "not-ready":
        return "Не готово";
      case "error":
        return "Помилка завантаження";
      default:
        return "Завантаження...";
    }
  };

  if (activeSessions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500 mb-4">
          Немає активних сесій для перегляду умов торгівлі
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Умови торгівлі для всіх сесій
        </h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-600">Автооновлення</span>
            </label>
            {autoRefresh && (
              <span className="text-xs text-gray-500">(кожні 60с)</span>
            )}
          </div>
          <button
            onClick={() => {
              if (!loading) {
                loadAllAnalysis();
              }
            }}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Оновлення..." : "Оновити"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && progress && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center justify-between">
            <span>Аналіз умов торгівлі...</span>
            <span className="text-sm">
              {progress.current}/{progress.total} сесій
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Загальна статистика */}
      {sessionsConditions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Загальна статистика
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {activeSessions.length}
              </div>
              <div className="text-sm text-gray-600">Активних сесій</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {
                  sessionsConditions.filter((s) => s.overallStatus === "ready")
                    .length
                }
              </div>
              <div className="text-sm text-gray-600">Готові до входу</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {
                  sessionsConditions.filter(
                    (s) => s.overallStatus === "partial"
                  ).length
                }
              </div>
              <div className="text-sm text-gray-600">Частково готові</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {
                  sessionsConditions.filter(
                    (s) => s.overallStatus === "not-ready"
                  ).length
                }
              </div>
              <div className="text-sm text-gray-600">Не готові</div>
            </div>
          </div>
        </div>
      )}

      {/* Умови для кожної сесії */}
      <div className="space-y-6">
        {sessionsConditions.map((sessionData, index) => (
          <div
            key={sessionData.session.id}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  {sessionData.session.symbol}
                </h3>
                <p className="text-sm text-gray-600">
                  Баланс: $
                  {sessionData.session.currentBalance?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="text-right">
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    sessionData.overallStatus
                  )}`}
                >
                  {getStatusText(sessionData.overallStatus)}
                </div>
                <div className="text-lg font-bold mt-1">
                  {Math.round(sessionData.percentage)}%
                </div>
              </div>
            </div>

            {/* Загальний статус для сесії */}
            <div
              className={`p-4 rounded-lg mb-4 ${getStatusColor(
                sessionData.overallStatus
              )}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold">
                    {getStatusText(sessionData.overallStatus)}
                  </h4>
                  <p className="text-sm opacity-75">
                    {sessionData.conditions.filter((c) => c.isMet).length} з{" "}
                    {sessionData.conditions.length} умов виконано
                  </p>
                </div>
                <div className="text-2xl font-bold">
                  {Math.round(sessionData.percentage)}%
                </div>
              </div>
            </div>

            {/* Детальні умови */}
            <div className="space-y-3">
              {sessionData.conditions.map((condition, conditionIndex) => (
                <div
                  key={conditionIndex}
                  className={`p-3 rounded-lg border ${
                    condition.isMet
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-800 mb-1">
                        {condition.name}
                      </h5>
                      <p className="text-sm text-gray-600 mb-1">
                        {condition.description}
                      </p>
                      {condition.details && (
                        <p className="text-xs text-gray-500">
                          {condition.details}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 text-right">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          condition.isMet
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {condition.value}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Поточні ціни */}
            {sessionData.analysis.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">
                  Поточні дані ринку
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {sessionData.analysis.slice(0, 3).map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="bg-white p-2 rounded border"
                    >
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        {item.timeframe}
                      </div>
                      <div className="text-sm font-bold text-gray-900">
                        ${item.currentPrice.toFixed(4)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.volatility === "high"
                          ? "📊"
                          : item.volatility === "medium"
                          ? "📈"
                          : "📉"}{" "}
                        {item.volatility}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
          <p>• Сесія залишається активною після закриття позиції</p>
        </div>
      </div>

      {/* Інформація про оптимізацію */}
      <div className="mt-4 p-4 bg-green-50 rounded-lg">
        <h3 className="font-semibold text-green-800 mb-2">
          Оптимізація продуктивності
        </h3>
        <div className="text-sm text-green-700 space-y-1">
          <p>
            • <strong>Кешування:</strong> Дані кешуються на 30 секунд для
            зменшення навантаження
          </p>
          <p>
            • <strong>Оптимізація:</strong> Запити виконуються партіями по 3 для
            уникнення rate limiting
          </p>
          <p>
            • <strong>Автооновлення:</strong> Кожні 60 секунд для зменшення
            навантаження на API
          </p>
        </div>
      </div>
    </div>
  );
};

export default AllTradingConditions;
