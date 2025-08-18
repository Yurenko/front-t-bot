import React, { useState, useEffect } from "react";
import "./App.css";
import SessionInitializer from "./components/SessionInitializer";
import SessionStatus from "./components/SessionStatus";
import MarketAnalysis from "./components/MarketAnalysis";
import TradingConditions from "./components/TradingConditions";
import AllTradingConditions from "./components/AllTradingConditions";
import TradingLogs from "./components/TradingLogs";
import TotalBalance from "./components/TotalBalance";
import ConnectionStatus from "./components/ConnectionStatus";

import ActiveSessionsROI from "./components/ActiveSessionsROI";
import SessionsGrid from "./components/SessionsGrid";

import { TradingSession } from "./services/api";
import { websocketService } from "./services/websocket";

function App() {
  const [sessions, setSessions] = useState<TradingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<TradingSession | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<
    "sessions" | "analysis" | "conditions" | "logs" | "new" | "balance" | "roi"
  >("sessions");
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    console.log("🚀 Ініціалізація додатку...");

    // Підключаємося до WebSocket
    websocketService.connect().catch(console.error);

    // Підписуємося на оновлення сесій
    websocketService.subscribeToSessions();

    // Слухаємо оновлення сесій
    websocketService.on("sessions", (data: TradingSession[]) => {
      console.log(`📡 Отримано оновлення сесій: ${data.length} сесій`);
      setSessions(data);

      // Оновлюємо обрану сесію, якщо вона є в оновлених даних
      if (selectedSession && selectedSession.id) {
        const updatedSession = data.find((s) => s.id === selectedSession.id);
        if (updatedSession) {
          setSelectedSession(updatedSession);
        }
      }
    });

    // Завантажуємо сесії з затримкою для уникнення одночасних запитів
    setTimeout(() => {
      loadSessions();
    }, 500);

    return () => {
      websocketService.unsubscribeFromSessions();
      websocketService.disconnect();
    };
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await websocketService.getAllSessions();
      setSessions(data);

      // Вибираємо першу активну сесію, якщо немає обраної
      if (data.length > 0 && !selectedSession) {
        const activeSession = data.find(
          (session) => session.status === "active"
        );
        if (activeSession) {
          setSelectedSession(activeSession);
        } else if (data.length > 0) {
          // Якщо немає активних, вибираємо першу для показу
          setSelectedSession(data[0]);
        }
      }
    } catch (error) {
      console.error("Помилка завантаження сесій:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionCreated = (session: TradingSession) => {
    setSessions((prev) => [session, ...prev]);
    setSelectedSession(session);
    setActiveTab("sessions");
  };

  const handleRefresh = async () => {
    await loadSessions();

    // Якщо є обрана сесія, оновлюємо її дані
    if (selectedSession && selectedSession.symbol) {
      try {
        const data = await websocketService.getSessionStatus(
          selectedSession.symbol
        );
        if (data) {
          setSelectedSession({
            ...data,
            id: data.id || selectedSession.id,
          });
        }
      } catch (error) {
        console.error("Помилка оновлення обраної сесії:", error);
      }
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: "sessions", label: "Сесії", icon: "📊" },
    { id: "analysis", label: "Аналіз", icon: "📈" },
    { id: "conditions", label: "Умови", icon: "⚙️" },
    { id: "logs", label: "Логи", icon: "📝" },
    { id: "new", label: "Нова сесія", icon: "➕" },
    { id: "balance", label: "Баланс", icon: "💰" },
    { id: "roi", label: "ROI", icon: "📊" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
              Ф'ючерсний Торговий Бот
            </h1>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex space-x-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id as typeof activeTab)}
                  className={`px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                    activeTab === item.id
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 py-4">
              <div className="grid grid-cols-2 gap-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id as typeof activeTab)}
                    className={`p-3 rounded-md font-medium text-sm transition-colors text-left ${
                      activeTab === item.id
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Статус підключення */}
        <ConnectionStatus />

        {activeTab === "sessions" && (
          <div className="space-y-4 md:space-y-6">
            <SessionsGrid
              onSessionSelect={setSelectedSession}
              selectedSession={selectedSession}
              onRefresh={handleRefresh}
            />

            {/* Деталі обраної сесії */}
            {selectedSession &&
              selectedSession.id &&
              selectedSession.status === "active" && (
                <div className="space-y-4 md:space-y-6">
                  <SessionStatus
                    session={selectedSession}
                    onRefresh={handleRefresh}
                  />
                  <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Умови торгівлі для {selectedSession.symbol}
                    </h3>
                    <TradingConditions symbol={selectedSession.symbol} />
                  </div>
                </div>
              )}
          </div>
        )}

        {activeTab === "analysis" && (
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Аналіз ринку
            </h2>
            {selectedSession && selectedSession.symbol ? (
              <MarketAnalysis symbol={selectedSession.symbol} />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 md:p-8 text-center">
                <p className="text-gray-500 mb-4">
                  Виберіть сесію для аналізу ринку
                </p>
                <button
                  onClick={() => handleTabChange("sessions")}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Перейти до сесій
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "conditions" && (
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Умови торгівлі
            </h2>
            {sessions.length > 0 ? (
              <AllTradingConditions sessions={sessions} />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 md:p-8 text-center">
                <p className="text-gray-500 mb-4">
                  Немає активних сесій для перегляду умов торгівлі
                </p>
                <button
                  onClick={() => handleTabChange("new")}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Створити першу сесію
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "logs" && (
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Логи торгівлі
            </h2>
            {selectedSession && selectedSession.id ? (
              <TradingLogs
                sessionId={selectedSession.id}
                symbol={selectedSession.symbol}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 md:p-8 text-center">
                <p className="text-gray-500 mb-4">
                  Виберіть сесію для перегляду логів торгівлі
                </p>
                <button
                  onClick={() => handleTabChange("sessions")}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Перейти до сесій
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "new" && (
          <div className="space-y-4 md:space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Створення нової сесії
            </h2>
            <SessionInitializer onSessionCreated={handleSessionCreated} />
          </div>
        )}

        {activeTab === "balance" && (
          <div className="space-y-4 md:space-y-6">
            <TotalBalance />
          </div>
        )}

        {activeTab === "roi" && (
          <div className="space-y-4 md:space-y-6">
            <ActiveSessionsROI />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8 md:mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-gray-500 text-sm">
            Ф'ючерсний торговий бот зі стратегією усереднення без стоплосу
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
