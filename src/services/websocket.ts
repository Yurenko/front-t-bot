import { EventEmitter } from "events";
import { TradingSession, Trade, MarketAnalysis } from "./api";

// @ts-ignore
const { io } = require("socket.io-client");

const WEBSOCKET_URL =
  process.env.NODE_ENV === "production"
    ? "wss://back-t-bot-k8mh.onrender.com"
    : "http://localhost:3007";

const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://back-t-bot-k8mh.onrender.com"
    : process.env.REACT_APP_API_URL || "http://localhost:3007";

class WebSocketService extends EventEmitter {
  private socket: any = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private isConnected = false;
  private subscriptions = new Set<string>();
  private useWebSocket = true; // Флаг для використання WebSocket або REST API
  private pendingRequests = new Map<
    string,
    { resolve: Function; reject: Function }
  >();

  constructor() {
    super();
    this.setMaxListeners(100);

    // Періодична перевірка стану з'єднання
    setInterval(() => {
      if (this.useWebSocket && (!this.isConnected || !this.socket?.connected)) {
        console.log("🔄 Автоматична перевірка WebSocket з'єднання...");
        this.connect().catch((error) => {
          console.warn("❌ Автоматичне перепідключення не вдалося:", error);
        });
      }
    }, 30000); // Перевіряємо кожні 30 секунд
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.socket?.connected) {
      console.log("✅ Socket.IO вже підключений");
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        console.log("🔌 Підключення до Socket.IO...");

        this.socket = io(WEBSOCKET_URL, {
          path: "/ws",
          transports: ["websocket"],
          timeout: 5000,
          forceNew: true,
        });

        // Таймаут для підключення
        const connectionTimeout = setTimeout(() => {
          console.warn(
            "⏰ Таймаут підключення Socket.IO, переключаємося на REST API"
          );
          this.useWebSocket = false;
          this.isConnected = false;
          if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
          }
          resolve(); // Резолвимо проміс, щоб додаток продовжив роботу
        }, 5000);

