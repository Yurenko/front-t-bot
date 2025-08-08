import React, { useState, useEffect } from "react";
import { tradingApi, TradingSession, Trade } from "../services/api";
import LiveTradingStatus from "./LiveTradingStatus";

interface SessionStatusProps {
  session: TradingSession;
  onRefresh: () => void;
}

const SessionStatus: React.FC<SessionStatusProps> = ({
  session,
  onRefresh,
}) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadTrades();
  }, [session.id]);

  const loadTrades = async () => {
    try {
      console.log("Loading trades for session ID:", session.id);
      const response = await tradingApi.getSessionTrades(session.id.toString());
      setTrades(response.data);
    } catch (error) {
      console.error("Помилка завантаження угод:", error);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await tradingApi.analyzeAndTrade(session.symbol);
      onRefresh();
      await loadTrades();
    } catch (error) {
      console.error("Помилка аналізу:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCloseSession = async () => {
    if (
      !window.confirm(`Ви впевнені, що хочете закрити сесію ${session.symbol}?`)
    ) {
      return;
    }

    // Додаємо діагностику
    console.log("Session object:", session);
    console.log("Session ID:", session.id);
    console.log("Session ID type:", typeof session.id);

    if (!session.id) {
      console.error("Session ID is undefined or null!");
      alert("Помилка: ID сесії не знайдено");
      return;
    }

    try {
      await tradingApi.closeSession(session.id);
      onRefresh();
    } catch (error) {
      console.error("Помилка закриття сесії:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-100";
      case "closed":
        return "text-blue-600 bg-blue-100";
      case "liquidated":
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

  const calculateCurrentROI = () => {
    if (!session.averageEntryPrice || session.totalPositionSize === 0) return 0;
    // Це приблизний розрахунок, реальний ROI залежить від поточної ціни
    return (
      ((session.currentBalance - session.initialBalance) /
        session.initialBalance) *
      100
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 space-y-3 sm:space-y-0">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
          Сесія {session.symbol}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
          >
            {loading ? "Оновлення..." : "Оновити"}
          </button>
          {session.status === "active" && (
            <>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {analyzing ? "Аналіз..." : "Аналізувати"}
              </button>
              <button
                onClick={handleCloseSession}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                Закрити сесію
              </button>
            </>
          )}
        </div>
      </div>

      {/* Статус сесії */}
      <div className="mb-4 md:mb-6">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
            session.status
          )}`}
        >
          {session.status === "active"
            ? "Активна"
            : session.status === "closed"
            ? "Закрита"
            : "Ліквідована"}
        </span>
      </div>

      {/* Основна інформація */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
          <h3 className="text-xs md:text-sm font-medium text-gray-500">
            Початковий баланс
          </h3>
          <p className="text-base md:text-xl font-bold text-gray-900">
            {formatCurrency(session.initialBalance)}
          </p>
        </div>

        <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
          <h3 className="text-xs md:text-sm font-medium text-gray-500">
            Поточний баланс
          </h3>
          <p className="text-base md:text-xl font-bold text-gray-900">
            {formatCurrency(session.currentBalance)}
          </p>
        </div>

        <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
          <h3 className="text-xs md:text-sm font-medium text-gray-500">
            Загальний P&L
          </h3>
          <p
            className={`text-base md:text-xl font-bold ${
              session.totalPnL >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(session.totalPnL)}
          </p>
        </div>

        <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
          <h3 className="text-xs md:text-sm font-medium text-gray-500">ROI</h3>
          <p
            className={`text-base md:text-xl font-bold ${
              calculateCurrentROI() >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {calculateCurrentROI() ? calculateCurrentROI().toFixed(2) : "0.00"}%
          </p>
        </div>
      </div>

      {/* Детальна інформація */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
        <div>
          <h3 className="text-base md:text-lg font-semibold mb-3">
            Розподіл балансу
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Торговий баланс:</span>
              <span className="font-medium">
                {formatCurrency(session.tradingBalance)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Резервний баланс:</span>
              <span className="font-medium">
                {formatCurrency(session.reserveBalance)}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-base md:text-lg font-semibold mb-3">Позиція</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Розмір позиції:</span>
              <span className="font-medium">
                {session.totalPositionSize.toFixed(4)}
              </span>
            </div>
            {session.averageEntryPrice && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Середня ціна входу:</span>
                <span className="font-medium">
                  ${session.averageEntryPrice.toFixed(4)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Кількість усереднень:</span>
              <span className="font-medium">{session.averagingCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Trading Status */}
      {session.status === "active" && (
        <div className="mb-4 md:mb-6">
          <LiveTradingStatus session={session} />
        </div>
      )}

      {/* Останні угоди */}
      <div>
        <h3 className="text-base md:text-lg font-semibold mb-3">
          Останні угоди
        </h3>
        {trades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сторона
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ціна
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Кількість
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trades.slice(0, 5).map((trade) => (
                  <tr key={trade.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs md:text-sm">
                      {trade.type === "entry"
                        ? "Вхід"
                        : trade.type === "averaging"
                        ? "Усереднення"
                        : "Вихід"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs md:text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          trade.side === "buy"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {trade.side === "buy" ? "Купівля" : "Продаж"}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs md:text-sm">
                      ${trade.price.toFixed(4)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs md:text-sm">
                      {trade.quantity.toFixed(4)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs md:text-sm">
                      <span
                        className={
                          trade.pnl && trade.pnl >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {trade.pnl ? formatCurrency(trade.pnl) : "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Немає угод для цієї сесії</p>
        )}
      </div>
    </div>
  );
};

export default SessionStatus;
