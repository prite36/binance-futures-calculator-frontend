import { NextResponse } from "next/server";
import { apiCache, CACHE_TTL } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

interface BinanceSymbolInfo {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  maintMarginPercent: string;
  requiredMarginPercent: string;
}

interface BinanceExchangeInfo {
  symbols: BinanceSymbolInfo[];
}

export async function GET() {
  const cacheKey = "binance-symbols";

  try {
    // Check cache first
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Fetch exchange info from Binance Futures API
    const response = await fetch(
      "https://fapi.binance.com/fapi/v1/exchangeInfo",
      {
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data: BinanceExchangeInfo = await response.json();

    // Filter only USDT perpetual futures that are trading
    const usdtPerpetuals = data.symbols.filter(
      (symbol) =>
        symbol.quoteAsset === "USDT" &&
        symbol.status === "TRADING" &&
        !symbol.symbol.includes("_") // Exclude quarterly futures
    );

    // Sort by symbol name for better UX
    usdtPerpetuals.sort((a, b) => a.symbol.localeCompare(b.symbol));

    const result = {
      symbols: usdtPerpetuals,
      count: usdtPerpetuals.length,
    };

    // Cache the result
    apiCache.set(cacheKey, result, CACHE_TTL.SYMBOLS);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching Binance symbols:", error);
    return NextResponse.json(
      { error: "Failed to fetch trading symbols" },
      { status: 500 }
    );
  }
}
