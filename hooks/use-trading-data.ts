"use client";

import { useState, useEffect, useCallback } from "react";

interface TradingDataHook {
  leverageBrackets: any[] | null;
  currentPrice: number | null;
  maxLeverage: number;
  isLoadingBrackets: boolean;
  apiError: string | null;
  refetchBrackets: () => void;
  refetchPrice: () => void;
}

export function useTradingData(symbol: string): TradingDataHook {
  const [leverageBrackets, setLeverageBrackets] = useState<any[] | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [maxLeverage, setMaxLeverage] = useState(150);
  const [isLoadingBrackets, setIsLoadingBrackets] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch leverage brackets
  const fetchBinanceBrackets = useCallback(async () => {
    if (!symbol) return;

    try {
      setIsLoadingBrackets(true);
      setApiError(null);
      const response = await fetch(`/api/binance/leverage-bracket?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch brackets: ${response.status}`);
      }
      const data = await response.json();
      setLeverageBrackets(data.brackets);
      setMaxLeverage(data.maxLeverage || 150);
    } catch (error) {
      console.error("Error fetching Binance brackets:", error);
      setApiError("Failed to load leverage data from API.");
      setLeverageBrackets(null);
      setMaxLeverage(1);
    } finally {
      setIsLoadingBrackets(false);
    }
  }, [symbol]);

  // Fetch current price
  const fetchCurrentPrice = useCallback(async () => {
    if (!symbol) return;

    try {
      const response = await fetch(`/api/binance/ticker?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error("Failed to fetch current price");
      }
      const data = await response.json();
      setCurrentPrice(data.price);
    } catch (error) {
      console.error("Error fetching current price:", error);
      // Don't set error for price fetch as it's not critical
    }
  }, [symbol]);

  // Fetch data when symbol changes
  useEffect(() => {
    fetchBinanceBrackets();
  }, [fetchBinanceBrackets]);

  useEffect(() => {
    fetchCurrentPrice();
    
    // Update price every 30 seconds
    const interval = setInterval(fetchCurrentPrice, 30000);
    return () => clearInterval(interval);
  }, [fetchCurrentPrice]);

  return {
    leverageBrackets,
    currentPrice,
    maxLeverage,
    isLoadingBrackets,
    apiError,
    refetchBrackets: fetchBinanceBrackets,
    refetchPrice: fetchCurrentPrice,
  };
}