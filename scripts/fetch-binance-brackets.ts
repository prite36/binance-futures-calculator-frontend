/**
 * Fetch real-time leverage brackets from Binance API
 * This script fetches the current maintenance margin rates and amounts for BTCUSDT
 */

const BINANCE_API_URL = "https://fapi.binance.com/fapi/v1/leverageBracket"

interface BinanceBracket {
  bracket: number
  initialLeverage: number
  notionalCap: number
  notionalFloor: number
  maintMarginRatio: number
  cum: number
}

interface BinanceSymbolBracket {
  symbol: string
  brackets: BinanceBracket[]
}

async function fetchLeverageBrackets() {
  try {
    console.log("[v0] Fetching leverage brackets from Binance API...")

    const response = await fetch(`${BINANCE_API_URL}?symbol=BTCUSDT`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: BinanceSymbolBracket[] = await response.json()

    console.log("[v0] Successfully fetched brackets:")
    console.log(JSON.stringify(data, null, 2))

    // Extract BTCUSDT brackets
    const btcusdtData = data.find((item) => item.symbol === "BTCUSDT")

    if (btcusdtData) {
      console.log("\n[v0] BTCUSDT Leverage Brackets:")
      console.log("================================")
      btcusdtData.brackets.forEach((bracket) => {
        console.log(`Bracket ${bracket.bracket}:`)
        console.log(`  Notional Range: ${bracket.notionalFloor} - ${bracket.notionalCap} USDT`)
        console.log(`  Max Leverage: ${bracket.initialLeverage}x`)
        console.log(
          `  Maintenance Margin Rate: ${bracket.maintMarginRatio} (${(bracket.maintMarginRatio * 100).toFixed(2)}%)`,
        )
        console.log(`  Maintenance Amount (cum): ${bracket.cum} USDT`)
        console.log("---")
      })

      // Generate TypeScript code for the tiers
      console.log("\n[v0] TypeScript code for liquidation-formula.ts:")
      console.log("================================")
      console.log("const BTCUSDT_TIERS: MaintenanceTier[] = [")
      btcusdtData.brackets.forEach((bracket, index) => {
        const maxNotional =
          bracket.notionalCap === 9223372036854776000 ? "Number.POSITIVE_INFINITY" : bracket.notionalCap
        console.log(`  {`)
        console.log(`    minNotional: ${bracket.notionalFloor},`)
        console.log(`    maxNotional: ${maxNotional},`)
        console.log(`    maintenanceMarginRate: ${bracket.maintMarginRatio},`)
        console.log(`    maintenanceAmount: ${bracket.cum},`)
        console.log(`    maxLeverage: ${bracket.initialLeverage}`)
        console.log(`  }${index < btcusdtData.brackets.length - 1 ? "," : ""}`)
      })
      console.log("]")
    }
  } catch (error) {
    console.error("[v0] Error fetching leverage brackets:", error)
  }
}

fetchLeverageBrackets()
