import React, { useState, useEffect, useCallback, useRef } from "react";
import { MarketAnalysis, TradingSession } from "../services/api";
import { websocketService } from "../services/websocket";

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

    if (activeSessions.length === 0) {
      console.log("📝 Немає активних сесій для аналізу");
      return;
    }

    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: activeSessions.length });

    console.log(
      `🚀 Запуск аналізу для ${activeSessions.length} активних сесій...`
    );

    try {
      const symbols = activeSessions.map((session) => session.symbol);
      console.log(`📊 Запит пакетного аналізу для: ${symbols.join(", ")}`);

      // Обмежуємо кількість символів для одного запиту
      const maxSymbolsPerRequest = 10;
      let allResults: MarketAnalysis[][] = [];

      for (let i = 0; i < symbols.length; i += maxSymbolsPerRequest) {
        const batchSymbols = symbols.slice(i, i + maxSymbolsPerRequest);
        console.log(
          `📦 Обробка batch ${
            Math.floor(i / maxSymbolsPerRequest) + 1
          }: ${batchSymbols.join(", ")}`
        );

        const startTime = Date.now();
        const response = await websocketService.getMarketAnalysisBatch(
          batchSymbols
        );
        const endTime = Date.now();

        console.log(
          `✅ Batch ${Math.floor(i / maxSymbolsPerRequest) + 1} завершено за ${
            endTime - startTime
          }мс`
        );

        // Перевіряємо чи response є масивом
        if (response && Array.isArray(response)) {
          allResults = allResults.concat(response);
        } else {
          console.error(
            "❌ Неочікуваний формат відповіді для batch:",
            response
          );
          // Додаємо порожні масиви для цього batch
          allResults = allResults.concat(
            new Array(batchSymbols.length).fill([])
          );
        }

        // Оновлюємо прогрес
        setProgress({
          current: Math.min(i + maxSymbolsPerRequest, symbols.length),
          total: symbols.length,
        });
      }

      console.log(`📈 Всього отримано аналізів: ${allResults.length}`);

      const results = allResults
        .map((analysisData: MarketAnalysis[], index: number) => {
          const session = activeSessions[index];

          if (!session) {
            console.error(`❌ Сесія не знайдена для індексу ${index}`);
            return null;
          }

          if (
            analysisData &&
            Array.isArray(analysisData) &&
            analysisData.length > 0
          ) {
            const conditions = calculateConditions(analysisData, session);
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
              analysis: analysisData,
              overallStatus,
              percentage,
            };
          } else {
            console.error(
              `❌ Помилка аналізу для ${session.symbol}: немає даних або неправильний формат`
            );
            return {
              session,
              conditions: [],
              analysis: [],
              overallStatus: "error",
              percentage: 0,
            };
          }
        })
        .filter((item): item is SessionConditions => item !== null); // Правильна фільтрація для TypeScript

      setSessionsConditions(results);
    } catch (err: any) {
      console.error("❌ Загальна помилка аналізу:", err);
      setError(err.message || "Помилка завантаження аналізу");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [activeSessions, loading]);

  // useEffect для керування WebSocket підписками
  useEffect(() => {
    if (activeSessions.length > 0) {
      // Підписуємося на оновлення аналізу ринку для всіх символів
      activeSessions.forEach((session) => {
        websocketService.subscribeToMarketAnalysis(session.symbol);
      });

      // Слухаємо оновлення аналізу для всіх символів
      activeSessions.forEach((session) => {
        websocketService.on(
          `market_analysis_${session.symbol}`,
          (data: MarketAnalysis[]) => {
            loadAllAnalysis();
          }
        );
      });

      loadAllAnalysis();

      return () => {
        activeSessions.forEach((session) => {
          websocketService.unsubscribeFromMarketAnalysis(session.symbol);
        });
      };
    }
  }, [activeSessions.length]);

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
      details: `Діапазон цін: ${
        analysis.resistanceLevel > analysis.supportLevel &&
        analysis.currentPrice > 0
          ? (
              ((analysis.resistanceLevel - analysis.supportLevel) /
                analysis.currentPrice) *
              100
            ).toFixed(2)
          : "0.00"
      }%`,
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
      details: `Позиція: ${
        analysis.resistanceLevel > analysis.supportLevel
          ? (
              ((analysis.currentPrice - analysis.supportLevel) /
                (analysis.resistanceLevel - analysis.supportLevel)) *
              100
            ).toFixed(1)
          : "0.0"
      }% від діапазону`,
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
    <div className="space-y-4 md:space-y-6">
      {/* Контроли */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
              Умови торгівлі для всіх сесій
            </h2>
            <p className="text-sm text-gray-600">
              Аналіз умов торгівлі для всіх активних сесій
            </p>
            {progress && (
              <p className="text-xs text-gray-500 mt-1">
                Прогрес: {progress.current}/{progress.total} сесій
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

      {/* Статистика */}
      {sessionsConditions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
            Загальна статистика
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="text-xs font-medium text-blue-600 mb-1">
                Всього сесій
              </h4>
              <p className="text-lg font-bold text-blue-900">
                {sessionsConditions.length}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="text-xs font-medium text-green-600 mb-1">
                Готові
              </h4>
              <p className="text-lg font-bold text-green-900">
                {
                  sessionsConditions.filter((s) => s.overallStatus === "ready")
                    .length
                }
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <h4 className="text-xs font-medium text-yellow-600 mb-1">
                Частково
              </h4>
              <p className="text-lg font-bold text-yellow-900">
                {
                  sessionsConditions.filter(
                    (s) => s.overallStatus === "partial"
                  ).length
                }
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <h4 className="text-xs font-medium text-red-600 mb-1">
                Не готові
              </h4>
              <p className="text-lg font-bold text-red-900">
                {
                  sessionsConditions.filter(
                    (s) => s.overallStatus === "not-ready"
                  ).length
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Список сесій */}
      {sessionsConditions.length > 0 && (
        <div className="space-y-4">
          {sessionsConditions.map((sessionData, index) => (
            <div
              key={sessionData.session.id}
              className="bg-white rounded-lg shadow-md p-4 md:p-6"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900">
                    {sessionData.session.symbol}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      sessionData.overallStatus
                    )}`}
                  >
                    {getStatusText(sessionData.overallStatus)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {sessionData.percentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {sessionData.conditions.filter((c) => c.isMet).length}/
                      {sessionData.conditions.length} умов
                    </p>
                  </div>
                  <div className="w-16 h-2 bg-gray-200 rounded-full">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        sessionData.percentage >= 80
                          ? "bg-green-500"
                          : sessionData.percentage >= 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${sessionData.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Умови */}
              <div className="space-y-3">
                {sessionData.conditions.map((condition, conditionIndex) => (
                  <div
                    key={conditionIndex}
                    className={`p-3 rounded-lg border-l-4 ${
                      condition.isMet
                        ? "bg-green-50 border-green-400"
                        : "bg-red-50 border-red-400"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm">
                            {condition.isMet ? "✅" : "❌"}
                          </span>
                          <h4 className="text-sm font-semibold text-gray-900">
                            {condition.name}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          {condition.description}
                        </p>
                        {condition.details && (
                          <p className="text-xs text-gray-500">
                            {condition.details}
                          </p>
                        )}
                        {condition.value && (
                          <p className="text-xs font-medium text-gray-700 mt-1">
                            {condition.value}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Рекомендації */}
              <div className="mt-4 p-3 rounded-lg bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Рекомендації
                </h4>
                <div className="text-xs text-gray-600">
                  {sessionData.overallStatus === "ready" ? (
                    <p className="text-green-700">
                      ✅ Умови виконані - можна розглядати відкриття позиції
                    </p>
                  ) : sessionData.overallStatus === "partial" ? (
                    <p className="text-yellow-700">
                      ⚠️ Частково готові умови - можна використовувати менший
                      розмір позиції
                    </p>
                  ) : (
                    <p className="text-red-700">
                      ❌ Умови не виконані - рекомендується очікувати
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Повідомлення про відсутність даних */}
      {sessionsConditions.length === 0 && !loading && !error && (
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 text-center">
          <p className="text-gray-500 mb-4">
            Немає активних сесій для аналізу умов торгівлі
          </p>
          <button
            onClick={loadAllAnalysis}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Завантажити аналіз
          </button>
        </div>
      )}
    </div>
  );
};

export default AllTradingConditions;
