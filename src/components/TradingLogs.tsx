import React, { useState, useEffect } from "react";
import { Trade } from "../services/api";
import { websocketService } from "../services/websocket";

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
    // Підписуємося на оновлення угод для цієї сесії
    websocketService.subscribeToTrades(sessionId);

    // Слухаємо оновлення угод
    websocketService.on(`trades_${sessionId}`, (data: Trade[]) => {
      setTrades(data);
      generateLogs(data);
    });

    loadTrades();

    return () => {
      websocketService.unsubscribeFromTrades(sessionId);
    };
  }, [sessionId]);

  const loadTrades = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await websocketService.getSessionTrades(sessionId);
      setTrades(data);
      generateLogs(data);
    } catch (err: any) {
      setError(err.message || "Помилка завантаження логів");
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
    <div className="space-y-4 md:space-y-6">
      {/* Контроли */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
              Логи торгівлі для {symbol}
            </h2>
            <p className="text-sm text-gray-600">
              Останні угоди та системні повідомлення
            </p>
          </div>
          <div className="flex items-center space-x-3"></div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Логи */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
          Історія логів
        </h3>
        {logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-3 md:p-4 rounded-lg border-l-4 ${
                  log.type === "error"
                    ? "bg-red-50 border-red-400"
                    : log.type === "warning"
                    ? "bg-yellow-50 border-yellow-400"
                    : log.type === "success"
                    ? "bg-green-50 border-green-400"
                    : "bg-blue-50 border-blue-400"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <span className="text-lg">{getLogTypeIcon(log.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-sm md:text-base font-medium text-gray-900">
                        {log.message}
                      </p>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>
                    {log.details && (
                      <div className="mt-2 text-xs text-gray-600">
                        {log.details.type && (
                          <span className="inline-block bg-gray-100 px-2 py-1 rounded mr-2">
                            {getTradeTypeLabel(log.details.type)}
                          </span>
                        )}
                        {log.details.side && (
                          <span
                            className={`inline-block px-2 py-1 rounded ${
                              log.details.side === "buy"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {getTradeSideLabel(log.details.side)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Немає логів для відображення</p>
        )}
      </div>

      {/* Таблиця угод */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
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
                {trades.slice(0, 10).map((trade) => (
                  <tr key={trade.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs md:text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                    <td className="px-3 py-2 whitespace-nowrap text-xs md:text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          trade.side === "buy"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {getTradeSideLabel(trade.side)}
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
                        {trade.pnl ? `$${trade.pnl.toFixed(2)}` : "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Немає угод для відображення</p>
        )}
      </div>
    </div>
  );
};

export default TradingLogs;
