import React, { useState, useEffect } from "react";
import { tradingApi, Trade } from "../services/api";

interface TradingLogsProps {
  sessionId: string;
  symbol: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: "info" | "warning" | "error" | "success";
  message: string;
  details?: any;
}

const TradingLogs: React.FC<TradingLogsProps> = ({ sessionId, symbol }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (autoRefresh) {
      loadTrades();
      const interval = setInterval(loadTrades, 10000); // Оновлення кожні 10 секунд
      return () => clearInterval(interval);
    }
  }, [sessionId, autoRefresh]);

  const loadTrades = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tradingApi.getSessionTrades(sessionId);
      setTrades(response.data);
      generateLogs(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Помилка завантаження логів");
    } finally {
      setLoading(false);
    }
  };

  const generateLogs = (tradeData: Trade[]) => {
    const newLogs: LogEntry[] = [];

    // Додаємо системні логи
    newLogs.push({
      id: `system-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "info",
      message: `Моніторинг сесії ${symbol} активний`,
      details: { symbol, sessionId },
    });

    // Додаємо логи з торгівлі
    tradeData.forEach((trade, index) => {
      const tradeLog: LogEntry = {
        id: trade.id,
        timestamp: trade.createdAt,
        type: getTradeLogType(trade.type),
        message: getTradeMessage(trade),
        details: trade,
      };
      newLogs.push(tradeLog);
    });

    setLogs(newLogs);
  };

  const getTradeLogType = (
    tradeType: string
  ): "info" | "warning" | "error" | "success" => {
    switch (tradeType) {
      case "entry":
        return "info";
      case "averaging":
        return "warning";
      case "exit":
        return "success";
      default:
        return "info";
    }
  };

  const getTradeMessage = (trade: Trade): string => {
    const price = trade.price.toFixed(4);
    const quantity = trade.quantity.toFixed(4);
    const value = trade.value.toFixed(2);

    switch (trade.type) {
      case "entry":
        return `Вхід в позицію: ${trade.side.toUpperCase()} ${quantity} ${symbol} по ціні $${price}`;
      case "averaging":
        return `Усереднення позиції: ${trade.side.toUpperCase()} ${quantity} ${symbol} по ціні $${price}`;
      case "exit":
        const pnl = trade.pnl ? ` (P&L: $${trade.pnl.toFixed(2)})` : "";
        const roi = trade.roi ? ` (ROI: ${(trade.roi * 100).toFixed(2)}%)` : "";
        return `Вихід з позиції: ${trade.side.toUpperCase()} ${quantity} ${symbol} по ціні $${price}${pnl}${roi}`;
      default:
        return `Торгова операція: ${trade.type} ${trade.side} ${quantity} ${symbol}`;
    }
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-600 bg-green-100 border-green-200";
      case "warning":
        return "text-yellow-600 bg-yellow-100 border-yellow-200";
      case "error":
        return "text-red-600 bg-red-100 border-red-200";
      default:
        return "text-blue-600 bg-blue-100 border-blue-200";
    }
  };

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      default:
        return "ℹ️";
    }
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("uk-UA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getTradeTypeLabel = (type: string) => {
    switch (type) {
      case "entry":
        return "Вхід";
      case "averaging":
        return "Усереднення";
      case "exit":
        return "Вихід";
      default:
        return type;
    }
  };

  const getTradeSideLabel = (side: string) => {
    return side === "buy" ? "Покупка" : "Продаж";
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Логи торгівлі {symbol}
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
            onClick={loadTrades}
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

      {/* Статистика торгівлі */}
      {trades.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Статистика торгівлі
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded border">
              <div className="text-sm font-medium text-gray-600">
                Всього операцій
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {trades.length}
              </div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-sm font-medium text-gray-600">
                Входи в позицію
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {trades.filter((t) => t.type === "entry").length}
              </div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-sm font-medium text-gray-600">
                Усереднення
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {trades.filter((t) => t.type === "averaging").length}
              </div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-sm font-medium text-gray-600">Виходи</div>
              <div className="text-2xl font-bold text-green-600">
                {trades.filter((t) => t.type === "exit").length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Логи */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Поки що немає логів торгівлі
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`p-4 rounded-lg border ${getLogTypeColor(log.type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <span className="text-lg">{getLogTypeIcon(log.type)}</span>
                  <div className="flex-1">
                    <p className="font-medium">{log.message}</p>
                    <p className="text-sm opacity-75 mt-1">
                      {formatDateTime(log.timestamp)}
                    </p>
                    {log.details &&
                      log.details.type === "exit" &&
                      log.details.pnl && (
                        <p
                          className={`text-sm font-medium mt-1 ${
                            log.details.pnl > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          P&L: ${log.details.pnl.toFixed(2)}
                          {log.details.roi &&
                            ` (ROI: ${(log.details.roi * 100).toFixed(2)}%)`}
                        </p>
                      )}
                  </div>
                </div>
                {log.details && log.details.type && (
                  <div className="ml-4 text-right">
                    <span className="px-2 py-1 rounded text-xs bg-white bg-opacity-50">
                      {getTradeTypeLabel(log.details.type)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Детальна таблиця торгівлі */}
      {trades.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Детальна таблиця торгівлі
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сторона
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ціна
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Кількість
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Значення
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDateTime(trade.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          trade.type === "entry"
                            ? "bg-blue-100 text-blue-800"
                            : trade.type === "averaging"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {getTradeTypeLabel(trade.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {getTradeSideLabel(trade.side)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ${trade.price.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {trade.quantity.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ${trade.value.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {trade.pnl ? (
                        <span
                          className={`font-medium ${
                            trade.pnl > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          ${trade.pnl.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingLogs;
