import React, { useState, useEffect } from "react";
import { tradingApi } from "../services/api";

interface AutoTradingStatus {
  isRunning: boolean;
  activeSessions: number;
  intervalMs: number;
  lastUpdate: string;
  totalAnalyses: number;
  successfulAnalyses: number;
  failedAnalyses: number;
}

const AutoTradingControl: React.FC = () => {
  const [status, setStatus] = useState<AutoTradingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intervalMs, setIntervalMs] = useState(30000); // 30 секунд за замовчуванням
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (autoRefresh) {
      loadStatus();
      const interval = setInterval(loadStatus, 5000); // Оновлення кожні 5 секунд
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadStatus = async () => {
    try {
      const response = await tradingApi.getAutoTradingStatus();
      setStatus(response.data);
      // Оновлюємо інтервал з сервера
      if (response.data.intervalMs) {
        setIntervalMs(response.data.intervalMs);
      }
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Помилка завантаження статусу");
    }
  };

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      await tradingApi.startAutoTrading(intervalMs);
      await loadStatus();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Помилка запуску автоматичного аналізу"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setError(null);
    try {
      await tradingApi.stopAutoTrading();
      await loadStatus();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Помилка зупинки автоматичного аналізу"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInterval = async () => {
    if (!status?.isRunning) return;

    setLoading(true);
    setError(null);
    try {
      await tradingApi.updateAutoTradingInterval(intervalMs);
      await loadStatus();
    } catch (err: any) {
      setError(err.response?.data?.message || "Помилка оновлення інтервалу");
    } finally {
      setLoading(false);
    }
  };

  const formatInterval = (ms: number) => {
    if (ms < 1000) return `${ms}мс`;
    if (ms < 60000) return `${Math.round(ms / 1000)}с`;
    return `${Math.round(ms / 60000)}хв`;
  };

  const formatLastUpdate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("uk-UA");
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Контроли */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
              Автоматичний аналіз торгівлі
            </h2>
            <p className="text-sm text-gray-600">
              Автоматичний моніторинг та аналіз активних сесій
            </p>
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
              onClick={loadStatus}
              disabled={loading}
              className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
            >
              Оновити
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        {/* Кнопки управління */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          {status?.isRunning ? (
            <button
              onClick={handleStop}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
            >
              {loading ? "Зупинка..." : "Зупинити автоаналіз"}
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {loading ? "Запуск..." : "Запустити автоаналіз"}
            </button>
          )}
        </div>

        {/* Налаштування інтервалу */}
        {status?.isRunning && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">
              Налаштування інтервалу
            </h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-blue-700 mb-1">
                  Інтервал аналізу (мс)
                </label>
                <input
                  type="number"
                  min="5000"
                  max="300000"
                  step="5000"
                  value={intervalMs}
                  onChange={(e) =>
                    setIntervalMs(parseInt(e.target.value) || 30000)
                  }
                  className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <button
                onClick={handleUpdateInterval}
                disabled={loading}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                Оновити
              </button>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Поточний інтервал: {formatInterval(intervalMs)}
            </p>
          </div>
        )}
      </div>

      {/* Статус */}
      {status && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
            Статус автоаналізу
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Статус */}
            <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
              <h4 className="text-xs font-medium text-gray-500 mb-1">Статус</h4>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    status.isRunning ? "bg-green-500" : "bg-red-500"
                  }`}
                ></span>
                <span className="text-sm font-semibold text-gray-900">
                  {status.isRunning ? "Активний" : "Неактивний"}
                </span>
              </div>
            </div>

            {/* Активні сесії */}
            <div className="bg-blue-50 p-3 md:p-4 rounded-lg">
              <h4 className="text-xs font-medium text-blue-600 mb-1">
                Активні сесії
              </h4>
              <p className="text-lg font-bold text-blue-900">
                {status.activeSessions}
              </p>
            </div>

            {/* Інтервал */}
            <div className="bg-yellow-50 p-3 md:p-4 rounded-lg">
              <h4 className="text-xs font-medium text-yellow-600 mb-1">
                Інтервал
              </h4>
              <p className="text-sm font-semibold text-yellow-900">
                {formatInterval(status.intervalMs)}
              </p>
            </div>

            {/* Останнє оновлення */}
            <div className="bg-green-50 p-3 md:p-4 rounded-lg">
              <h4 className="text-xs font-medium text-green-600 mb-1">
                Останнє оновлення
              </h4>
              <p className="text-sm font-semibold text-green-900">
                {formatLastUpdate(status.lastUpdate)}
              </p>
            </div>
          </div>

          {/* Статистика */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Статистика аналізів
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h5 className="text-xs font-medium text-gray-500 mb-1">
                  Всього аналізів
                </h5>
                <p className="text-lg font-bold text-gray-900">
                  {status.totalAnalyses}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <h5 className="text-xs font-medium text-green-600 mb-1">
                  Успішних
                </h5>
                <p className="text-lg font-bold text-green-900">
                  {status.successfulAnalyses}
                </p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <h5 className="text-xs font-medium text-red-600 mb-1">
                  Невдач
                </h5>
                <p className="text-lg font-bold text-red-900">
                  {status.failedAnalyses}
                </p>
              </div>
            </div>
          </div>

          {/* Прогрес-бар успішності */}
          {status.totalAnalyses > 0 && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-700">
                  Успішність
                </span>
                <span className="text-xs text-gray-500">
                  {Math.round(
                    (status.successfulAnalyses / status.totalAnalyses) * 100
                  )}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (status.successfulAnalyses / status.totalAnalyses) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutoTradingControl;
