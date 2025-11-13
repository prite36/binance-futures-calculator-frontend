"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { TradingPairSelector } from "@/components/trading-pair-selector";
import { PositionTable } from "@/components/position-table";
import { ResultsSummary } from "@/components/results-summary";
import { calculateLiquidationPrice } from "@/lib/liquidation-formula";
import { useTradingData } from "@/hooks/use-trading-data";

interface Position {
  id: string;
  orderPrice: string;
  quantity: string;
  liquidationPrice?: number;
  error?: string;
}

interface PositionSummary {
  totalPositionSize: number;
  averageEntryPrice: number;
  finalLiquidationPrice: number;
  totalMarginUsed: number;
  remainingBalance: number;
  riskWarnings: string[];
}

interface RiskAnalysis {
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  warnings: string[];
  recommendations: string[];
}

interface MaintenanceTier {
  minNotional: number;
  maxNotional: number;
  maintenanceMarginRate: number;
  maintenanceAmount: number;
  maxLeverage: number;
}

export function MultiPositionCalculator() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [leverage, setLeverage] = useState(10);
  const [positionSide, setPositionSide] = useState<"long" | "short">("long");
  const [balance, setBalance] = useState(5000);
  const [positions, setPositions] = useState<Position[]>([
    { id: "1", orderPrice: "", quantity: "" },
  ]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [summary, setSummary] = useState<PositionSummary | null>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Use shared trading data hook
  const {
    leverageBrackets: binanceBrackets,
    currentPrice,
    maxLeverage,
    isLoadingBrackets,
    apiError,
  } = useTradingData(selectedSymbol);

  // Extract base asset from symbol
  const baseAsset = selectedSymbol.replace("USDT", "");

  // Validate leverage limits
  useEffect(() => {
    if (leverage > maxLeverage) {
      setLeverage(maxLeverage);
    }
  }, [leverage, maxLeverage]);

  // Add new position
  const addPosition = useCallback(() => {
    const newId = (positions.length + 1).toString();
    setPositions((prev) => [
      ...prev,
      { id: newId, orderPrice: "", quantity: "" },
    ]);
  }, [positions.length]);

  // Remove position
  const removePosition = useCallback((id: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Update position - direct update for better UX
  const updatePosition = useCallback(
    (id: string, field: keyof Position, value: any) => {
      setPositions((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
      );
    },
    []
  );

  // Calculate cumulative position - memoized for performance
  const calculateCumulativePosition = useMemo(
    () => (positions: Position[], leverage: number) => {
      let totalQuantity = 0;
      let totalNotionalValue = 0;

      positions.forEach((position) => {
        const orderPrice = parseFloat(position.orderPrice) || 0;
        const quantity = parseFloat(position.quantity) || 0;
        if (orderPrice > 0 && quantity > 0) {
          totalQuantity += quantity;
          totalNotionalValue += orderPrice * quantity;
        }
      });

      const averageEntryPrice =
        totalQuantity > 0 ? totalNotionalValue / totalQuantity : 0;
      const totalMarginUsed = totalNotionalValue / leverage;

      return {
        totalQuantity,
        totalNotionalValue,
        averageEntryPrice,
        totalMarginUsed,
      };
    },
    []
  );

  // Calculate liquidation prices for all positions
  const calculatePositionLiquidationPrices = useCallback(
    (
      positions: Position[],
      leverage: number,
      balance: number,
      positionSide: "long" | "short",
      tiers: MaintenanceTier[]
    ): Position[] => {
      const calculatedPositions: Position[] = [];
      let cumulativeQuantity = 0;
      let cumulativeNotionalValue = 0;

      positions.forEach((position, index) => {
        const orderPrice = parseFloat(position.orderPrice) || 0;
        const quantity = parseFloat(position.quantity) || 0;
        
        if (orderPrice <= 0 || quantity <= 0) {
          calculatedPositions.push({
            ...position,
            error: "กรุณาป้อนราคาและจำนวนที่ถูกต้อง",
          });
          return;
        }

        // Calculate cumulative position up to this row
        cumulativeQuantity += quantity;
        cumulativeNotionalValue += orderPrice * quantity;

        const averageEntryPrice = cumulativeNotionalValue / cumulativeQuantity;
        const totalMarginUsed = cumulativeNotionalValue / leverage;

        // Check if margin is sufficient
        if (totalMarginUsed > balance) {
          calculatedPositions.push({
            ...position,
            error: "Margin ไม่เพียงพอ",
          });
          return;
        }

        // Calculate liquidation price for cumulative position
        try {
          const liquidationPrice = calculateLiquidationPrice({
            side: positionSide,
            leverage,
            entryPrice: averageEntryPrice,
            quantity: cumulativeQuantity,
            balance,
            marginMode: "cross",
            tiers,
            symbol: selectedSymbol,
          });

          // Check risk warning
          let error: string | undefined;
          if (index > 0) {
            const previousLiquidationPrice =
              calculatedPositions[index - 1]?.liquidationPrice;
            if (previousLiquidationPrice) {
              if (
                positionSide === "long" &&
                orderPrice < previousLiquidationPrice
              ) {
                error = "ราคาต่ำกว่า Liquidation Price ของ position ก่อนหน้า";
              } else if (
                positionSide === "short" &&
                orderPrice > previousLiquidationPrice
              ) {
                error = "ราคาสูงกว่า Liquidation Price ของ position ก่อนหน้า";
              }
            }
          }

          calculatedPositions.push({
            ...position,
            liquidationPrice,
            error,
          });
        } catch (error) {
          calculatedPositions.push({
            ...position,
            error: "ไม่สามารถคำนวณได้",
          });
        }
      });

      return calculatedPositions;
    },
    [selectedSymbol]
  );

  // Calculate position summary
  const calculatePositionSummary = useCallback(
    (
      positions: Position[],
      leverage: number,
      balance: number
    ): PositionSummary => {
      const validPositions = positions.filter((p) => {
        const orderPrice = parseFloat(p.orderPrice) || 0;
        const quantity = parseFloat(p.quantity) || 0;
        return orderPrice > 0 && quantity > 0;
      });

      if (validPositions.length === 0) {
        return {
          totalPositionSize: 0,
          averageEntryPrice: 0,
          finalLiquidationPrice: 0,
          totalMarginUsed: 0,
          remainingBalance: balance,
          riskWarnings: [],
        };
      }

      const cumulative = calculateCumulativePosition(validPositions, leverage);
      const finalPosition = positions[positions.length - 1];

      const riskWarnings: string[] = [];

      // Check risk warnings
      if (cumulative.totalMarginUsed > balance * 0.8) {
        riskWarnings.push("ใช้ margin มากกว่า 80% ของยอดคงเหลือ");
      }

      if (cumulative.totalMarginUsed > balance) {
        riskWarnings.push("Margin ไม่เพียงพอสำหรับ position ทั้งหมด");
      }

      positions.forEach((position, index) => {
        if (position.error && position.error.includes("Liquidation Price")) {
          riskWarnings.push(`Position ${index + 1}: ${position.error}`);
        }
      });

      return {
        totalPositionSize: cumulative.totalQuantity,
        averageEntryPrice: cumulative.averageEntryPrice,
        finalLiquidationPrice: finalPosition?.liquidationPrice || 0,
        totalMarginUsed: cumulative.totalMarginUsed,
        remainingBalance: balance - cumulative.totalMarginUsed,
        riskWarnings,
      };
    },
    [calculateCumulativePosition]
  );

  // Analyze position risk
  const analyzePositionRisk = useCallback(
    (
      positions: Position[],
      summary: PositionSummary,
      currentPrice: number | null
    ): RiskAnalysis => {
      const warnings: string[] = [];
      const recommendations: string[] = [];
      let riskLevel: RiskAnalysis["riskLevel"] = "LOW";

      // Check margin utilization
      const totalBalance = summary.totalMarginUsed + summary.remainingBalance;
      const marginUtilization = summary.totalMarginUsed / totalBalance;

      if (marginUtilization > 0.9) {
        riskLevel = "CRITICAL";
        warnings.push("ใช้ margin มากกว่า 90%");
        recommendations.push("ลดขนาด position หรือเพิ่มยอดคงเหลือ");
      } else if (marginUtilization > 0.7) {
        riskLevel = "HIGH";
        warnings.push("ใช้ margin มากกว่า 70%");
        recommendations.push("ควรระวังการจัดการ risk");
      } else if (marginUtilization > 0.5) {
        riskLevel = "MEDIUM";
        warnings.push("ใช้ margin มากกว่า 50%");
      }

      // Check distance from liquidation price
      if (currentPrice && summary.finalLiquidationPrice) {
        const priceDistance =
          Math.abs(currentPrice - summary.finalLiquidationPrice) / currentPrice;

        if (priceDistance < 0.05) {
          // Less than 5%
          riskLevel = "CRITICAL";
          warnings.push("ราคาปัจจุบันใกล้ Liquidation Price มาก");
          recommendations.push("ปิด position บางส่วนหรือเพิ่ม margin");
        } else if (priceDistance < 0.1) {
          // Less than 10%
          if (riskLevel !== "CRITICAL") riskLevel = "HIGH";
          warnings.push("ราคาปัจจุบันใกล้ Liquidation Price");
        }
      }

      // Check position ordering
      positions.forEach((position, index) => {
        if (position.error && position.error.includes("Liquidation Price")) {
          if (riskLevel !== "CRITICAL") riskLevel = "HIGH";
          warnings.push(`Position ${index + 1}: วางราคาในระดับเสี่ยง`);
          recommendations.push(`ปรับราคา Position ${index + 1} ให้เหมาะสม`);
        }
      });

      return {
        riskLevel,
        warnings,
        recommendations,
      };
    },
    []
  );

  // Handle calculate button
  const handleCalculate = useCallback(async () => {
    if (!binanceBrackets || binanceBrackets.length === 0) {
      console.error("Cannot calculate without leverage bracket data.");
      return;
    }

    setIsCalculating(true);

    try {
      const tiers = binanceBrackets.map((bracket) => ({
        minNotional: bracket.notionalFloor,
        maxNotional: bracket.notionalCap,
        maintenanceMarginRate: bracket.maintMarginRatio,
        maintenanceAmount: bracket.cum,
        maxLeverage: bracket.initialLeverage,
      }));

      const calculatedPositions = calculatePositionLiquidationPrices(
        positions,
        leverage,
        balance,
        positionSide,
        tiers
      );

      setPositions(calculatedPositions);

      const summary = calculatePositionSummary(
        calculatedPositions,
        leverage,
        balance
      );
      setSummary(summary);

      const riskAnalysis = analyzePositionRisk(
        calculatedPositions,
        summary,
        currentPrice
      );
      setRiskAnalysis(riskAnalysis);

      // Show success message
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error("Calculation error:", error);
      // Show error in console, but don't break the UI
    } finally {
      setIsCalculating(false);
    }
  }, [
    binanceBrackets,
    positions,
    leverage,
    balance,
    positionSide,
    calculatePositionLiquidationPrices,
    calculatePositionSummary,
    analyzePositionRisk,
    currentPrice,
  ]);

  // Validation - memoized for performance
  const canCalculate = useMemo(() => {
    const hasValidPositions = positions.some((p) => {
      const orderPrice = parseFloat(p.orderPrice) || 0;
      const quantity = parseFloat(p.quantity) || 0;
      return orderPrice > 0 && quantity > 0;
    });
    return (
      hasValidPositions && balance > 0 && !isLoadingBrackets && binanceBrackets
    );
  }, [positions, balance, isLoadingBrackets, binanceBrackets]);

  // Clear summary when symbol changes only
  useEffect(() => {
    setSummary(null);
    setRiskAnalysis(null);
  }, [selectedSymbol]);

  return (
    <div className="space-y-8">
      {/* Configuration Panel */}
      <div className="rounded-lg bg-card border border-border p-6 space-y-6 transition-all duration-200 hover:shadow-md">
        <h2 className="text-xl font-semibold">Configuration</h2>

        {/* Trading Pair Selector */}
        <TradingPairSelector
          selectedSymbol={selectedSymbol}
          onSymbolChange={setSelectedSymbol}
        />

        {/* API Status */}
        {isLoadingBrackets && (
          <div className="rounded-lg bg-card border border-border p-3 text-sm text-muted-foreground flex items-center gap-2 animate-pulse">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading real-time Binance data...
          </div>
        )}

        {apiError && (
          <div
            className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive-foreground flex items-center gap-2"
            role="alert"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{apiError}</span>
            <button
              onClick={() => window.location.reload()}
              className="ml-auto text-xs underline hover:no-underline"
              aria-label="รีเฟรชหน้าเว็บ"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* Success Message */}
        {showSuccessMessage && (
          <div
            className="rounded-lg bg-success/10 border border-success/20 p-3 text-sm text-success-foreground flex items-center gap-2 animate-in slide-in-from-top-2"
            role="status"
            aria-live="polite"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            คำนวณเสร็จสิ้น! ตรวจสอบผลลัพธ์ด้านล่าง
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Position Side */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Position Side</Label>
            <div className="grid grid-cols-2 gap-0 rounded-lg overflow-hidden border border-border">
              <button
                type="button"
                onClick={() => setPositionSide("long")}
                className={`py-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  positionSide === "long"
                    ? "bg-green-600 text-white shadow-sm"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                Long
              </button>
              <button
                type="button"
                onClick={() => setPositionSide("short")}
                className={`py-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  positionSide === "short"
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                Short
              </button>
            </div>
          </div>

          {/* Leverage */}
          <div className="space-y-3">
            <Label className="text-muted-foreground">Leverage</Label>
            
            {/* Input and +/- buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setLeverage(Math.max(1, leverage - 1))}
              >
                −
              </Button>
              <Input
                type="number"
                value={leverage}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setLeverage(Math.min(Math.max(1, value), maxLeverage));
                }}
                className="text-center font-bold text-lg h-8 w-20"
                min={1}
                max={maxLeverage}
              />
              <span className="text-sm text-muted-foreground shrink-0">x</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setLeverage(Math.min(maxLeverage, leverage + 1))}
              >
                +
              </Button>
            </div>

            {/* Shortcut buttons */}
            <div className="flex gap-1">
              {[2, 5, 10, 20, 50].filter(x => x <= maxLeverage).map((shortcut) => (
                <Button
                  key={shortcut}
                  variant={leverage === shortcut ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setLeverage(shortcut)}
                >
                  {shortcut}x
                </Button>
              ))}
            </div>

            {/* Slider */}
            <Slider
              value={[leverage]}
              onValueChange={(v) => setLeverage(v[0])}
              min={1}
              max={maxLeverage}
              step={1}
              className="w-full"
            />
            
            {/* Slider marks */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1x</span>
              <span>{Math.floor(maxLeverage * 0.25)}x</span>
              <span>{Math.floor(maxLeverage * 0.5)}x</span>
              <span>{Math.floor(maxLeverage * 0.75)}x</span>
              <span>{maxLeverage}x</span>
            </div>
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
                onChange={(e) => {
                  const value = e.target.value;
                  setBalance(value === "" ? 0 : Number.parseFloat(value));
                }}
                className="bg-card border-border pr-16 text-right"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                USDT
              </span>
            </div>
          </div>

          {/* Calculate Button */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Action</Label>
            <Button
              onClick={handleCalculate}
              disabled={!canCalculate || isCalculating}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all duration-200"
              aria-describedby={
                !canCalculate ? "calculate-button-help" : undefined
              }
            >
              {isCalculating ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  กำลังคำนวณ...
                </div>
              ) : (
                "คำนวณทุก Position"
              )}
            </Button>
            {!canCalculate && (
              <div
                id="calculate-button-help"
                className="text-xs text-muted-foreground mt-1"
              >
                กรุณาป้อนข้อมูล position อย่างน้อย 1 ตัวและยอดคงเหลือ
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Position Table */}
      <div className="rounded-lg bg-card border border-border p-6 transition-all duration-200 hover:shadow-md">
        <h3 className="text-lg font-semibold mb-4">Positions</h3>
        <PositionTable
          positions={positions}
          onPositionChange={updatePosition}
          onAddPosition={addPosition}
          onRemovePosition={removePosition}
          baseAsset={baseAsset}
          positionSide={positionSide}
        />
      </div>

      {/* Results Summary */}
      {summary && (
        <div className="rounded-lg bg-card border border-border p-6 transition-all duration-300 animate-in slide-in-from-bottom-4 hover:shadow-md">
          <h3 className="text-lg font-semibold mb-4">Summary</h3>
          <ResultsSummary
            summary={summary}
            riskAnalysis={riskAnalysis}
            baseAsset={baseAsset}
            positionSide={positionSide}
            currentPrice={currentPrice}
          />
        </div>
      )}
    </div>
  );
}
