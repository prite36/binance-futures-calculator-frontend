"use client"

import { useState } from "react"
import { Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LiquidationCalculator } from "@/components/liquidation-calculator"

const tabs = [
  { id: "pnl", label: "PnL" },
  { id: "target", label: "Target Price" },
  { id: "liquidation", label: "Liquidation Price" },
  { id: "maxopen", label: "Max Open" },
  { id: "openprice", label: "Open Price" },
]

export function FuturesCalculator() {
  const [activeTab, setActiveTab] = useState("liquidation")

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-primary">
              <Home className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Futures Calculator</h1>
          </div>
        </div>
      </header>

      {/* Trading Pair */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">BTCUSDT</span>
            <span className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">Perp</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calculator Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === "liquidation" && <LiquidationCalculator />}
        {activeTab !== "liquidation" && (
          <div className="text-center text-muted-foreground py-12">
            {tabs.find((t) => t.id === activeTab)?.label} calculator coming soon...
          </div>
        )}
      </div>
    </div>
  )
}
