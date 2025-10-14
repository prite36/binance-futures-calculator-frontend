// Fetch real-time BTCUSDT leverage brackets from Binance API
const BINANCE_API = "https://fapi.binance.com"

async function fetchBTCUSDTBrackets() {
  try {
    console.log("[v0] Fetching BTCUSDT leverage brackets from Binance API...")
    console.log("[v0] API Endpoint:", `${BINANCE_API}/fapi/v1/leverageBracket?symbol=BTCUSDT`)

    const response = await fetch(`${BINANCE_API}/fapi/v1/leverageBracket?symbol=BTCUSDT`)

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log("[v0] ===== BTCUSDT LEVERAGE BRACKETS =====")
    console.log(JSON.stringify(data, null, 2))

    if (Array.isArray(data) && data.length > 0) {
      const btcData = data[0]
      console.log("\n[v0] ===== FORMATTED BRACKETS =====")
      console.log(`Symbol: ${btcData.symbol}`)
      console.log(`Notional Coefficient: ${btcData.notionalCoef}`)
      console.log("\nBrackets:")

      btcData.brackets.forEach((bracket: any, index: number) => {
        console.log(`\n  Bracket ${bracket.bracket}:`)
        console.log(`    Notional Range: ${bracket.notionalFloor} - ${bracket.notionalCap} USDT`)
        console.log(`    Max Leverage: ${bracket.initialLeverage}x`)
        console.log(
          `    Maintenance Margin Rate: ${bracket.maintMarginRatio} (${(bracket.maintMarginRatio * 100).toFixed(2)}%)`,
        )
        console.log(`    Maintenance Amount (cum): ${bracket.cum} USDT`)
      })

      // Test calculation with user's example
      console.log("\n[v0] ===== TEST CALCULATION =====")
      console.log("Test Case: SHORT position")
      console.log("  Entry Price: 90,000 USDT")
      console.log("  Quantity: 0.05 BTC")
      console.log("  Balance: 5,000 USDT")
      console.log("  Notional: 4,500 USDT")

      const testNotional = 90000 * 0.05
      const bracket = btcData.brackets.find(
        (b: any) => testNotional >= b.notionalFloor && testNotional <= b.notionalCap,
      )

      if (bracket) {
        console.log(`\n  Using Bracket ${bracket.bracket}:`)
        console.log(`    MMR: ${bracket.maintMarginRatio}`)
        console.log(`    cum: ${bracket.cum}`)

        const WB = 5000
        const Position = 0.05
        const EP = 90000
        const MMR = bracket.maintMarginRatio
        const cumB = bracket.cum

        const LP = (WB - cumB + Position * EP) / (Position * (1 + MMR))
        console.log(`\n  Calculated Liquidation Price: ${LP.toFixed(2)} USDT`)
        console.log(`  Expected (from Binance): 189,180.45 USDT`)
        console.log(`  Difference: ${(LP - 189180.45).toFixed(2)} USDT`)
      }
    }
  } catch (error) {
    console.error("[v0] Error fetching brackets:", error)
  }
}

fetchBTCUSDTBrackets()
