import React, { useState, useEffect } from "react";
import { TradingSession } from "../services/api";
import { websocketService } from "../services/websocket";

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
      const data = await websocketService.getAvailableSymbols();
      setAvailableSymbols(data);
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
      const data = await websocketService.initializeSession(
        symbol,
        initialBalance,
        initialBalance * 0.3 // 30% від початкового балансу як резерв
      );
      onSessionCreated(data);

      // Очищаємо форму
      setSymbol("BTCUSDT");
      setInitialBalance(1000);
    } catch (err: any) {
      setError(err.message || "Помилка ініціалізації сесії");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-800">
        Ініціалізація торгової сесії
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Символ пари
          </label>

          {/* Поле пошуку */}
          <div className="mb-3 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <input
              type="text"
              placeholder="Пошук символу..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              type="button"
              onClick={loadAvailableSymbols}
              disabled={loadingSymbols}
              className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
            >
              {loadingSymbols ? "Завантаження..." : "Оновити"}
            </button>
          </div>

          {/* Список символів */}
          <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md">
            {filteredSymbols.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 p-2">
                {filteredSymbols.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => setSymbol(sym)}
                    className={`p-2 text-xs rounded-md transition-colors ${
                      symbol === sym
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                Символи не знайдено
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Початковий баланс (USDT)
          </label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={initialBalance}
            onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Введіть початковий баланс"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={loading || !symbol || initialBalance <= 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading ? "Створення..." : "Створити сесію"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSymbol("BTCUSDT");
              setInitialBalance(1000);
              setError(null);
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
          >
            Скинути
          </button>
        </div>

        {/* Інформація про вибрану пару */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Вибрана пара: {symbol}
          </h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p>• Початковий баланс: ${initialBalance.toFixed(2)}</p>
            <p>• Торгова стратегія: Усереднення без стоплосу</p>
            <p>• Максимальна кількість усереднень: 10</p>
            <p>• Резервний баланс: ${(initialBalance * 0.75).toFixed(2)}</p>
          </div>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h3 className="font-semibold text-blue-800 mb-2">
          Стратегія торгівлі:
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Плече: 3x</li>
          <li>• Максимум 10 усереднень</li>
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
