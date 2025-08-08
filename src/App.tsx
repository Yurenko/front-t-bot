import React, { useState, useEffect } from "react";
import "./App.css";
import SessionInitializer from "./components/SessionInitializer";
import SessionStatus from "./components/SessionStatus";
import MarketAnalysis from "./components/MarketAnalysis";
import TradingConditions from "./components/TradingConditions";
import AllTradingConditions from "./components/AllTradingConditions";
import TradingLogs from "./components/TradingLogs";
import TotalBalance from "./components/TotalBalance";
import AutoTradingControl from "./components/AutoTradingControl";
import ActiveSessionsROI from "./components/ActiveSessionsROI";
import SessionsGrid from "./components/SessionsGrid";
import ServerInfo from "./components/ServerInfo";
import { tradingApi, TradingSession } from "./services/api";

function App() {
  const [sessions, setSessions] = useState<TradingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<TradingSession | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<
    | "sessions"
    | "analysis"
    | "conditions"
    | "logs"
    | "new"
    | "balance"
    | "auto-trading"
    | "roi"
    | "server"
  >("sessions");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await tradingApi.getAllSessions();
      setSessions(response.data);

      // Вибираємо першу активну сесію, якщо немає обраної
      if (response.data.length > 0 && !selectedSession) {
        const activeSession = response.data.find(
          (session) => session.status === "active"
        );
        if (activeSession) {
          setSelectedSession(activeSession);
        } else if (response.data.length > 0) {
          // Якщо немає активних, вибираємо першу для показу
          setSelectedSession(response.data[0]);
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

  const handleRefresh = () => {
    loadSessions();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Ф'ючерсний Торговий Бот
            </h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab("sessions")}
                className={`px-4 py-2 rounded-md font-medium ${
                  activeTab === "sessions"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Сесії
              </button>
              <button
                onClick={() => setActiveTab("analysis")}
                className={`px-4 py-2 rounded-md font-medium ${
                  activeTab === "analysis"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Аналіз
              </button>
              <button
                onClick={() => setActiveTab("conditions")}
                className={`px-4 py-2 rounded-md font-medium ${
                  activeTab === "conditions"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Умови торгівлі
              </button>
              <button
                onClick={() => setActiveTab("logs")}
                className={`px-4 py-2 rounded-md font-medium ${
                  activeTab === "logs"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Логи
              </button>
              <button
                onClick={() => setActiveTab("new")}
                className={`px-4 py-2 rounded-md font-medium ${
                  activeTab === "new"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Нова сесія
              </button>
              <button
                onClick={() => setActiveTab("balance")}
                className={`px-4 py-2 rounded-md font-medium ${
                  activeTab === "balance"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Баланс
              </button>
              <button
                onClick={() => setActiveTab("auto-trading")}
                className={`px-4 py-2 rounded-md font-medium ${
                  activeTab === "auto-trading"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Автоаналіз
              </button>
              <button
                onClick={() => setActiveTab("roi")}
                className={`px-4 py-2 rounded-md font-medium ${
                  activeTab === "roi"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                ROI
              </button>
              <button
                onClick={() => setActiveTab("server")}
                className={`px-4 py-2 rounded-md font-medium ${
                  activeTab === "server"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Сервер
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "sessions" && (
          <div className="space-y-6">
            <SessionsGrid
              onSessionSelect={setSelectedSession}
              selectedSession={selectedSession}
              onRefresh={handleRefresh}
            />

            {/* Деталі обраної сесії */}
            {selectedSession && selectedSession.status === "active" && (
              <div className="space-y-6">
                <SessionStatus
                  session={selectedSession}
                  onRefresh={handleRefresh}
                />
                <div className="bg-white rounded-lg shadow-md p-6">
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
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Аналіз ринку
            </h2>
            {selectedSession ? (
              <MarketAnalysis symbol={selectedSession.symbol} />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-500 mb-4">
                  Виберіть сесію для аналізу ринку
                </p>
                <button
                  onClick={() => setActiveTab("sessions")}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Перейти до сесій
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "conditions" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Умови торгівлі
            </h2>
            {sessions.length > 0 ? (
              <AllTradingConditions sessions={sessions} />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-500 mb-4">
                  Немає активних сесій для перегляду умов торгівлі
                </p>
                <button
                  onClick={() => setActiveTab("new")}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Створити першу сесію
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "logs" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Логи торгівлі
            </h2>
            {selectedSession ? (
              <TradingLogs
                sessionId={selectedSession.id}
                symbol={selectedSession.symbol}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-500 mb-4">
                  Виберіть сесію для перегляду логів торгівлі
                </p>
                <button
                  onClick={() => setActiveTab("sessions")}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Перейти до сесій
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "new" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Створення нової сесії
            </h2>
            <SessionInitializer onSessionCreated={handleSessionCreated} />
          </div>
        )}

        {activeTab === "balance" && (
          <div className="space-y-6">
            <TotalBalance />
          </div>
        )}

        {activeTab === "auto-trading" && (
          <div className="space-y-6">
            <AutoTradingControl />
          </div>
        )}

        {activeTab === "roi" && (
          <div className="space-y-6">
            <ActiveSessionsROI />
          </div>
        )}

        {activeTab === "server" && (
          <div className="space-y-6">
            <ServerInfo />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
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
