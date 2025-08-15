import React, { useState, useEffect } from "react";
import { TradingSession, MarketAnalysis } from "../services/api";
import { websocketService } from "../services/websocket";

interface LiveTradingStatusProps {
  session: TradingSession;
}

interface TradingStatus {
  symbol: string;
  currentPrice: number;
  entryPrice: number | null;
  positionSize: number;
  unrealizedPnL: number;
  roi: number;
  averagingCount: number;
  maxAveraging: number;
  liquidationPrice: number | null;
  distanceToLiquidation: number;
  marketAnalysis: MarketAnalysis | null;
  lastUpdate: string;
  activePositionsCount?: number; // Додаємо кількість активних позицій
}

const LiveTradingStatus: React.FC<LiveTradingStatusProps> = ({ session }) => {
  const [status, setStatus] = useState<TradingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    // Підписуємося на оновлення сесії
    websocketService.subscribeToSessions();

    // Слухаємо оновлення сесій
    websocketService.on("sessions", (data: TradingSession[]) => {
      const updatedSession = data.find((s) => s.id === session.id);
      if (updatedSession) {
        loadStatus();
      }
    });

    // Підписуємося на оновлення аналізу ринку
    websocketService.subscribeToMarketAnalysis(session.symbol);

    // Слухаємо оновлення аналізу
    websocketService.on(
      `market_analysis_${session.symbol}`,
      (data: MarketAnalysis[]) => {
        loadStatus();
      }
    );

    loadStatus();

    return () => {
      websocketService.unsubscribeFromSessions();
      websocketService.unsubscribeFromMarketAnalysis(session.symbol);
    };
  }, [session.id]);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      // Отримуємо поточний статус сесії
      const currentSession = await websocketService.getSessionStatus(
        session.symbol
      );

      // Отримуємо аналіз ринку
      const analysisData = await websocketService.getMarketAnalysis(
        session.symbol
      );
      const analysis =
        analysisData.find((a) => a.timeframe === "1d") || analysisData[0];

      // Отримуємо кількість активних позицій
      const activePositionsCount =
        await websocketService.getActivePositionsCount();

      if (currentSession && analysis) {
        const currentPrice = analysis.currentPrice;
        const entryPrice = currentSession.averageEntryPrice;
        const positionSize = currentSession.totalPositionSize || 0;
        const averagingCount = currentSession.averagingCount || 0;
        const liquidationPrice = currentSession.liquidationPrice;

        // Розраховуємо P&L
        let unrealizedPnL = 0;
        let roi = 0;

        if (entryPrice && positionSize > 0) {
          const priceChange = (currentPrice - entryPrice) / entryPrice;
          unrealizedPnL = priceChange * positionSize * currentPrice; // 3x leverage
          roi = priceChange * 3; // 3x leverage
        }

        // Розраховуємо відстань до ліквідації
        let distanceToLiquidation = 0;
        if (liquidationPrice) {
          distanceToLiquidation =
            ((currentPrice - liquidationPrice) / liquidationPrice) * 100;
        }

        const tradingStatus: TradingStatus = {
          symbol: session.symbol,
          currentPrice,
          entryPrice,
          positionSize,
          unrealizedPnL,
          roi,
          averagingCount,
          maxAveraging: 10,
          liquidationPrice,
          distanceToLiquidation,
          marketAnalysis: analysis,
          lastUpdate: new Date().toISOString(),
          activePositionsCount,
        };

        setStatus(tradingStatus);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Помилка завантаження статусу");
    } finally {
      setLoading(false);
    }
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return "text-green-600";
    if (pnl < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getLiquidationColor = (distance: number) => {
    if (distance < 5) return "text-red-600";
    if (distance < 10) return "text-yellow-600";
    return "text-green-600";
  };

  const getStatusColor = (averagingCount: number, maxAveraging: number) => {
    const percentage = (averagingCount / maxAveraging) * 100;
    if (percentage >= 75) return "text-red-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-green-600";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  if (loading && !status) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
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

  if (!status) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500 text-center">
          Немає даних для відображення
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Контроли */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
              Живий статус торгівлі
            </h2>
            <p className="text-sm text-gray-600">
              Моніторинг поточної позиції та ринкових даних
            </p>
            {status && (
              <p className="text-xs text-gray-500 mt-1">
                Останнє оновлення:{" "}
                {new Date(status.lastUpdate).toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3"></div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Статус позиції */}
      {status && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
            Статус позиції
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="text-xs font-medium text-blue-600 mb-1">
                Поточна ціна
              </h4>
              <p className="text-lg font-bold text-blue-900">
                $
                {status.currentPrice
                  ? status.currentPrice.toFixed(4)
                  : "0.0000"}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="text-xs font-medium text-green-600 mb-1">P&L</h4>
              <p
                className={`text-lg font-bold ${getPnLColor(
                  status.unrealizedPnL
                )}`}
              >
                {formatCurrency(status.unrealizedPnL)}
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <h4 className="text-xs font-medium text-yellow-600 mb-1">ROI</h4>
              <p className={`text-lg font-bold ${getPnLColor(status.roi)}`}>
                {formatPercentage(status.roi)}
              </p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <h4 className="text-xs font-medium text-purple-600 mb-1">
                Розмір позиції
              </h4>
              <p className="text-lg font-bold text-purple-900">
                {status.positionSize
                  ? status.positionSize.toFixed(4)
                  : "0.0000"}
              </p>
            </div>
          </div>

          {/* Додаткова інформація */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              {status.entryPrice && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Ціна входу:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    $
                    {status.entryPrice
                      ? status.entryPrice.toFixed(4)
                      : "0.0000"}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Усереднення:</span>
                <span
                  className={`text-sm font-semibold ${getStatusColor(
                    status.averagingCount,
                    status.maxAveraging
                  )}`}
                >
                  {status.averagingCount}/{status.maxAveraging}
                </span>
              </div>
              {status.liquidationPrice && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Ліквідація:</span>
                  <span
                    className={`text-sm font-semibold ${getLiquidationColor(
                      status.distanceToLiquidation
                    )}`}
                  >
                    $
                    {status.liquidationPrice
                      ? status.liquidationPrice.toFixed(4)
                      : "0.0000"}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Зміна ціни:</span>
                <span
                  className={`text-sm font-semibold ${getPnLColor(
                    status.currentPrice -
                      (status.entryPrice || status.currentPrice)
                  )}`}
                >
                  {status.entryPrice
                    ? formatPercentage(
                        (status.currentPrice - status.entryPrice) /
                          status.entryPrice
                      )
                    : "0.00%"}
                </span>
              </div>
              {status.distanceToLiquidation !== 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">До ліквідації:</span>
                  <span
                    className={`text-sm font-semibold ${getLiquidationColor(
                      status.distanceToLiquidation
                    )}`}
                  >
                    {status.distanceToLiquidation
                      ? status.distanceToLiquidation.toFixed(2)
                      : "0.00"}
                    %
                  </span>
                </div>
              )}
              {status.activePositionsCount !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Активних позицій:
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {status.activePositionsCount}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Аналіз ринку */}
      {status?.marketAnalysis && (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
            Аналіз ринку
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-xs font-medium text-gray-600 mb-1">
                Волатильність
              </h4>
              <p className="text-sm font-semibold text-gray-900">
                {status.marketAnalysis.volatility}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-xs font-medium text-gray-600 mb-1">RSI</h4>
              <p className="text-sm font-semibold text-gray-900">
                {status.marketAnalysis.indicators.rsi.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-xs font-medium text-gray-600 mb-1">SMA 20</h4>
              <p className="text-sm font-semibold text-gray-900">
                ${status.marketAnalysis.indicators.sma20.toFixed(4)}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-xs font-medium text-gray-600 mb-1">ATR</h4>
              <p className="text-sm font-semibold text-gray-900">
                ${status.marketAnalysis.indicators.atr.toFixed(4)}
              </p>
            </div>
          </div>

          {/* Рівні підтримки та опору */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="text-xs font-medium text-green-600 mb-1">
                Підтримка
              </h4>
              <p className="text-sm font-semibold text-green-900">
                ${status.marketAnalysis.supportLevel.toFixed(4)}
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <h4 className="text-xs font-medium text-red-600 mb-1">Опір</h4>
              <p className="text-sm font-semibold text-red-900">
                ${status.marketAnalysis.resistanceLevel.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Повідомлення про відсутність даних */}
      {!status && !loading && !error && (
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8 text-center">
          <p className="text-gray-500 mb-4">
            Немає даних для відображення статусу торгівлі
          </p>
          <button
            onClick={loadStatus}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Завантажити статус
          </button>
        </div>
      )}
    </div>
  );
};

export default LiveTradingStatus;
