import React, { useState } from "react";
import { tradingApi } from "../services/api";

interface VolatilitySettingsProps {
  sessionId: string;
  symbol: string;
  enableVolatilityCheck: boolean;
  onUpdate: () => void;
}

const VolatilitySettings: React.FC<VolatilitySettingsProps> = ({
  sessionId,
  symbol,
  enableVolatilityCheck,
  onUpdate,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChecked, setIsChecked] = useState(enableVolatilityCheck);

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      const newValue = !isChecked;
      await tradingApi.updateVolatilityCheck(sessionId, newValue);
      setIsChecked(newValue);
      onUpdate();
    } catch (error) {
      console.error("Помилка оновлення налаштування волатильності:", error);
      // Повертаємо до попереднього стану при помилці
      setIsChecked(enableVolatilityCheck);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">
        Налаштування волатильності - {symbol}
      </h3>

      <div className="flex items-center space-x-3">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={handleToggle}
            disabled={isUpdating}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">
            Перевіряти волатильність при усередненні
          </span>
        </label>

        {isUpdating && (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-xs text-gray-500">Оновлення...</span>
          </div>
        )}
      </div>

      <div className="mt-3 p-3 bg-gray-50 rounded-md">
        <p className="text-xs text-gray-600">
          <strong>Пояснення:</strong>
        </p>
        <ul className="text-xs text-gray-600 mt-1 space-y-1">
          <li>
            • <strong>Увімкнено</strong> - усереднення блокується при високій
            волатильності (ATR &gt; 3%)
          </li>
          <li>
            • <strong>Вимкнено</strong> - усереднення працює незалежно від
            волатильності
          </li>
          <li>
            • <strong>Рекомендація:</strong> залишати увімкненим для захисту від
            ліквідації
          </li>
        </ul>
      </div>

      <div className="mt-3">
        <div
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            isChecked
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full mr-1 ${
              isChecked ? "bg-green-500" : "bg-yellow-500"
            }`}
          ></div>
          {isChecked ? "Перевірка увімкнена" : "Перевірка вимкнена"}
        </div>
      </div>
    </div>
  );
};

export default VolatilitySettings;
