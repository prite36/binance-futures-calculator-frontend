"use client";

import { useState, useEffect, useCallback } from "react";

interface SymbolInfo {
  symbol: string;
  pricePrecision: number;
  quantityPrecision: number;
  baseAssetPrecision: number;
  quotePrecision: number;
  baseAsset: string;
  quoteAsset: string;
  status: string;
}

interface TradingDataHook {
  leverageBrackets: any[] | null;
  currentPrice: number | null;
  maxLeverage: number;
  symbolInfo: SymbolInfo | null;
  pricePrecision: number;
  quantityPrecision: number;
  isLoadingBrackets: boolean;
  isLoadingSymbolInfo: boolean;
  apiError: string | null;
  refetchBrackets: () => void;
  refetchPrice: () => void;
}

export function useTradingData(symbol: string): TradingDataHook {

  const [leverageBrackets, setLeverageBrackets] = useState<any[] | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [maxLeverage, setMaxLeverage] = useState(150);
  const [symbolInfo, setSymbolInfo] = useState<SymbolInfo | null>(null);
  const [isLoadingBrackets, setIsLoadingBrackets] = useState(true);
  const [isLoadingSymbolInfo, setIsLoadingSymbolInfo] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Get precision values with defaults
  const pricePrecision = symbolInfo?.pricePrecision ?? 2;
  const quantityPrecision = symbolInfo?.quantityPrecision ?? 3;

  // Fetch symbol information
  const fetchSymbolInfo = useCallback(async () => {
    if (!symbol) return;

    try {
      setIsLoadingSymbolInfo(true);
      const response = await fetch('/api/binance/symbols');
      if (!response.ok) {
        throw new Error(`Failed to fetch symbols: ${response.status}`);
      }
      const data = await response.json();
      
      // Find the specific symbol
      const foundSymbol = data.symbols.find((s: any) => s.symbol === symbol);
      if (foundSymbol) {
        setSymbolInfo({
          symbol: foundSymbol.symbol,
          pricePrecision: foundSymbol.pricePrecision || 2,
          quantityPrecision: foundSymbol.quantityPrecision || 3,
          baseAssetPrecision: foundSymbol.baseAssetPrecision || 8,
          quotePrecision: foundSymbol.quotePrecision || 8,
          baseAsset: foundSymbol.baseAsset,
          quoteAsset: foundSymbol.quoteAsset,
          status: foundSymbol.status,
        });
      } else {
        // Set default values if symbol not found
        setSymbolInfo({
          symbol,
          pricePrecision: 2,
          quantityPrecision: 3,
          baseAssetPrecision: 8,
          quotePrecision: 8,
          baseAsset: symbol.replace('USDT', ''),
          quoteAsset: 'USDT',
          status: 'TRADING',
        });
      }
    } catch (error) {
      console.error("Error fetching symbol info:", error);
      // Set default values on error
      setSymbolInfo({
        symbol,
        pricePrecision: 2,
        quantityPrecision: 3,
        baseAssetPrecision: 8,
        quotePrecision: 8,
        baseAsset: symbol.replace('USDT', ''),
        quoteAsset: 'USDT',
        status: 'TRADING',
      });
    } finally {
      setIsLoadingSymbolInfo(false);
    }
  }, [symbol]);

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
    fetchSymbolInfo();
  }, [symbol, fetchBinanceBrackets, fetchSymbolInfo]);

  useEffect(() => {
    fetchCurrentPrice();
    
    // Update price every 30 seconds
    const interval = setInterval(fetchCurrentPrice, 30000);
    return () => clearInterval(interval);
  }, [symbol]);

  return {
    leverageBrackets,
    currentPrice,
    maxLeverage,
    symbolInfo,
    pricePrecision,
    quantityPrecision,
    isLoadingBrackets,
    isLoadingSymbolInfo,
    apiError,
    refetchBrackets: fetchBinanceBrackets,
    refetchPrice: fetchCurrentPrice,
  };
}