import React, { useState, useEffect } from "react";
import { websocketService } from "../services/websocket";

const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState({
    connected: false,
    usingWebSocket: false,
    reconnectAttempts: 0,
    subscriptions: 0,
  });

  useEffect(() => {
    const updateStatus = () => {
      setStatus(websocketService.getConnectionStatus());
    };

    // Оновлюємо статус кожну секунду
    const interval = setInterval(updateStatus, 1000);

    // Початковий статус
    updateStatus();

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (status.connected && status.usingWebSocket) return "text-green-500";
    if (status.connected && !status.usingWebSocket) return "text-yellow-500";
    return "text-red-500";
  };

  const getStatusText = () => {
    if (status.connected && status.usingWebSocket)
      return "✅ WebSocket підключений";
    if (status.connected && !status.usingWebSocket)
      return "⚠️ REST API (WebSocket недоступний)";
    return "❌ Не підключений";
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg mb-4">
      <h3 className="text-lg font-semibold mb-2">Статус підключення</h3>
      <div className="space-y-2">
        <div className={`font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </div>
        <div className="text-sm text-gray-300">
          <div>Спроби перепідключення: {status.reconnectAttempts}/5</div>
          <div>Активні підписки: {status.subscriptions}</div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatus;





