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
import TakeProfitInfo from "./components/TakeProfitInfo";
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
    | "take-profit"
  >("sessions");
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    { id: "auto-trading", label: "Автоаналіз", icon: "🤖" },
    { id: "roi", label: "ROI", icon: "📊" },
    { id: "take-profit", label: "Take-Profit", icon: "🎯" },
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
        {activeTab === "sessions" && (
          <div className="space-y-4 md:space-y-6">
            <SessionsGrid
              onSessionSelect={setSelectedSession}
              selectedSession={selectedSession}
              onRefresh={handleRefresh}
            />

            {/* Деталі обраної сесії */}
            {selectedSession && selectedSession.status === "active" && (
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
            {selectedSession ? (
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
            {selectedSession ? (
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

        {activeTab === "auto-trading" && (
          <div className="space-y-4 md:space-y-6">
            <AutoTradingControl />
          </div>
        )}

        {activeTab === "roi" && (
          <div className="space-y-4 md:space-y-6">
            <ActiveSessionsROI />
          </div>
        )}

        {activeTab === "take-profit" && (
          <div className="space-y-4 md:space-y-6">
            <TakeProfitInfo />
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
