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

    // Fetch from your API
    const apiEndpoint = process.env.SPRITE_FLOW_API_ENDPOINT || 'https://trading-bot-api.spritelemon36.space';
    const apiUrl = `${apiEndpoint}/ctx/exchange/leverage-brackets?symbol=${symbol}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const apiData = await response.json();
    
    // Transform API response to match our format
    if (apiData && apiData.length > 0 && apiData[0].brackets) {
      const symbolData = apiData[0];
      
      // Convert string values to numbers
      const brackets = symbolData.brackets.map((bracket: {
        bracket: string;
        initialLeverage: string;
        notionalCap: string;
        notionalFloor: string;
        maintMarginRatio: string;
        cum: string;
      }) => ({
        bracket: parseInt(bracket.bracket),
        initialLeverage: parseInt(bracket.initialLeverage),
        notionalCap: parseFloat(bracket.notionalCap),
        notionalFloor: parseFloat(bracket.notionalFloor),
        maintMarginRatio: parseFloat(bracket.maintMarginRatio),
        cum: parseFloat(bracket.cum),
      }));

      // Calculate max leverage from brackets
      const maxLeverage = Math.max(...brackets.map((bracket: BinanceBracket) => bracket.initialLeverage));

      const result = {
        symbol: symbolData.symbol,
        brackets: brackets,
        maxLeverage,
        timestamp: Date.now(),
        source: 'api'
      };

      // Cache the result
      apiCache.set(cacheKey, result, CACHE_TTL.LEVERAGE_BRACKETS);

      return NextResponse.json(result);
    }

    throw new Error("Invalid API response format");
  } catch (error) {
    console.error("Error fetching leverage brackets:", error);
    return NextResponse.json(
      { error: "Failed to fetch leverage brackets from API" },
      { status: 500 }
    );
  }
}
