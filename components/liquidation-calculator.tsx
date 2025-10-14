"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { calculateLiquidationPrice } from "@/lib/liquidation-formula"
import { TradingPairSelector } from "@/components/trading-pair-selector"

interface BinanceBracket {
  bracket: number
  initialLeverage: number
  notionalCap: number
  notionalFloor: number
  maintMarginRatio: number
  cum: number
}

export function LiquidationCalculator() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT")
  const [marginMode, setMarginMode] = useState<"isolated" | "cross">("cross")
  const [positionMode, setPositionMode] = useState<"one-way" | "hedge">("one-way")
  const [side, setSide] = useState<"long" | "short">("short")
  const [leverage, setLeverage] = useState(10)
  const [entryPrice, setEntryPrice] = useState("90000")
  const [quantity, setQuantity] = useState("0.05")
  const [balance, setBalance] = useState("5000")
  const [liquidationPrice, setLiquidationPrice] = useState<number | null>(null)
  const [binanceBrackets, setBinanceBrackets] = useState<any[] | null>(null)
  const [isLoadingBrackets, setIsLoadingBrackets] = useState(true)
  const [maxLeverage, setMaxLeverage] = useState(150)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  // Memoized validation
  const validationErrors = useMemo(() => {
    const errors: {[key: string]: string} = {}
    
    const entryPriceNum = Number.parseFloat(entryPrice)
    const quantityNum = Number.parseFloat(quantity)
    const balanceNum = Number.parseFloat(balance)
    
    if (!entryPrice || entryPriceNum <= 0) {
      errors.entryPrice = "Entry price must be a positive number"
    }
    
    if (!quantity || quantityNum <= 0) {
      errors.quantity = "Quantity must be a positive number"
    }
    
    if (!balance || balanceNum <= 0) {
      errors.balance = "Balance must be a positive number"
    }
    
    // Check if position size is reasonable
    const positionValue = entryPriceNum * quantityNum
    const requiredMargin = positionValue / leverage
    
    if (requiredMargin > balanceNum && entryPriceNum > 0 && quantityNum > 0 && balanceNum > 0) {
      errors.balance = "Insufficient balance for this position size and leverage"
    }
    
    return errors
  }, [entryPrice, quantity, balance, leverage])

  // Validation function for calculate button
  const validateInputs = () => {
    return Object.keys(validationErrors).length === 0
  }

  useEffect(() => {
    async function fetchBinanceBrackets() {
      if (!selectedSymbol) return
      
      try {
        setIsLoadingBrackets(true)
        setApiError(null)
        const response = await fetch(`/api/binance/leverage-bracket?symbol=${selectedSymbol}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch brackets: ${response.status}`)
        }
        const data = await response.json()
        console.log("[v0] Fetched Binance brackets:", data.brackets)
        setBinanceBrackets(data.brackets)
        setMaxLeverage(data.maxLeverage || 150)
      } catch (error) {
        console.error("[v0] Error fetching Binance brackets:", error)
        setApiError("Failed to load leverage data. Using default values.")
        // Will use default tiers as fallback
        setMaxLeverage(150)
      } finally {
        setIsLoadingBrackets(false)
      }
    }

    fetchBinanceBrackets()
  }, [selectedSymbol])

  useEffect(() => {
    async function fetchCurrentPrice() {
      if (!selectedSymbol) return
      
      try {
        const response = await fetch(`/api/binance/ticker?symbol=${selectedSymbol}`)
        if (!response.ok) {
          throw new Error("Failed to fetch current price")
        }
        const data = await response.json()
        setCurrentPrice(data.price)
      } catch (error) {
        console.error("[v0] Error fetching current price:", error)
        // Don't show error for price fetch as it's not critical
      }
    }

    fetchCurrentPrice()
    
    // Update price every 30 seconds
    const interval = setInterval(fetchCurrentPrice, 30000)
    return () => clearInterval(interval)
  }, [selectedSymbol])

  const maxPosition = Number.parseFloat(balance) * leverage
  
  // Extract base asset from symbol (e.g., BTCUSDT -> BTC)
  const baseAsset = selectedSymbol.replace("USDT", "")

  // Memoize expensive calculations
  const calculationDetails = useMemo(() => {
    const entryPriceNum = Number.parseFloat(entryPrice) || 0
    const quantityNum = Number.parseFloat(quantity) || 0
    const positionValue = entryPriceNum * quantityNum
    const initialMargin = positionValue / leverage
    
    let maintenanceRate = "0.0000%"
    if (binanceBrackets && positionValue > 0) {
      const tier = binanceBrackets.find(
        (bracket) => positionValue >= bracket.notionalFloor && positionValue < bracket.notionalCap
      ) || binanceBrackets[binanceBrackets.length - 1]
      maintenanceRate = `${(tier.maintMarginRatio * 100).toFixed(4)}%`
    }

    return {
      positionValue,
      initialMargin,
      maintenanceRate
    }
  }, [entryPrice, quantity, leverage, binanceBrackets])

  const handleCalculate = () => {
    if (!validateInputs()) {
      setLiquidationPrice(null)
      return
    }
    
    const tiers = binanceBrackets
      ? binanceBrackets.map((bracket) => ({
          minNotional: bracket.notionalFloor,
          maxNotional: bracket.notionalCap,
          maintenanceMarginRate: bracket.maintMarginRatio,
          maintenanceAmount: bracket.cum,
          maxLeverage: bracket.initialLeverage,
        }))
      : undefined

    const result = calculateLiquidationPrice({
      side,
      leverage,
      entryPrice: Number.parseFloat(entryPrice),
      quantity: Number.parseFloat(quantity),
      balance: Number.parseFloat(balance),
      marginMode,
      tiers, // Pass real-time tiers from Binance
      symbol: selectedSymbol, // Pass selected symbol for logging
    })
    setLiquidationPrice(result)
  }

  // Only validate leverage limits, don't auto-calculate
  useEffect(() => {
    if (leverage > maxLeverage) {
      setLeverage(maxLeverage)
    }
  }, [leverage, maxLeverage])

  // Clear liquidation price when inputs change (so user knows to recalculate)
  useEffect(() => {
    setLiquidationPrice(null)
  }, [side, leverage, entryPrice, quantity, balance, marginMode, selectedSymbol])

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr,400px]">
      {/* Left Panel - Inputs */}
      <div className="space-y-6">
        {/* Trading Pair Selector */}
        <TradingPairSelector
          selectedSymbol={selectedSymbol}
          onSymbolChange={setSelectedSymbol}
        />

        {isLoadingBrackets && (
          <div className="rounded-lg bg-card border border-border p-3 text-sm text-muted-foreground flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading real-time Binance data...
          </div>
        )}

        {!isLoadingBrackets && binanceBrackets && !apiError && (
          <div className="rounded-lg bg-success/10 border border-success/20 p-3 text-sm text-success-foreground flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {selectedSymbol === "BTCUSDT" 
              ? "Using real Binance BTCUSDT leverage brackets" 
              : "Using default leverage brackets (BTCUSDT-based)"}
          </div>
        )}

        {apiError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive-foreground flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {apiError}
          </div>
        )}

        {/* Margin Mode & Position Mode */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Margin Mode</Label>
            <Select value={marginMode} onValueChange={(v: any) => setMarginMode(v)}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="isolated">Isolated</SelectItem>
                <SelectItem value="cross">Cross</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Position Mode</Label>
            <Select value={positionMode} onValueChange={(v: any) => setPositionMode(v)}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one-way">One-way Mode</SelectItem>
                <SelectItem value="hedge">Hedge Mode</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Long/Short Toggle */}
        <div className="space-y-2">
          <Label className="text-muted-foreground">Position Side</Label>
          <div className="grid grid-cols-2 gap-0 rounded-lg overflow-hidden border border-border">
            <button
              type="button"
              onClick={() => setSide("long")}
              className={`py-3 text-sm font-medium transition-all duration-200 ${
                side === "long"
                  ? "bg-success text-success-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Long
            </button>
            <button
              type="button"
              onClick={() => setSide("short")}
              className={`py-3 text-sm font-medium transition-all duration-200 ${
                side === "short"
                  ? "bg-destructive text-destructive-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Short
            </button>
          </div>
        </div>

        {/* Leverage Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground">Leverage</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setLeverage(Math.max(1, leverage - 1))}
              >
                −
              </Button>
              <span className="text-xl font-bold w-16 text-center">{leverage}x</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setLeverage(Math.min(maxLeverage, leverage + 1))}
              >
                +
              </Button>
            </div>
          </div>
          <Slider
            value={[leverage]}
            onValueChange={(v) => setLeverage(v[0])}
            min={1}
            max={maxLeverage}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1x</span>
            <span>{Math.floor(maxLeverage * 0.2)}x</span>
            <span>{Math.floor(maxLeverage * 0.4)}x</span>
            <span>{Math.floor(maxLeverage * 0.6)}x</span>
            <span>{Math.floor(maxLeverage * 0.8)}x</span>
            <span>{maxLeverage}x</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Maximum position at current leverage:{" "}
            <span className="text-foreground font-medium">{maxPosition.toLocaleString()} USDT</span>
          </p>
        </div>

        {/* Entry Price */}
        <div className="space-y-2">
          <Label htmlFor="entry-price" className="text-muted-foreground">
            Entry Price
          </Label>
          <div className="relative">
            <Input
              id="entry-price"
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className={`bg-card border-border pr-16 text-right ${validationErrors.entryPrice ? 'border-destructive' : ''}`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">USDT</span>
          </div>
          {validationErrors.entryPrice && (
            <p className="text-xs text-destructive">{validationErrors.entryPrice}</p>
          )}
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="quantity" className="text-muted-foreground">
            Quantity ({baseAsset})
          </Label>
          <div className="relative">
            <Input
              id="quantity"
              type="number"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={`bg-card border-border pr-16 text-right border-2 ${validationErrors.quantity ? 'border-destructive' : 'border-primary'}`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">{baseAsset}</span>
          </div>
          {validationErrors.quantity && (
            <p className="text-xs text-destructive">{validationErrors.quantity}</p>
          )}
        </div>

        {/* Balance */}
        <div className="space-y-2">
          <Label htmlFor="balance" className="text-muted-foreground">
            Balance
          </Label>
          <div className="relative">
            <Input
              id="balance"
              type="number"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className={`bg-card border-border pr-16 text-right ${validationErrors.balance ? 'border-destructive' : ''}`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">USDT</span>
          </div>
          {validationErrors.balance && (
            <p className="text-xs text-destructive">{validationErrors.balance}</p>
          )}
        </div>

        {/* Calculate Button */}
        <Button
          type="button"
          onClick={handleCalculate}
          disabled={isLoadingBrackets || Object.keys(validationErrors).length > 0}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed h-12 text-base font-semibold transition-all duration-200"
        >
          {isLoadingBrackets ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Loading...
            </div>
          ) : liquidationPrice === null ? (
            "Calculate Liquidation Price"
          ) : (
            "Recalculate"
          )}
        </Button>
      </div>

      {/* Right Panel - Results */}
      <div className="space-y-6">
        <div className="rounded-lg bg-card border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Results</h3>
            <div className="text-xs text-muted-foreground">
              {selectedSymbol}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Liquidation Price</div>
            <div className={`text-3xl font-bold ${
              liquidationPrice !== null 
                ? side === "long" 
                  ? "text-destructive" 
                  : "text-success"
                : "text-muted-foreground"
            }`}>
              {liquidationPrice !== null
                ? `${liquidationPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} USDT`
                : "Click Calculate"}
            </div>
            {liquidationPrice === null && (
              <div className="text-xs text-muted-foreground">
                Enter your position details and click Calculate to see the liquidation price
              </div>
            )}
          </div>

          {currentPrice && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Current Price</div>
              <div className="text-lg font-medium">
                {currentPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} USDT
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              * Your open positions will be taken into consideration when calculating the liquidation price. Unrealized
              PNL and maintenance margin of your open position will affect the calculation of liquidation price.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ** {selectedSymbol === "BTCUSDT" 
                ? "Calculations use real Binance BTCUSDT leverage brackets." 
                : "Calculations use default leverage brackets. For accurate results on other pairs, please verify with official Binance futures calculator."}
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="rounded-lg bg-card border border-border p-6 space-y-3">
          <h4 className="font-semibold text-sm">Calculation Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Position Value:</span>
              <span className="font-medium">
                {calculationDetails.positionValue.toLocaleString()} USDT
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Initial Margin:</span>
              <span className="font-medium">
                {calculationDetails.initialMargin.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                USDT
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Margin Mode:</span>
              <span className="font-medium capitalize">{marginMode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Position Side:</span>
              <span className={`font-medium capitalize ${
                side === "long" ? "text-success" : "text-destructive"
              }`}>
                {side}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Leverage:</span>
              <span className="font-medium">{maxLeverage}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Maintenance Rate:</span>
              <span className="font-medium">
                {calculationDetails.maintenanceRate}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
