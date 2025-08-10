import React from "react";

const TakeProfitInfo: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        🎯 Логіка Take-Profit
      </h2>

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            Поточні налаштування Take-Profit
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-700">Базовий тейк-профіт:</span>
                <span className="font-bold text-blue-800">
                  12% ROI (4% рух ринку)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">При консолідації:</span>
                <span className="font-bold text-blue-800">
                  9% ROI (3% рух ринку)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">
                  При низькій волатильності:
                </span>
                <span className="font-bold text-blue-800">
                  6% ROI (2% рух ринку)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">
                  При високій волатильності:
                </span>
                <span className="font-bold text-blue-800">
                  15% ROI (5% рух ринку)
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-700">
                  Швидкий вихід після консолідації:
                </span>
                <span className="font-bold text-blue-800">
                  6% ROI (2% рух ринку)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Плече:</span>
                <span className="font-bold text-blue-800">3x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Максимум усереднень:</span>
                <span className="font-bold text-blue-800">4</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            ✅ Переваги нових налаштувань
          </h3>
          <ul className="text-green-700 space-y-1">
            <li>• Більший прибуток: 6-15% ROI замість 3-9%</li>
            <li>• Менше частого закриття позицій</li>
            <li>• Кращий баланс між ризиком і прибутком</li>
            <li>• Адаптивність до ринкових умов</li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            ⚠️ Важливо знати
          </h3>
          <ul className="text-yellow-700 space-y-1">
            <li>• Позиції закриваються при досягненні take-profit</li>
            <li>• Сесія залишається активною після закриття позиції</li>
            <li>• Можна відкрити нову позицію в тій же сесії</li>
            <li>• Всі прибутки додаються до загального P&L сесії</li>
          </ul>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            📊 Приклади розрахунків
          </h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div>
              <strong>Приклад 1:</strong> Вхід по $100, поточна ціна $104
              <br />
              ROI = (104-100)/100 × 3 = 12% ✅ Закриваємо
            </div>
            <div>
              <strong>Приклад 2:</strong> Вхід по $100, поточна ціна $102
              (консолідація)
              <br />
              ROI = (102-100)/100 × 3 = 6% ✅ Закриваємо
            </div>
            <div>
              <strong>Приклад 3:</strong> Вхід по $100, поточна ціна $101.5
              <br />
              ROI = (101.5-100)/100 × 3 = 4.5% ❌ Очікуємо
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeProfitInfo;

