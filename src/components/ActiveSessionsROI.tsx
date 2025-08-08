import React, { useState, useEffect, useRef } from "react";
import { tradingApi, ActiveSessionWithROI } from "../services/api";

const ActiveSessionsROI: React.FC = () => {
  const [sessions, setSessions] = useState<ActiveSessionWithROI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadSessions = async () => {
    if (loading) {
      console.log("⏳ Дані ROI вже завантажуються, пропускаємо...");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await tradingApi.getActiveSessionsWithROI();
      setSessions(response.data);
      setLastUpdate(new Date().toISOString());
    } catch (err: any) {
      setError(err.response?.data?.message || "Помилка завантаження ROI");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSession = async (sessionId: string, symbol: string) => {
    if (window.confirm(`Ви впевнені, що хочете закрити сесію для ${symbol}?`)) {
      try {
        await tradingApi.closeSession(sessionId);
        // Оновлюємо список після закриття
        loadSessions();
      } catch (err: any) {
        setError(err.response?.data?.message || "Помилка закриття сесії");
      }
    }
  };

  // useEffect для керування інтервалом
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (autoRefresh) {
      loadSessions();

      intervalRef.current = setInterval(() => {
        if (autoRefresh) {
          loadSessions();
        }
      }, 30000); // Оновлення кожні 30 секунд
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh]);

  const getROIColor = (roi: number) => {
    if (roi >= 0.05) return "text-green-600"; // 5% і більше
    if (roi >= 0.02) return "text-yellow-600"; // 2-5%
    if (roi >= 0) return "text-blue-600"; // 0-2%
    return "text-red-600"; // Від'ємний
  };

  const getROIIcon = (roi: number) => {
    if (roi >= 0.05) return "🚀";
    if (roi >= 0.02) return "📈";
    if (roi >= 0) return "📊";
    return "📉";
  };

  const getStatusColor = (hasPosition: boolean) => {
    return hasPosition ? "text-green-600" : "text-gray-500";
  };

  const getStatusIcon = (hasPosition: boolean) => {
    return hasPosition ? "🟢" : "⚪";
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  if (loading && sessions.length === 0) {
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

  const totalPnL = sessions.reduce((sum, session) => sum + session.totalPnL, 0);
  const sessionsWithPositions = sessions.filter((s) => s.hasPosition);
  const sessionsWithoutPositions = sessions.filter((s) => !s.hasPosition);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Контроли */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
              ROI активних сесій
            </h2>
            <p className="text-sm text-gray-600">
              Моніторинг прибутковості активних торгових сесій
            </p>
            {lastUpdate && (
              <p className="text-xs text-gray-500 mt-1">
                Останнє оновлення: {new Date(lastUpdate).toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Автооновлення</span>
            </label>
            <button
              onClick={loadSessions}
              disabled={loading}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {loading ? "Оновлення..." : "Оновити"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Статистика */}
      {sessions.length > 0 && (
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
                {sessions.length}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="text-xs font-medium text-green-600 mb-1">
                З позиціями
              </h4>
              <p className="text-lg font-bold text-green-900">
                {sessions.filter((s) => s.hasPosition).length}
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <h4 className="text-xs font-medium text-yellow-600 mb-1">
                Прибуткових
              </h4>
              <p className="text-lg font-bold text-yellow-900">
                {sessions.filter((s) => (s.roi || 0) > 0).length}
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <h4 className="text-xs font-medium text-red-600 mb-1">
                Збиткових
              </h4>
              <p className="text-lg font-bold text-red-900">
                {sessions.filter((s) => (s.roi || 0) < 0).length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Список сесій */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
          Активні сесії
        </h3>
        {sessions.length > 0 ? (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.sessionId}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                  {/* Основна інформація */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-lg">
                        {getStatusIcon(session.hasPosition)}
                      </span>
                      <h4 className="text-base md:text-lg font-semibold text-gray-900">
                        {session.symbol}
                      </h4>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          session.hasPosition
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {session.hasPosition ? "Позиція" : "Очікує"}
                      </span>
                    </div>

                    {/* ROI та P&L */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">ROI</p>
                        <p
                          className={`text-sm font-semibold ${getROIColor(
                            session.roi || 0
                          )}`}
                        >
                          {getROIIcon(session.roi || 0)}{" "}
                          {formatPercentage(session.roi || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">P&L</p>
                        <p
                          className={`text-sm font-semibold ${
                            (session.pnl || 0) >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(session.pnl || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Загальний P&L</p>
                        <p
                          className={`text-sm font-semibold ${
                            session.totalPnL >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(session.totalPnL)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Баланс</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(session.currentBalance)}
                        </p>
                      </div>
                    </div>

                    {/* Додаткова інформація */}
                    {session.hasPosition &&
                      session.entryPrice &&
                      session.currentPrice && (
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-gray-500">Вхід:</span>
                            <p className="font-medium">
                              ${session.entryPrice.toFixed(4)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Поточна:</span>
                            <p className="font-medium">
                              ${session.currentPrice.toFixed(4)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Розмір:</span>
                            <p className="font-medium">
                              {session.positionSize?.toFixed(4) || "0.0000"}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Зміна:</span>
                            <p
                              className={`font-medium ${
                                session.currentPrice > session.entryPrice
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {(
                                ((session.currentPrice - session.entryPrice) /
                                  session.entryPrice) *
                                100
                              ).toFixed(2)}
                              %
                            </p>
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Кнопки дій */}
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() =>
                        handleCloseSession(session.sessionId, session.symbol)
                      }
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                    >
                      Закрити
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              Немає активних сесій для відображення
            </p>
            <button
              onClick={loadSessions}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Оновити
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveSessionsROI;
