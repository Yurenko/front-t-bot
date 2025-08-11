import React, { useState, useEffect } from "react";
import {
  tradingApi,
  ActiveSessionWithROI,
  TradingSession,
} from "../services/api";

interface SessionsGridProps {
  onSessionSelect: (session: TradingSession) => void;
  selectedSession: TradingSession | null;
  onRefresh: () => void;
}

const SessionsGrid: React.FC<SessionsGridProps> = ({
  onSessionSelect,
  selectedSession,
  onRefresh,
}) => {
  const [sessionsWithROI, setSessionsWithROI] = useState<
    ActiveSessionWithROI[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessionsWithROI = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tradingApi.getActiveSessionsWithROI();
      setSessionsWithROI(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Помилка завантаження ROI");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessionsWithROI();
  }, []);

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

  const handleSessionClick = (session: ActiveSessionWithROI) => {
    // Конвертуємо ActiveSessionWithROI в TradingSession
    const tradingSession: TradingSession = {
      id: session.sessionId,
      symbol: session.symbol,
      initialBalance: session.initialBalance,
      reserveBalance: session.reserveBalance || 0,
      tradingBalance: session.tradingBalance,
      currentBalance: session.currentBalance,
      totalPnL: session.totalPnL,
      status: session.status as "active" | "closed" | "liquidated",
      averageEntryPrice: session.entryPrice || null,
      totalPositionSize: session.positionSize || 0,
      averagingCount: session.hasPosition ? 1 : 0,
      liquidationPrice: null,
      enableVolatilityCheck: session.enableVolatilityCheck,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSessionSelect(tradingSession);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
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

  const sessionsWithPositions = sessionsWithROI.filter((s) => s.hasPosition);
  const sessionsWithoutPositions = sessionsWithROI.filter(
    (s) => !s.hasPosition
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Заголовок та кнопка оновлення */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900">
          Торгові сесії
        </h2>
        <button
          onClick={() => {
            loadSessionsWithROI();
            onRefresh();
          }}
          disabled={loading}
          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {loading ? "Оновлення..." : "Оновити"}
        </button>
      </div>

      {/* Сесії з позиціями */}
      {sessionsWithPositions.length > 0 && (
        <div>
          <h3 className="text-base md:text-lg font-semibold text-gray-700 mb-3 md:mb-4">
            Активні сесії з позиціями ({sessionsWithPositions.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3 md:gap-4">
            {sessionsWithPositions.map((session) => (
              <div
                key={session.sessionId}
                onClick={() => handleSessionClick(session)}
                className={`bg-white rounded-lg shadow-md p-3 md:p-4 cursor-pointer transition-all hover:shadow-lg border-2 ${
                  selectedSession?.id === session.sessionId
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base md:text-lg">
                    {getStatusIcon(session.hasPosition)}
                  </span>
                  <span className="font-bold text-gray-800 text-sm md:text-base">
                    {session.symbol}
                  </span>
                </div>

                <div
                  className={`text-center mb-2 ${getROIColor(
                    session.roi || 0
                  )}`}
                >
                  <div className="text-base md:text-lg font-bold">
                    {getROIIcon(session.roi || 0)}{" "}
                    {formatPercentage(session.roi || 0)}
                  </div>
                  <div className="text-xs md:text-sm">
                    {formatCurrency(session.pnl || 0)}
                  </div>
                </div>

                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Вхід:</span>
                    <span>${session.entryPrice?.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Поточна:</span>
                    <span>${session.currentPrice?.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Баланс:</span>
                    <span>{formatCurrency(session.currentBalance)}</span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-xs">
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Сесії без позицій */}
      {sessionsWithoutPositions.length > 0 && (
        <div>
          <h3 className="text-base md:text-lg font-semibold text-gray-700 mb-3 md:mb-4">
            Сесії без позицій ({sessionsWithoutPositions.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3 md:gap-4">
            {sessionsWithoutPositions.map((session) => (
              <div
                key={session.sessionId}
                onClick={() => handleSessionClick(session)}
                className={`bg-white rounded-lg shadow-md p-3 md:p-4 cursor-pointer transition-all hover:shadow-lg border-2 ${
                  selectedSession?.id === session.sessionId
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base md:text-lg">
                    {getStatusIcon(session.hasPosition)}
                  </span>
                  <span className="font-bold text-gray-800 text-sm md:text-base">
                    {session.symbol}
                  </span>
                </div>

                <div
                  className={`text-center mb-2 ${getROIColor(
                    session.roi || 0
                  )}`}
                >
                  <div className="text-base md:text-lg font-bold">
                    {getROIIcon(session.roi || 0)}{" "}
                    {formatPercentage(session.roi || 0)}
                  </div>
                  <div className="text-xs md:text-sm">
                    {formatCurrency(session.pnl || 0)}
                  </div>
                </div>

                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Баланс:</span>
                    <span>{formatCurrency(session.currentBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Торговий:</span>
                    <span>{formatCurrency(session.tradingBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Резерв:</span>
                    <span>{formatCurrency(session.reserveBalance || 0)}</span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-xs">
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Повідомлення, якщо немає сесій */}
      {sessionsWithROI.length === 0 && !loading && !error && (
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 text-center">
          <p className="text-gray-500 mb-4">Немає активних торгових сесій</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Створити нову сесію
          </button>
        </div>
      )}
    </div>
  );
};

export default SessionsGrid;