        this.socket.on("connect", () => {
          console.log("✅ Socket.IO підключений");
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.useWebSocket = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on("disconnect", (reason: any) => {
          console.warn(`🔌 Socket.IO відключений: ${reason}`);
          this.isConnected = false;
          if (reason === "io server disconnect") {
            // Сервер примусово відключив
            this.useWebSocket = false;
          } else {
            // Втрата з'єднання, спробуємо перепідключитися
            this.handleReconnect();
          }
        });

        this.socket.on("connect_error", (error: any) => {
          console.error("❌ Socket.IO помилка підключення:", error);
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          this.useWebSocket = false;
          console.warn("🔄 Переключаємося на REST API через помилку Socket.IO");
          resolve(); // Резолвимо проміс, щоб додаток продовжив роботу
        });

        this.socket.on("message", (data: any) => {
          try {
            console.log("📡 Отримано Socket.IO повідомлення:", data);
            this.handleMessage(data);
          } catch (error) {
            console.error("Помилка обробки Socket.IO повідомлення:", error);
          }
        });

        this.socket.on("error", (error: any) => {
          console.error("❌ Socket.IO помилка:", error);
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          this.useWebSocket = false;
          console.warn("🔄 Переключаємося на REST API через помилку Socket.IO");
          resolve(); // Резолвимо проміс, щоб додаток продовжив роботу
        });
      } catch (error) {
        console.error("Помилка створення Socket.IO з'єднання:", error);
        this.useWebSocket = false;
        console.warn(
          "🔄 Переключаємося на REST API через помилку створення Socket.IO"
        );
        resolve(); // Резолвимо проміс, щоб додаток продовжив роботу
      }
    });
  }

  private handleMessage(data: any): void {
    console.log("📡 Обробка Socket.IO повідомлення:", data);

    // Обробка відповідей на запити
    if (data.id && this.pendingRequests.has(data.id)) {
      const { resolve, reject } = this.pendingRequests.get(data.id)!;
      this.pendingRequests.delete(data.id);

      if (data.success) {
        resolve(data.data);
      } else {
        reject(new Error(data.error || "Unknown error"));
      }
      return;
    }

    // Обробка broadcast повідомлень
    if (data.type && data.data) {
      this.emit(data.type, data.data);
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Досягнуто максимальну кількість спроб перепідключення");
      console.warn("🔄 Переключаємося на REST API");
      this.useWebSocket = false;
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `🔄 Спроба перепідключення ${this.reconnectAttempts}/${this.maxReconnectAttempts} через ${this.reconnectDelay}ms`
    );

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error("Помилка перепідключення:", error);
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.warn(
            "🔄 Переключаємося на REST API через невдалі спроби перепідключення"
          );
          this.useWebSocket = false;
        }
      });
    }, this.reconnectDelay);
  }

  private sendMessage(type: string, payload?: any): void {
    if (!this.useWebSocket || !this.isConnected || !this.socket) {
      console.warn("Socket.IO не підключений, використовуємо REST API");
      return;
    }

    const message = {
      type,
      payload,
    };

    this.socket.emit("message", JSON.stringify(message));
  }

  private async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.useWebSocket || !this.isConnected || !this.socket) {
      throw new Error("Socket.IO не підключений");
    }

    return new Promise((resolve, reject) => {
      const requestId =
        Date.now().toString() + Math.random().toString(36).substr(2, 9);

      this.pendingRequests.set(requestId, { resolve, reject });

      const message = {
        id: requestId,
        method,
        params,
      };

      this.socket!.emit("message", JSON.stringify(message));

      // Таймаут для запиту
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error("Request timeout"));
        }
      }, 30000); // Збільшуємо таймаут до 30 секунд
    });
  }

  // Підписки на дані
  subscribeToSessions(): void {
    if (this.useWebSocket) {
      this.sendMessage("subscribe", { channel: "sessions" });
      this.subscriptions.add("sessions");
    } else {
      console.log("📡 Використовуємо REST API для отримання сесій");
    }
  }

  unsubscribeFromSessions(): void {
    if (this.useWebSocket) {
      this.sendMessage("unsubscribe", { channel: "sessions" });
      this.subscriptions.delete("sessions");
    }
  }

  subscribeToTrades(sessionId: string): void {
    if (this.useWebSocket) {
      this.sendMessage("subscribe", { channel: "trades", sessionId });
      this.subscriptions.add(`trades_${sessionId}`);
    } else {
      console.log(
        `📡 Використовуємо REST API для отримання торгів сесії ${sessionId}`
      );
    }
  }

  unsubscribeFromTrades(sessionId: string): void {
    if (this.useWebSocket) {
      this.sendMessage("unsubscribe", { channel: "trades", sessionId });
      this.subscriptions.delete(`trades_${sessionId}`);
    }
  }

  subscribeToMarketAnalysis(symbol: string): void {
    if (this.useWebSocket) {
      this.sendMessage("subscribe", { channel: "market_analysis", symbol });
      this.subscriptions.add(`market_analysis_${symbol}`);
    } else {
      console.log(`📡 Використовуємо REST API для отримання аналізу ${symbol}`);
    }
  }

  unsubscribeFromMarketAnalysis(symbol: string): void {
    if (this.useWebSocket) {
      this.sendMessage("unsubscribe", { channel: "market_analysis", symbol });
      this.subscriptions.delete(`market_analysis_${symbol}`);
    }
  }

  subscribeToBalance(): void {
    if (this.useWebSocket) {
      this.sendMessage("subscribe", { channel: "balance" });
      this.subscriptions.add("balance");
    } else {
      console.log("📡 Використовуємо REST API для отримання балансу");
    }
  }

  unsubscribeFromBalance(): void {
    if (this.useWebSocket) {
      this.sendMessage("unsubscribe", { channel: "balance" });
      this.subscriptions.delete("balance");
    }
  }

  // API методи через Socket.IO або REST
  async getAllSessions(): Promise<TradingSession[]> {
    if (this.useWebSocket && this.isConnected) {
      try {
        return await this.sendRequest("getAllSessions");
      } catch (error: any) {
        console.warn(
          "Помилка WebSocket запиту, переключаємося на REST API:",
          error
        );
        // Спробуємо перепідключитися перед переключенням на REST API
        if (
          error.message === "Request timeout" ||
          error.message === "Socket.IO не підключений"
        ) {
          console.log("🔄 Спроба перепідключення WebSocket...");
          try {
            await this.connect();
            if (this.isConnected) {
              console.log("✅ WebSocket перепідключений, повторюємо запит");
              return await this.sendRequest("getAllSessions");
            }
          } catch (reconnectError) {
            console.warn(
              "❌ Не вдалося перепідключити WebSocket:",
              reconnectError
            );
          }
        }
        this.useWebSocket = false;
      }
    }

    const response = await fetch(`${API_BASE_URL}/trading/sessions`);
    if (!response.ok) throw new Error("Помилка завантаження сесій");
    return response.json();
  }

  async getSessionStatus(symbol: string): Promise<TradingSession> {
    if (this.useWebSocket && this.isConnected) {
      try {
        return await this.sendRequest("getSessionStatus", { symbol });
      } catch (error) {
        console.warn(
          "Помилка WebSocket запиту, переключаємося на REST API:",
          error
        );
        this.useWebSocket = false;
      }
    }

    const response = await fetch(
      `${API_BASE_URL}/trading/session/${symbol}/status`
    );
    if (!response.ok) throw new Error("Помилка завантаження статусу сесії");
    return response.json();
  }

  async getSessionTrades(sessionId: string): Promise<Trade[]> {
    if (this.useWebSocket && this.isConnected) {
      try {
        return await this.sendRequest("getSessionTrades", { sessionId });
      } catch (error) {
        console.warn(
          "Помилка WebSocket запиту, переключаємося на REST API:",
          error
        );
        this.useWebSocket = false;
      }
    }

    const response = await fetch(
      `${API_BASE_URL}/trading/session/${sessionId}/trades`
    );
    if (!response.ok) throw new Error("Помилка завантаження торгів");
    return response.json();
  }

  async getMarketAnalysis(symbol: string): Promise<MarketAnalysis[]> {
    if (this.useWebSocket && this.isConnected) {
      try {
        return await this.sendRequest("getMarketAnalysis", { symbol });
      } catch (error) {
        console.warn(
          "Помилка WebSocket запиту, переключаємося на REST API:",
          error
        );
        this.useWebSocket = false;
      }
    }

    const response = await fetch(
      `${API_BASE_URL}/trading/market/analysis/${symbol}`
    );
    if (!response.ok) throw new Error("Помилка завантаження аналізу ринку");
    return response.json();
  }

  async getMarketAnalysisBatch(symbols: string[]): Promise<MarketAnalysis[][]> {
    if (this.useWebSocket && this.isConnected) {
      try {
        const result = await this.sendRequest("getMarketAnalysisBatch", {
          symbols,
        });

        // Перевіряємо структуру даних від WebSocket
        if (result && Array.isArray(result)) {
          return result.map((item: any) => {
            if (item && Array.isArray(item)) {
              return item;
            } else if (item && item.analysis && Array.isArray(item.analysis)) {
              return item.analysis;
            } else {
              return [];
            }
          });
        } else if (result && result.results && Array.isArray(result.results)) {
          return result.results.map((result: any) => result.analysis || []);
        } else {
          console.warn("Неочікуваний формат даних від WebSocket:", result);
          return [];
        }
      } catch (error: any) {
        console.warn(
          "Помилка WebSocket запиту, переключаємося на REST API:",
          error
        );
        // Спробуємо перепідключитися перед переключенням на REST API
        if (
          error.message === "Request timeout" ||
          error.message === "Socket.IO не підключений"
        ) {
          console.log("🔄 Спроба перепідключення WebSocket...");
          try {
            await this.connect();
            if (this.isConnected) {
              console.log("✅ WebSocket перепідключений, повторюємо запит");
              return await this.sendRequest("getMarketAnalysisBatch", {
                symbols,
              });
            }
          } catch (reconnectError) {
            console.warn(
              "❌ Не вдалося перепідключити WebSocket:",
              reconnectError
            );
          }
        }
        this.useWebSocket = false;
      }
    }

    const response = await fetch(
      `${API_BASE_URL}/trading/market/analysis-batch?symbols=${symbols.join(
        ","
      )}`
    );
    if (!response.ok) throw new Error("Помилка завантаження batch аналізу");
    const data = await response.json();
    return data.results.map((result: any) => result.analysis || []);
  }

  async getTotalBalance(): Promise<{
    totalBalance: number;
    availableBalance: number;
    unrealizedProfit: number;
    marginBalance: number;
    usedBalance: number;
  }> {
    if (this.useWebSocket && this.isConnected) {
      try {
        return await this.sendRequest("getTotalBalance");
      } catch (error: any) {
        console.warn(
          "Помилка WebSocket запиту, переключаємося на REST API:",
          error
        );
        // Спробуємо перепідключитися перед переключенням на REST API
        if (
          error.message === "Request timeout" ||
          error.message === "Socket.IO не підключений"
        ) {
          console.log("🔄 Спроба перепідключення WebSocket...");
          try {
            await this.connect();
            if (this.isConnected) {
              console.log("✅ WebSocket перепідключений, повторюємо запит");
              return await this.sendRequest("getTotalBalance");
            }
          } catch (reconnectError) {
            console.warn(
              "❌ Не вдалося перепідключити WebSocket:",
              reconnectError
            );
          }
        }
        this.useWebSocket = false;
      }
    }

    const response = await fetch(`${API_BASE_URL}/trading/total-balance`);
    if (!response.ok) throw new Error("Помилка завантаження балансу");
    return response.json();
  }

  async getAvailableSymbols(): Promise<string[]> {
    if (this.useWebSocket && this.isConnected) {
      try {
        return await this.sendRequest("getAvailableSymbols");
      } catch (error) {
        console.warn(
          "Помилка WebSocket запиту, переключаємося на REST API:",
          error
        );
        this.useWebSocket = false;
      }
    }

    const response = await fetch(`${API_BASE_URL}/trading/available-symbols`);
    if (!response.ok) throw new Error("Помилка завантаження символів");
    return response.json();
  }

  async initializeSession(
    symbol: string,
    initialBalance: number,
    reserveBalance: number
  ): Promise<TradingSession> {
    if (this.useWebSocket && this.isConnected) {
      try {
        return await this.sendRequest("initializeSession", {
          symbol,
          initialBalance,
          reserveBalance,
        });
      } catch (error) {
        console.warn(
          "Помилка WebSocket запиту, переключаємося на REST API:",
          error
        );
        this.useWebSocket = false;
      }
    }

    const response = await fetch(`${API_BASE_URL}/trading/session/initialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, initialBalance, reserveBalance }),
    });
    if (!response.ok) throw new Error("Помилка ініціалізації сесії");
    return response.json();
  }

  async closeSession(sessionId: string): Promise<void> {
    if (this.useWebSocket && this.isConnected) {
      try {
        await this.sendRequest("closeSession", { sessionId });
        return;
      } catch (error) {
        console.warn(
          "Помилка WebSocket запиту, переключаємося на REST API:",
          error
        );
        this.useWebSocket = false;
      }
    }

    const response = await fetch(
      `${API_BASE_URL}/trading/session/${sessionId}`,
      {
        method: "DELETE",
      }
    );
    if (!response.ok) throw new Error("Помилка закриття сесії");
  }

  async analyzeAndTrade(symbol: string): Promise<void> {
    if (this.useWebSocket && this.isConnected) {
      try {
        await this.sendRequest("analyzeAndTrade", { symbol });
        return;
      } catch (error) {
        console.warn(
          "Помилка WebSocket запиту, переключаємося на REST API:",
          error
        );
        this.useWebSocket = false;
      }
    }

    const response = await fetch(
      `${API_BASE_URL}/trading/session/${symbol}/analyze`,
      {
        method: "POST",
      }
    );
    if (!response.ok) throw new Error("Помилка аналізу та торгівлі");
  }

  async updateVolatilityCheck(
    sessionId: string,
    enabled: boolean
  ): Promise<void> {
    if (this.useWebSocket && this.isConnected) {
      try {
        await this.sendRequest("updateVolatilityCheck", {
          sessionId,
          enableVolatilityCheck: enabled,
        });
        return;
      } catch (error) {
        console.warn(
          "Помилка WebSocket запиту, переключаємося на REST API:",
          error
        );
        this.useWebSocket = false;
      }
    }

    const response = await fetch(
      `${API_BASE_URL}/trading/session/${sessionId}/volatility-check`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      }
    );
    if (!response.ok)
      throw new Error("Помилка оновлення налаштувань волатильності");
  }

  async getActiveSessionsWithROI(): Promise<any[]> {
    if (this.useWebSocket && this.isConnected) {
      try {
        return await this.sendRequest("getActiveSessionsWithROI");
      } catch (error) {
        console.warn(
          "Помилка WebSocket запиту, переключаємося на REST API:",
          error
        );
        this.useWebSocket = false;
      }
    }

    const response = await fetch(`${API_BASE_URL}/trading/active-sessions-roi`);
    if (!response.ok) throw new Error("Помилка завантаження активних сесій");
    return response.json();
  }

  async getActivePositionsCount(): Promise<number> {
    if (this.useWebSocket && this.isConnected) {
      try {
        const result = await this.sendRequest("getActivePositionsCount");
        return result.count;
      } catch (error) {
        console.warn(
          "Помилка WebSocket запиту, переключаємося на REST API:",
          error
        );
        this.useWebSocket = false;
      }
    }

    const response = await fetch(
      `${API_BASE_URL}/trading/active-positions-count`
    );
    if (!response.ok) throw new Error("Помилка завантаження кількості позицій");
    const data = await response.json();
    return data.count;
  }

  async getServerInfo(): Promise<any> {
    if (this.useWebSocket && this.isConnected) {
      try {
        return await this.sendRequest("getServerInfo");
      } catch (error) {
        console.warn(
          "Помилка WebSocket запиту, переключаємося на REST API:",
          error
        );
        this.useWebSocket = false;
      }
    }

    const response = await fetch(`${API_BASE_URL}/trading/server-info`);
    if (!response.ok)
      throw new Error("Помилка завантаження інформації сервера");
    return response.json();
  }

  disconnect(): void {
    if (this.socket) {
      console.log("🔌 Відключення від Socket.IO");
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  isWebSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  isUsingWebSocket(): boolean {
    return this.useWebSocket;
  }

  getConnectionStatus(): {
    connected: boolean;
    usingWebSocket: boolean;
    reconnectAttempts: number;
    subscriptions: number;
  } {
    return {
      connected: this.isConnected,
      usingWebSocket: this.useWebSocket,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: this.subscriptions.size,
    };
  }
}

export const websocketService = new WebSocketService();
