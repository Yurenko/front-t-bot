import React, { useState, useEffect } from "react";
import { tradingApi, TradingSession } from "../services/api";

interface SessionInitializerProps {
  onSessionCreated: (session: TradingSession) => void;
}

const SessionInitializer: React.FC<SessionInitializerProps> = ({
  onSessionCreated,
}) => {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [initialBalance, setInitialBalance] = useState(1000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingSymbols, setLoadingSymbols] = useState(true);

  useEffect(() => {
    loadAvailableSymbols();
  }, []);

  const loadAvailableSymbols = async () => {
    try {
      setLoadingSymbols(true);
      const response = await tradingApi.getAvailableSymbols();
      setAvailableSymbols(response.data);
    } catch (error) {
      console.error("Помилка завантаження символів:", error);
      // Fallback до базового списку
      setAvailableSymbols([
        "BTCUSDT",
        "ETHUSDT",
        "BNBUSDT",
        "ADAUSDT",
        "SOLUSDT",
        "DOTUSDT",
        "MATICUSDT",
        "LINKUSDT",
        "UNIUSDT",
        "AVAXUSDT",
      ]);
    } finally {
      setLoadingSymbols(false);
    }
  };

  const filteredSymbols = availableSymbols.filter((sym) =>
    sym.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await tradingApi.initializeSession(
        symbol,
        initialBalance
      );
      onSessionCreated(response.data);

      // Очищаємо форму
      setSymbol("BTCUSDT");
      setInitialBalance(1000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Помилка ініціалізації сесії");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Ініціалізація торгової сесії
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Символ пари
          </label>

          {/* Поле пошуку */}
          <div className="mb-2 flex space-x-2">
            <input
              type="text"
              placeholder="Пошук символу..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={loadAvailableSymbols}
              disabled={loadingSymbols}
              className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              {loadingSymbols ? "..." : "🔄"}
            </button>
          </div>

          {loadingSymbols ? (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
              Завантаження символів...
            </div>
          ) : (
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {filteredSymbols.length === 0 ? (
                <option value="">Немає доступних символів</option>
              ) : (
                filteredSymbols.map((sym: string) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))
              )}
            </select>
          )}

          {filteredSymbols.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Знайдено: {filteredSymbols.length} символів
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Початковий баланс (USD)
          </label>
          <input
            type="number"
            value={initialBalance}
            onChange={(e) => setInitialBalance(Number(e.target.value))}
            min="10"
            step="10"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Розподіл: 75% для торгівлі, 25% для резерву
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Ініціалізація..." : "Створити сесію"}
        </button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h3 className="font-semibold text-blue-800 mb-2">
          Стратегія торгівлі:
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Плече: 3x</li>
          <li>• Максимум 4 усереднення</li>
          <li>• Тейк-профіт: 3-9% ROI (1-3% рух ринку)</li>
          <li>• Максимум 3 активні позиції</li>
          <li>• Без стоп-лосів</li>
          <li>• Аналіз по таймфреймах: 1m, 5m, 15m, 1h, 4h, 1d</li>
        </ul>
      </div>
    </div>
  );
};

export default SessionInitializer;
