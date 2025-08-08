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
      <div className="bg-white rounded-lg shadow-md p-6">
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!serverInfo) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500">Інформація про сервер недоступна</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Інформація про сервер
        </h2>
        <button
          onClick={loadServerInfo}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Оновлення..." : "Оновити"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Основна інформація */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">
            Основна інформація
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Час сервера:</span>
              <span className="font-mono text-sm">
                {new Date(serverInfo.serverTime).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Середовище:</span>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  serverInfo.environment === "production"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {serverInfo.environment}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Порт:</span>
              <span className="font-mono text-sm">{serverInfo.port}</span>
            </div>
          </div>
        </div>

        {/* IP адреси */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">
            IP адреси сервера
          </h3>
          {serverInfo.externalIP && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex justify-between items-center">
                <span className="text-green-800 font-semibold">
                  Зовнішня IP:
                </span>
                <span className="font-mono text-sm text-green-600 font-bold">
                  {serverInfo.externalIP}
                </span>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Це IP адреса, яку бачить зовнішній світ
              </p>
            </div>
          )}
          {serverInfo.addresses.length > 0 ? (
            <div className="space-y-2">
              {serverInfo.addresses.map((addr, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-center p-2 rounded ${
                    addr.internal
                      ? "bg-yellow-50 border border-yellow-200"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600 text-sm">{addr.name}:</span>
                    {addr.internal && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                        Internal
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-sm text-blue-600">
                    {addr.address}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">IP адреси не знайдено</p>
          )}
        </div>

        {/* Binance конфігурація */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Binance API</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">API URL:</span>
              <span className="font-mono text-sm">
                {serverInfo.binanceApiUrl}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Testnet:</span>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  serverInfo.binanceTestnet
                    ? "bg-orange-100 text-orange-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {serverInfo.binanceTestnet ? "Так" : "Ні"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">API Key:</span>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  serverInfo.hasApiKey
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {serverInfo.hasApiKey ? "Налаштовано" : "Відсутній"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">API Secret:</span>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  serverInfo.hasApiSecret
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {serverInfo.hasApiSecret ? "Налаштовано" : "Відсутній"}
              </span>
            </div>
          </div>
        </div>

        {/* Інструкції */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">
            Інструкції для Binance
          </h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-3">
              Для налаштування Binance API потрібно:
            </p>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Створити API ключ в Binance</li>
              <li>Додати IP адресу сервера до білого списку</li>
              <li>Налаштувати змінні середовища на сервері</li>
            </ol>
            <div className="mt-3 p-2 bg-white rounded border">
              <p className="text-xs text-gray-600 font-mono">
                IP для додавання в Binance:{" "}
                {serverInfo.externalIP ||
                  serverInfo.addresses.find((addr) => !addr.internal)
                    ?.address ||
                  "Не знайдено"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerInfo;
