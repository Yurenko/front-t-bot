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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Автоматичний аналіз торгівлі
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
            onClick={loadStatus}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            Оновити
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Статус */}
      {status && (
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {status.isRunning ? "🟢 Активний" : "🔴 Зупинений"}
              </div>
              <div className="text-sm text-gray-600">Статус</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {status.activeSessions}
              </div>
              <div className="text-sm text-gray-600">Активних сесій</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-lg font-bold text-gray-600">
                {formatLastUpdate(status.lastUpdate)}
              </div>
              <div className="text-sm text-gray-600">Останнє оновлення</div>
            </div>
          </div>

          {/* Статистика аналізів */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {status.totalAnalyses}
              </div>
              <div className="text-sm text-gray-600">Всього аналізів</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {status.successfulAnalyses}
              </div>
              <div className="text-sm text-gray-600">Успішних</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-lg font-bold text-red-600">
                {status.failedAnalyses}
              </div>
              <div className="text-sm text-gray-600">Помилок</div>
            </div>
          </div>
        </div>
      )}

      {/* Налаштування інтервалу */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Налаштування інтервалу
        </h3>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Інтервал аналізу
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                value={intervalMs}
                onChange={(e) => setIntervalMs(Number(e.target.value))}
                min="5000"
                max="300000"
                step="5000"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="px-3 py-2 text-gray-600">
                {formatInterval(intervalMs)}
              </span>
            </div>
          </div>
          {status?.isRunning && (
            <button
              onClick={handleUpdateInterval}
              disabled={loading}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              Оновити інтервал
            </button>
          )}
        </div>

        {/* Швидкі налаштування */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setIntervalMs(10000)}
            className={`px-3 py-1 rounded text-sm ${
              intervalMs === 10000
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            10с
          </button>
          <button
            onClick={() => setIntervalMs(30000)}
            className={`px-3 py-1 rounded text-sm ${
              intervalMs === 30000
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            30с
          </button>
          <button
            onClick={() => setIntervalMs(60000)}
            className={`px-3 py-1 rounded text-sm ${
              intervalMs === 60000
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            1хв
          </button>
          <button
            onClick={() => setIntervalMs(300000)}
            className={`px-3 py-1 rounded text-sm ${
              intervalMs === 300000
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            5хв
          </button>
        </div>
      </div>

      {/* Кнопки управління */}
      <div className="flex space-x-4">
        {!status?.isRunning ? (
          <button
            onClick={handleStart}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {loading ? "Запуск..." : "Запустити автоматичний аналіз"}
          </button>
        ) : (
          <button
            onClick={handleStop}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 font-medium"
          >
            {loading ? "Зупинка..." : "Зупинити автоматичний аналіз"}
          </button>
        )}
      </div>

      {/* Інформація */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">
          ℹ️ Як працює автоматичний аналіз
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>
            • Бот автоматично перевіряє умови торгівлі для всіх активних сесій
          </li>
          <li>• При виконанні умов бот автоматично відкриває позиції</li>
          <li>• При зміні умов бот може усереднювати або закривати позиції</li>
          <li>• Рекомендований інтервал: 30 секунд для швидкої реакції</li>
          <li>• Мінімальний інтервал: 5 секунд (не рекомендується)</li>
        </ul>
      </div>
    </div>
  );
};

export default AutoTradingControl;
