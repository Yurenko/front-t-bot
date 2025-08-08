import React, { useState, useEffect } from "react";
import { tradingApi, TotalBalance } from "../services/api";

const TotalBalanceComponent: React.FC = () => {
  const [balance, setBalance] = useState<TotalBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tradingApi.getTotalBalance();
      setBalance(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Помилка завантаження балансу");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getBalanceColor = (value: number) => {
    return value >= 0 ? "text-green-600" : "text-red-600";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
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

  if (!balance) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500">Немає даних про баланс</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 space-y-2 sm:space-y-0">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
          Загальний баланс Binance
        </h2>
        <button
          onClick={loadBalance}
          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Оновити
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Загальний баланс гаманця */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 md:p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs md:text-sm font-medium text-blue-600 mb-1">
                Загальний баланс гаманця
              </h3>
              <p className="text-lg md:text-2xl font-bold text-blue-900">
                {formatCurrency(balance.totalWalletBalance)}
              </p>
            </div>
            <div className="text-blue-500">
              <svg
                className="w-6 h-6 md:w-8 md:h-8"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Нереалізований прибуток */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 md:p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs md:text-sm font-medium text-green-600 mb-1">
                Нереалізований прибуток
              </h3>
              <p
                className={`text-lg md:text-2xl font-bold ${getBalanceColor(
                  balance.totalUnrealizedProfit
                )}`}
              >
                {formatCurrency(balance.totalUnrealizedProfit)}
              </p>
            </div>
            <div className="text-green-500">
              <svg
                className="w-6 h-6 md:w-8 md:h-8"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Маржинальний баланс */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 md:p-6 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs md:text-sm font-medium text-purple-600 mb-1">
                Маржинальний баланс
              </h3>
              <p className="text-lg md:text-2xl font-bold text-purple-900">
                {formatCurrency(balance.totalMarginBalance)}
              </p>
            </div>
            <div className="text-purple-500">
              <svg
                className="w-6 h-6 md:w-8 md:h-8"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Доступний баланс */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 md:p-6 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs md:text-sm font-medium text-yellow-600 mb-1">
                Доступний баланс
              </h3>
              <p className="text-lg md:text-2xl font-bold text-yellow-900">
                {formatCurrency(balance.totalAvailableBalance)}
              </p>
            </div>
            <div className="text-yellow-500">
              <svg
                className="w-6 h-6 md:w-8 md:h-8"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Використаний баланс */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 md:p-6 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs md:text-sm font-medium text-red-600 mb-1">
                Використаний баланс
              </h3>
              <p className="text-lg md:text-2xl font-bold text-red-900">
                {formatCurrency(balance.totalUsedBalance)}
              </p>
            </div>
            <div className="text-red-500">
              <svg
                className="w-6 h-6 md:w-8 md:h-8"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Загальний P&L */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 md:p-6 rounded-lg border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs md:text-sm font-medium text-indigo-600 mb-1">
                Загальний P&L
              </h3>
              <p
                className={`text-lg md:text-2xl font-bold ${getBalanceColor(
                  balance.totalUnrealizedProfit
                )}`}
              >
                {formatCurrency(balance.totalUnrealizedProfit)}
              </p>
            </div>
            <div className="text-indigo-500">
              <svg
                className="w-6 h-6 md:w-8 md:h-8"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Інформаційна панель */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          💡 Інформація про баланс
        </h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>
            • <strong>Доступний баланс</strong> - кошти, які можна
            використовувати для нових позицій
          </p>
          <p>
            • <strong>Використаний баланс</strong> - кошти, які вже
            використовуються в поточних позиціях
          </p>
          <p>
            • <strong>Нереалізований P&L</strong> - прибуток/збиток від
            відкритих позицій
          </p>
          <p>
            • <strong>Загальний баланс з P&L</strong> - загальний стан рахунку з
            урахуванням поточних результатів
          </p>
        </div>
      </div>
    </div>
  );
};

export default TotalBalanceComponent;
