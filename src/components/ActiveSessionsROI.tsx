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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">ROI Активних Сесій</h2>
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
            onClick={loadSessions}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Оновлення..." : "Оновити"}
          </button>
        </div>
      </div>

      {/* Загальна статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">Всього сесій</div>
          <div className="text-2xl font-bold text-blue-800">
            {sessions.length}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-600 font-medium">З позиціями</div>
          <div className="text-2xl font-bold text-green-800">
            {sessionsWithPositions.length}
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 font-medium">Без позицій</div>
          <div className="text-2xl font-bold text-gray-800">
            {sessionsWithoutPositions.length}
          </div>
        </div>
        <div
          className={`p-4 rounded-lg ${
            totalPnL >= 0 ? "bg-green-50" : "bg-red-50"
          }`}
        >
          <div
            className={`text-sm font-medium ${
              totalPnL >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            Загальний P&L
          </div>
          <div
            className={`text-2xl font-bold ${
              totalPnL >= 0 ? "text-green-800" : "text-red-800"
            }`}
          >
            {formatCurrency(totalPnL)}
          </div>
        </div>
      </div>

      {/* Сесії з позиціями */}
      {sessionsWithPositions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Сесії з відкритими позиціями ({sessionsWithPositions.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessionsWithPositions.map((session) => (
              <div
                key={session.sessionId}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {getStatusIcon(session.hasPosition)}
                    </span>
                    <span className="font-bold text-gray-800">
                      {session.symbol}
                    </span>
                  </div>
                  <div
                    className={`text-right ${getROIColor(session.roi || 0)}`}
                  >
                    <div className="text-lg font-bold">
                      {getROIIcon(session.roi || 0)}{" "}
                      {formatPercentage(session.roi || 0)}
                    </div>
                    <div className="text-sm">
                      {formatCurrency(session.pnl || 0)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Вхід:</span>
                    <span className="font-medium">
                      ${session.entryPrice?.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Поточна:</span>
                    <span className="font-medium">
                      ${session.currentPrice?.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Розмір:</span>
                    <span className="font-medium">
                      {session.positionSize?.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Баланс:</span>
                    <span className="font-medium">
                      {formatCurrency(session.currentBalance)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Загальний P&L:</span>
                    <span
                      className={
                        session.totalPnL >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {formatCurrency(session.totalPnL)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={() =>
                        handleCloseSession(session.sessionId, session.symbol)
                      }
                      className="w-full px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                    >
                      Закрити сесію
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Сесії без позицій */}
      {sessionsWithoutPositions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Сесії без позицій ({sessionsWithoutPositions.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessionsWithoutPositions.map((session) => (
              <div
                key={session.sessionId}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {getStatusIcon(session.hasPosition)}
                    </span>
                    <span className="font-bold text-gray-800">
                      {session.symbol}
                    </span>
                  </div>
                  <div className="text-right text-gray-500">
                    <div className="text-sm">Очікує сигналу</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Початковий баланс:</span>
                    <span className="font-medium">
                      {formatCurrency(session.initialBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Поточний баланс:</span>
                    <span className="font-medium">
                      {formatCurrency(session.currentBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Торговий баланс:</span>
                    <span className="font-medium">
                      {formatCurrency(session.tradingBalance)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Загальний P&L:</span>
                    <span
                      className={
                        session.totalPnL >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {formatCurrency(session.totalPnL)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={() =>
                        handleCloseSession(session.sessionId, session.symbol)
                      }
                      className="w-full px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                    >
                      Закрити сесію
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Повідомлення якщо немає сесій */}
      {sessions.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500 text-lg">Немає активних сесій</div>
          <div className="text-gray-400 text-sm mt-2">
            Створіть нову сесію для початку торгівлі
          </div>
        </div>
      )}

      {/* Останнє оновлення */}
      <div className="mt-6 text-center">
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

export default ActiveSessionsROI;
