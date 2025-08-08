import React, { useState, useEffect } from "react";
import { tradingApi } from "../services/api";

interface ServerInfo {
  serverTime: string;
  environment: string;
  port: number;
  addresses: Array<{
    name: string;
    address: string;
    family: string;
    internal: boolean;
  }>;
  externalIP: string | null;
  binanceApiUrl: string;
  binanceTestnet: boolean;
  hasApiKey: boolean;
  hasApiSecret: boolean;
}

const ServerInfo: React.FC = () => {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadServerInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tradingApi.getServerInfo();
      setServerInfo(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Помилка завантаження інформації сервера"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServerInfo();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!serverInfo) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <p className="text-gray-500 text-sm">
          Інформація про сервер недоступна
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
              Інформація про сервер
            </h2>
            <p className="text-sm text-gray-600">
              Статус сервера та конфігурація
            </p>
          </div>
          <button
            onClick={loadServerInfo}
            disabled={loading}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {loading ? "Оновлення..." : "Оновити"}
          </button>
        </div>
      </div>

      {/* Основна інформація */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
          Основна інформація
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Серверний час:</span>
              <span className="text-sm font-semibold text-gray-900">
                {new Date(serverInfo.serverTime).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Середовище:</span>
              <span className="text-sm font-semibold text-gray-900">
                {serverInfo.environment}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Порт:</span>
              <span className="text-sm font-semibold text-gray-900">
                {serverInfo.port}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Зовнішня IP:</span>
              <span className="text-sm font-semibold text-gray-900">
                {serverInfo.externalIP || "Н/Д"}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Binance API:</span>
              <span className="text-sm font-semibold text-gray-900">
                {serverInfo.binanceApiUrl}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Testnet:</span>
              <span
                className={`text-sm font-semibold ${
                  serverInfo.binanceTestnet
                    ? "text-yellow-600"
                    : "text-green-600"
                }`}
              >
                {serverInfo.binanceTestnet ? "Так" : "Ні"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">API Key:</span>
              <span
                className={`text-sm font-semibold ${
                  serverInfo.hasApiKey ? "text-green-600" : "text-red-600"
                }`}
              >
                {serverInfo.hasApiKey ? "Налаштовано" : "Не налаштовано"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">API Secret:</span>
              <span
                className={`text-sm font-semibold ${
                  serverInfo.hasApiSecret ? "text-green-600" : "text-red-600"
                }`}
              >
                {serverInfo.hasApiSecret ? "Налаштовано" : "Не налаштовано"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Мережеві адреси */}
      {serverInfo.addresses.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
            Мережеві адреси
          </h3>
          <div className="space-y-3">
            {serverInfo.addresses.map((address, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-1 sm:space-y-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {address.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {address.family}{" "}
                      {address.internal ? "(внутрішня)" : "(зовнішня)"}
                    </p>
                  </div>
                  <span className="text-sm font-mono text-gray-700">
                    {address.address}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Статус підключення */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
          Статус підключення
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-green-50 p-3 rounded-lg">
            <h4 className="text-xs font-medium text-green-600 mb-1">Сервер</h4>
            <p className="text-sm font-semibold text-green-900">Підключено</p>
          </div>
          <div
            className={`p-3 rounded-lg ${
              serverInfo.hasApiKey && serverInfo.hasApiSecret
                ? "bg-green-50"
                : "bg-red-50"
            }`}
          >
            <h4
              className={`text-xs font-medium mb-1 ${
                serverInfo.hasApiKey && serverInfo.hasApiSecret
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              Binance API
            </h4>
            <p
              className={`text-sm font-semibold ${
                serverInfo.hasApiKey && serverInfo.hasApiSecret
                  ? "text-green-900"
                  : "text-red-900"
              }`}
            >
              {serverInfo.hasApiKey && serverInfo.hasApiSecret
                ? "Налаштовано"
                : "Не налаштовано"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerInfo;
