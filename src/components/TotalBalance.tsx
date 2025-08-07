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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Загальний баланс Binance
        </h2>
        <button
          onClick={loadBalance}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Оновити
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Загальний баланс гаманця */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-600 mb-1">
                Загальний баланс гаманця
              </h3>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(balance.totalWalletBalance)}
              </p>
            </div>
            <div className="text-blue-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Нереалізований P&L */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-yellow-600 mb-1">
                Нереалізований P&L
              </h3>
              <p
                className={`text-2xl font-bold ${getBalanceColor(
                  balance.totalUnrealizedProfit
                )}`}
              >
                {formatCurrency(balance.totalUnrealizedProfit)}
              </p>
            </div>
            <div className="text-yellow-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L12 10.586 17.586 5H12z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Загальний баланс з P&L */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-green-600 mb-1">
                Загальний баланс з P&L
              </h3>
              <p
                className={`text-2xl font-bold ${getBalanceColor(
                  balance.totalMarginBalance
                )}`}
              >
                {formatCurrency(balance.totalMarginBalance)}
              </p>
            </div>
            <div className="text-green-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Доступний баланс */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-purple-600 mb-1">
                Доступний баланс
              </h3>
              <p className="text-2xl font-bold text-purple-900">
                {formatCurrency(balance.totalAvailableBalance)}
              </p>
            </div>
            <div className="text-purple-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Використаний баланс */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-red-600 mb-1">
                Використаний баланс
              </h3>
              <p className="text-2xl font-bold text-red-900">
                {formatCurrency(balance.totalUsedBalance)}
              </p>
            </div>
            <div className="text-red-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Відсоток використання */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                Відсоток використання
              </h3>
              <p className="text-2xl font-bold text-gray-900">
                {balance.totalWalletBalance > 0
                  ? `${Math.round(
                      (balance.totalUsedBalance / balance.totalWalletBalance) *
                        100
                    )}%`
                  : "0%"}
              </p>
            </div>
            <div className="text-gray-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
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
