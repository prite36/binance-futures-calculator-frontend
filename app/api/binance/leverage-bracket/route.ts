import { NextResponse } from "next/server";
import { apiCache, CACHE_TTL } from "@/lib/api-cache";

export const dynamic = "force-dynamic";

interface BinanceBracket {
  bracket: number;
  initialLeverage: number;
  notionalCap: number;
  notionalFloor: number;
  maintMarginRatio: number;
  cum: number;
}

interface BinanceLeverageBracketResponse {
  symbol: string;
  brackets: BinanceBracket[];
}

// Real BTCUSDT leverage brackets from Binance API
const BTCUSDT_BRACKETS: BinanceBracket[] = [
  {
    bracket: 1,
    initialLeverage: 150,
    notionalCap: 300000,
    notionalFloor: 0,
    maintMarginRatio: 0.004,
    cum: 0.0,
  },
  {
    bracket: 2,
    initialLeverage: 100,
    notionalCap: 800000,
    notionalFloor: 300000,
    maintMarginRatio: 0.005,
    cum: 300.0,
  },
  {
    bracket: 3,
    initialLeverage: 75,
    notionalCap: 3000000,
    notionalFloor: 800000,
    maintMarginRatio: 0.0065,
    cum: 1500.0,
  },
  {
    bracket: 4,
    initialLeverage: 50,
    notionalCap: 12000000,
    notionalFloor: 3000000,
    maintMarginRatio: 0.01,
    cum: 12000.0,
  },
  {
    bracket: 5,
    initialLeverage: 25,
    notionalCap: 70000000,
    notionalFloor: 12000000,
    maintMarginRatio: 0.02,
    cum: 132000.0,
  },
  {
    bracket: 6,
    initialLeverage: 20,
    notionalCap: 100000000,
    notionalFloor: 70000000,
    maintMarginRatio: 0.025,
    cum: 482000.0,
  },
  {
    bracket: 7,
    initialLeverage: 10,
    notionalCap: 230000000,
    notionalFloor: 100000000,
    maintMarginRatio: 0.05,
    cum: 2982000.0,
  },
  {
    bracket: 8,
    initialLeverage: 5,
    notionalCap: 480000000,
    notionalFloor: 230000000,
    maintMarginRatio: 0.1,
    cum: 14482000.0,
  },
  {
    bracket: 9,
    initialLeverage: 4,
    notionalCap: 600000000,
    notionalFloor: 480000000,
    maintMarginRatio: 0.125,
    cum: 26482000.0,
  },
  {
    bracket: 10,
    initialLeverage: 3,
    notionalCap: 800000000,
    notionalFloor: 600000000,
    maintMarginRatio: 0.15,
    cum: 41482000.0,
  },
  {
    bracket: 11,
    initialLeverage: 2,
    notionalCap: 1200000000,
    notionalFloor: 800000000,
    maintMarginRatio: 0.25,
    cum: 121482000.0,
  },
  {
    bracket: 12,
    initialLeverage: 1,
    notionalCap: 1800000000,
    notionalFloor: 1200000000,
    maintMarginRatio: 0.5,
    cum: 421482000.0,
  },
];

// Default brackets for other symbols (conservative approach)
const DEFAULT_BRACKETS: BinanceBracket[] = [
  {
    bracket: 1,
    initialLeverage: 50,
    notionalCap: 5000,
    notionalFloor: 0,
    maintMarginRatio: 0.01,
    cum: 0,
  },
  {
    bracket: 2,
    initialLeverage: 25,
    notionalCap: 25000,
    notionalFloor: 5000,
    maintMarginRatio: 0.025,
    cum: 75,
  },
  {
    bracket: 3,
    initialLeverage: 10,
    notionalCap: 100000,
    notionalFloor: 25000,
    maintMarginRatio: 0.05,
    cum: 700,
  },
  {
    bracket: 4,
    initialLeverage: 5,
    notionalCap: 250000,
    notionalFloor: 100000,
    maintMarginRatio: 0.1,
    cum: 5700,
  },
  {
    bracket: 5,
    initialLeverage: 3,
    notionalCap: 1000000,
    notionalFloor: 250000,
    maintMarginRatio: 0.15,
    cum: 18200,
  },
  {
    bracket: 6,
    initialLeverage: 2,
    notionalCap: 2000000,
    notionalFloor: 1000000,
    maintMarginRatio: 0.25,
    cum: 118200,
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol parameter is required" },
      { status: 400 }
    );
  }

  const cacheKey = `leverage-bracket-${symbol}`;

  try {
    // Check cache first
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Use BTCUSDT brackets for all symbols (as default)
    const brackets = symbol === "BTCUSDT" ? BTCUSDT_BRACKETS : DEFAULT_BRACKETS;

    // Calculate max leverage from brackets
    const maxLeverage = Math.max(
      ...brackets.map((bracket) => bracket.initialLeverage)
    );

    const result = {
      symbol: symbol,
      brackets: brackets,
      maxLeverage,
      timestamp: Date.now(),
    };

    // Cache the result
    apiCache.set(cacheKey, result, CACHE_TTL.LEVERAGE_BRACKETS);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching Binance leverage brackets:", error);
    return NextResponse.json(
      { error: "Failed to fetch leverage brackets" },
      { status: 500 }
    );
  }
}
