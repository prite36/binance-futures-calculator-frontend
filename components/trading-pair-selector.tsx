"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { ChevronDown, Search } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface TradingPair {
  symbol: string
  baseAsset: string
  quoteAsset: string
  status: string
  maintMarginPercent: string
  requiredMarginPercent: string
}

interface TradingPairSelectorProps {
  selectedSymbol: string
  onSymbolChange: (symbol: string) => void
  className?: string
}

export function TradingPairSelector({ selectedSymbol, onSymbolChange, className }: TradingPairSelectorProps) {
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter trading pairs based on search query
  const filteredPairs = useMemo(() => {
    if (!searchQuery) return tradingPairs
    
    const query = searchQuery.toLowerCase()
    return tradingPairs.filter(pair => 
      pair.symbol.toLowerCase().includes(query) ||
      pair.baseAsset.toLowerCase().includes(query)
    )
  }, [tradingPairs, searchQuery])

  const fetchTradingPairs = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch("/api/binance/symbols")
      if (!response.ok) {
        throw new Error("Failed to fetch trading pairs")
      }
      
      const data = await response.json()
      setTradingPairs(data.symbols)
      
      // Set default symbol if none selected
      if (!selectedSymbol && data.symbols.length > 0) {
        const btcusdt = data.symbols.find((pair: TradingPair) => pair.symbol === "BTCUSDT")
        onSymbolChange(btcusdt?.symbol || data.symbols[0].symbol)
      }
    } catch (error) {
      console.error("Error fetching trading pairs:", error)
      setError("Failed to load trading pairs")
    } finally {
      setIsLoading(false)
    }
  }, [selectedSymbol, onSymbolChange])

  useEffect(() => {
    fetchTradingPairs()
  }, [fetchTradingPairs])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSelectPair = (symbol: string) => {
    onSymbolChange(symbol)
    setIsOpen(false)
    setSearchQuery("")
  }

  if (error) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label className="text-muted-foreground">Trading Pair</Label>
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive-foreground flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-muted-foreground">Trading Pair</Label>
      <div className="relative" ref={dropdownRef}>
        {/* Trigger Button */}
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className="w-full justify-between bg-card border-border hover:bg-muted/50"
        >
          <span className="font-medium">
            {isLoading ? "Loading..." : selectedSymbol || "Select trading pair"}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>

        {/* Dropdown Content */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-card shadow-lg">
            {/* Search Input */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search trading pairs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 bg-background border-border"
                  autoFocus
                />
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredPairs.length === 0 && searchQuery ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  No trading pairs found for "{searchQuery}"
                </div>
              ) : (
                filteredPairs.map((pair) => (
                  <button
                    key={pair.symbol}
                    onClick={() => handleSelectPair(pair.symbol)}
                    className={`w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-center justify-between ${
                      selectedSymbol === pair.symbol ? 'bg-muted' : ''
                    }`}
                  >
                    <span className="font-medium">{pair.symbol}</span>
                    <span className="text-xs text-muted-foreground">Perp</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      {isLoading && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading trading pairs...
        </div>
      )}
      
      {!isLoading && tradingPairs.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {tradingPairs.length} USDT perpetual futures available
        </div>
      )}
    </div>
  )
}