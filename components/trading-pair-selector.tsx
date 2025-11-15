"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
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

function TradingPairSelectorComponent({ selectedSymbol, onSymbolChange, className }: TradingPairSelectorProps) {
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isProtected, setIsProtected] = useState(false)
  
  // Use refs to prevent re-render issues
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isOpenRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Update ref when isOpen changes
  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  // Filter trading pairs based on search query
  const filteredPairs = searchQuery 
    ? tradingPairs.filter(pair => 
        pair.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pair.baseAsset.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tradingPairs

  // Stable callback for symbol change
  const handleSymbolChange = useCallback((symbol: string) => {
    onSymbolChange(symbol)
    setIsOpen(false)
    setSearchQuery("")
  }, [onSymbolChange])

  // Stable callback for toggle with protection
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    if (!isOpen) {
      setIsOpen(true)
      setIsProtected(true)
      
      // Remove protection after delay
      setTimeout(() => {
        setIsProtected(false)
      }, 2000) // 2 seconds protection
    } else {
      setIsOpen(false)
    }
  }, [isOpen])

  // Click outside handler with protection
  useEffect(() => {
    if (!isOpen || isProtected) return

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    // Add delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 500)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, isProtected])

  useEffect(() => {
    const fetchTradingPairs = async () => {
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
    }

    fetchTradingPairs()
  }, []) // Only fetch once



  if (error) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label className="text-muted-foreground">Trading Pair</Label>
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive flex items-center gap-2 backdrop-blur-sm">
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
          onClick={handleToggle}
          disabled={isLoading}
          type="button"
          className="w-full justify-between bg-card border-border hover:bg-muted/50 cursor-pointer disabled:cursor-not-allowed"
        >
          <span className="font-medium">
            {isLoading ? "Loading..." : selectedSymbol || "Select trading pair"}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>

        {/* Dropdown Content */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md bg-popover border border-border shadow-xl backdrop-blur-md">
            {/* Search Input */}
            <div className="p-3 border-b border-border">
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
                    onClick={() => handleSymbolChange(pair.symbol)}
                    className={`w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-center justify-between cursor-pointer ${
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

export const TradingPairSelector = memo(TradingPairSelectorComponent);