import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface BinanceTickerPrice {
  symbol: string
  price: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")

  if (!symbol) {
    return NextResponse.json({ error: "Symbol parameter is required" }, { status: 400 })
  }

  try {
    // Fetch current price from Binance Futures API
    const response = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`)
    }

    const data: BinanceTickerPrice = await response.json()

    return NextResponse.json({
      symbol: data.symbol,
      price: parseFloat(data.price),
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("Error fetching Binance ticker price:", error)
    return NextResponse.json({ error: "Failed to fetch ticker price" }, { status: 500 })
  }
}