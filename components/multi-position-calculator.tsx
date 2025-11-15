"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { TradingPairSelector } from "@/components/trading-pair-selector";
import { PositionTable } from "@/components/position-table";
import { ResultsSummary } from "@/components/results-summary";
import { calculateLiquidationPrice } from "@/lib/liquidation-formula";
import { useTradingData } from "@/hooks/use-trading-data";
import { useDisableNumberInputScroll } from "@/hooks/use-disable-number-input-scroll";
import { DecimalMath, safeParseDecimal } from "@/lib/decimal-utils";
import { Decimal } from "decimal.js";

interface Position {
  id: string;
  orderPrice: string;
  inputValue: string; // ค่าที่ผู้ใช้ป้อน (quantity, order size, หรือ initial margin)
  inputType: 'quantity' | 'orderSize' | 'initialMargin'; // ประเภทของ input
  quantity: string; // จำนวนเหรียญที่คำนวณได้
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

interface MultiPositionCalculatorProps {
  initialData?: {
    tradingPair?: string;
    side?: 'long' | 'short';
    marginMode?: 'cross' | 'isolated';
    leverage?: number;
    balance?: number;
    unitPreference?: 'quantity' | 'orderSize' | 'initialMargin';
    positions?: Array<{
      size: number;
      entryPrice: number;
    }>;
  };
  onCalculationComplete?: (data: {
    tradingPair: string;
    side: 'long' | 'short';
    marginMode: 'cross' | 'isolated';
    leverage: number;
    balance: number;
    unitPreference: 'quantity' | 'orderSize' | 'initialMargin';
    positions: Array<{
      size: number;
      entryPrice: number;
    }>;
  }) => void;
  hideTradingPairSelector?: boolean;
}

function MultiPositionCalculatorComponent({ initialData, onCalculationComplete, hideTradingPairSelector = false }: MultiPositionCalculatorProps = {}) {

  const [selectedSymbol, setSelectedSymbol] = useState(initialData?.tradingPair || "BTCUSDT");
  const [leverage, setLeverage] = useState(initialData?.leverage || 10);
  const [positionSide, setPositionSide] = useState<"long" | "short">(initialData?.side || "long");
  const [marginMode, setMarginMode] = useState<"cross" | "isolated">(initialData?.marginMode || "isolated");
  const [balance, setBalance] = useState(initialData?.balance || 5000);
  const [positions, setPositions] = useState<Position[]>(() => {
    if (initialData?.positions && initialData.positions.length > 0) {
      return initialData.positions.map((pos, index) => ({
        id: (index + 1).toString(),
        orderPrice: pos.entryPrice.toString(),
        inputValue: pos.size.toString(),
        inputType: initialData.unitPreference || 'quantity',
        quantity: pos.size.toString(),
      }));
    }
    return [{ id: "1", orderPrice: "", inputValue: "", inputType: "quantity", quantity: "" }];
  });
  const [unitPreference, setUnitPreference] = useState<'quantity' | 'orderSize' | 'initialMargin'>(() => {
    // Try to get from localStorage first, then fallback to initialData or default
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('unitPreference');
      if (saved && ['quantity', 'orderSize', 'initialMargin'].includes(saved)) {
        return saved as 'quantity' | 'orderSize' | 'initialMargin';
      }
    }
    return initialData?.unitPreference || 'quantity';
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [summary, setSummary] = useState<PositionSummary | null>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isEnterPressed, setIsEnterPressed] = useState(false);
  const [hasAutoCalculated, setHasAutoCalculated] = useState(false);

  // Use shared trading data hook
  const {
    leverageBrackets: binanceBrackets,
    currentPrice,
    maxLeverage,
    symbolInfo,
    pricePrecision,
    quantityPrecision,
    isLoadingBrackets,
    isLoadingSymbolInfo,
    apiError,
  } = useTradingData(selectedSymbol);

  // Disable mouse wheel scrolling on number inputs
  useDisableNumberInputScroll();

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
      { id: newId, orderPrice: "", inputValue: "", inputType: unitPreference, quantity: "" },
    ]);
  }, [positions.length, unitPreference]);

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
    () => (positions: Position[], leverage: number, unitPref: 'quantity' | 'orderSize' | 'initialMargin') => {
      let totalQuantity = DecimalMath.add(0, 0);
      let totalNotionalValue = DecimalMath.add(0, 0);
      let totalMarginUsed = DecimalMath.add(0, 0);

      positions.forEach((position) => {
        const orderPriceDecimal = safeParseDecimal(position.orderPrice);
        const inputValueDecimal = safeParseDecimal(position.inputValue);
        
        if (!orderPriceDecimal || !inputValueDecimal || orderPriceDecimal.lessThanOrEqualTo(0) || inputValueDecimal.lessThanOrEqualTo(0)) return;

        let positionSize = new Decimal(0);
        let orderValue = new Decimal(0);
        let marginRequired = new Decimal(0);

        if (unitPref === 'quantity') {
          // Direct quantity input
          positionSize = inputValueDecimal;
          orderValue = positionSize.mul(orderPriceDecimal);
          marginRequired = orderValue.div(leverage);
        } else if (unitPref === 'orderSize') {
          // USDT order size input
          orderValue = inputValueDecimal; // inputValue is in USDT
          positionSize = orderValue.div(orderPriceDecimal);
          marginRequired = orderValue.div(leverage);
        } else {
          // Initial margin input (initialMargin)
          marginRequired = inputValueDecimal; // inputValue is the margin amount
          orderValue = marginRequired.mul(leverage);
          positionSize = orderValue.div(orderPriceDecimal);
        }

        totalQuantity = totalQuantity.add(positionSize);
        totalNotionalValue = totalNotionalValue.add(orderValue);
        
        // Calculate margin based on unit preference
        if (unitPref === 'initialMargin') {
          totalMarginUsed = totalMarginUsed.add(marginRequired);
        }
      });

      // For non-initialMargin modes, calculate margin from notional value
      if (unitPref !== 'initialMargin') {
        totalMarginUsed = totalNotionalValue.div(leverage);
      }

      const averageEntryPrice = totalQuantity.greaterThan(0) 
        ? totalNotionalValue.div(totalQuantity) 
        : new Decimal(0);

      return {
        totalQuantity: totalQuantity.toNumber(),
        totalNotionalValue: totalNotionalValue.toNumber(),
        averageEntryPrice: averageEntryPrice.toNumber(),
        totalMarginUsed: totalMarginUsed.toNumber(),
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
      marginMode: "cross" | "isolated",
      tiers: MaintenanceTier[]
    ): Position[] => {
      const calculatedPositions: Position[] = [];
      let cumulativeQuantity = 0;
      let cumulativeNotionalValue = 0;

      positions.forEach((position, index) => {
        const orderPriceDecimal = safeParseDecimal(position.orderPrice);
        const quantityDecimal = safeParseDecimal(position.quantity);
        
        if (!orderPriceDecimal || !quantityDecimal || orderPriceDecimal.lessThanOrEqualTo(0) || quantityDecimal.lessThanOrEqualTo(0)) {
          calculatedPositions.push({
            ...position,
            error: "กรุณาป้อนราคาและจำนวนที่ถูกต้อง",
          });
          return;
        }

        const orderPrice = DecimalMath.toNumber(orderPriceDecimal);
        const quantity = DecimalMath.toNumber(quantityDecimal);

        // Calculate cumulative position up to this row
        cumulativeQuantity += quantity;
        cumulativeNotionalValue += orderPrice * quantity;

        const averageEntryPrice = cumulativeNotionalValue / cumulativeQuantity;
        
        // Calculate margin based on unit preference
        let totalMarginUsed: number;
        if (unitPreference === 'initialMargin') {
          // For initial margin mode, sum up the input values (which are margin amounts)
          let marginSum = new Decimal(0);
          calculatedPositions.forEach(pos => {
            const inputValueDecimal = safeParseDecimal(pos.inputValue);
            if (inputValueDecimal) {
              marginSum = marginSum.add(inputValueDecimal);
            }
          });
          const currentInputDecimal = safeParseDecimal(position.inputValue);
          if (currentInputDecimal) {
            marginSum = marginSum.add(currentInputDecimal);
          }
          totalMarginUsed = marginSum.toNumber();
        } else {
          // For quantity and orderSize modes, calculate margin from notional value
          totalMarginUsed = new Decimal(cumulativeNotionalValue).div(leverage).toNumber();
        }

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
            marginMode: marginMode,
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
    [selectedSymbol, unitPreference]
  );

  // Calculate position summary
  const calculatePositionSummary = useCallback(
    (
      positions: Position[],
      leverage: number,
      balance: number,
      unitPref: 'quantity' | 'orderSize' | 'initialMargin'
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

      const cumulative = calculateCumulativePosition(validPositions, leverage, unitPref);
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
        marginMode,
        tiers
      );

      setPositions(calculatedPositions);

      const summary = calculatePositionSummary(
        calculatedPositions,
        leverage,
        balance,
        unitPreference
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

      // Notify parent component of successful calculation
      if (onCalculationComplete) {
        const validPositions = calculatedPositions
          .filter(p => {
            const orderPrice = parseFloat(p.orderPrice) || 0;
            const quantity = parseFloat(p.quantity) || 0;
            return orderPrice > 0 && quantity > 0 && !p.error;
          })
          .map(p => ({
            size: parseFloat(p.quantity) || 0,
            entryPrice: parseFloat(p.orderPrice) || 0,
          }));

        if (validPositions.length > 0) {
          onCalculationComplete({
            tradingPair: selectedSymbol,
            side: positionSide,
            marginMode: marginMode,
            leverage,
            balance,
            unitPreference,
            positions: validPositions,
          });
        }
      }
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
    marginMode,
    calculatePositionLiquidationPrices,
    calculatePositionSummary,
    analyzePositionRisk,
    currentPrice,
    onCalculationComplete,
    selectedSymbol,
    unitPreference,
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
    setHasAutoCalculated(false); // Reset auto-calculation flag for new symbol
  }, [selectedSymbol]);

  // Persist unitPreference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('unitPreference', unitPreference);
    }
  }, [unitPreference]);

  // Update all positions' inputType when unitPreference changes
  useEffect(() => {
    setPositions(prev => prev.map(position => {
      const orderPriceDecimal = safeParseDecimal(position.orderPrice);
      const currentQuantityDecimal = safeParseDecimal(position.quantity);
      
      // If we have valid data, try to convert the input value to the new unit preference
      let newInputValue = position.inputValue;
      
      if (orderPriceDecimal && currentQuantityDecimal && orderPriceDecimal.greaterThan(0) && currentQuantityDecimal.greaterThan(0)) {
        try {
          const convertedValue = DecimalMath.calculateInputValue(
            currentQuantityDecimal.toString(),
            orderPriceDecimal.toString(),
            leverage,
            unitPreference
          );
          newInputValue = DecimalMath.formatForInput(convertedValue);
        } catch (error) {
          console.warn('Error converting input value:', error);
          // Keep the original value if conversion fails
        }
      }
      
      return {
        ...position,
        inputType: unitPreference,
        inputValue: newInputValue
      };
    }));
  }, [unitPreference, leverage]);

  // Auto-calculate on first load when canCalculate becomes true
  useEffect(() => {
    if (canCalculate && !hasAutoCalculated && !isCalculating && !summary) {
      // Small delay to ensure all data is loaded
      const timer = setTimeout(() => {
        setHasAutoCalculated(true);
        handleCalculate();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [canCalculate, hasAutoCalculated, isCalculating, summary, handleCalculate]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Enter key is pressed and not in a textarea or contenteditable element
      if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey) {
        const target = event.target as HTMLElement;
        
        // Don't trigger if user is typing in an input field or textarea
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
          return;
        }
        
        // Only trigger if calculate button is enabled
        if (canCalculate && !isCalculating) {
          event.preventDefault();
          
          // Add visual feedback
          setIsEnterPressed(true);
          setTimeout(() => setIsEnterPressed(false), 150);
          
          handleCalculate();
        }
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [canCalculate, isCalculating, handleCalculate]);

  return (
    <div className="space-y-8">
      {/* Configuration Panel */}
      <div className="rounded-lg euler-border p-6 space-y-6 transition-all duration-200 card-hover backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-primary">Configuration</h2>

        {/* Trading Pair Selector */}
        {!hideTradingPairSelector && (
          <TradingPairSelector
            selectedSymbol={selectedSymbol}
            onSymbolChange={setSelectedSymbol}
          />
        )}

        {/* API Status */}
        {isLoadingBrackets && (
          <div className="rounded-lg bg-card border border-border p-3 text-sm text-muted-foreground flex items-center gap-2 animate-pulse">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading real-time Binance data...
          </div>
        )}

        {apiError && (
          <div
            className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive flex items-center gap-2 backdrop-blur-sm"
            role="alert"
          >
            <svg
              className="h-4 w-4 text-destructive"
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
              className="ml-auto text-xs underline hover:no-underline cursor-pointer text-destructive hover:text-destructive/80"
              aria-label="รีเฟรชหน้าเว็บ"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* Success Message */}
        {showSuccessMessage && (
          <div
            className="rounded-lg bg-success/10 border border-success/30 p-3 text-sm text-success flex items-center gap-2 animate-in slide-in-from-top-2 backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <svg
              className="h-4 w-4 text-success"
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
            {isEnterPressed && (
              <span className="ml-auto text-xs opacity-75 text-success">
                ⌨️ Enter key
              </span>
            )}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {/* Position Side */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Position Side</Label>
            <div className="grid grid-cols-2 gap-0 rounded-lg overflow-hidden border border-border">
              <button
                type="button"
                onClick={() => setPositionSide("long")}
                className={`py-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  positionSide === "long"
                    ? "bg-success text-success-foreground shadow-lg shadow-success/20"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-105"
                }`}
              >
                Long
              </button>
              <button
                type="button"
                onClick={() => setPositionSide("short")}
                className={`py-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  positionSide === "short"
                    ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-105"
                }`}
              >
                Short
              </button>
            </div>
          </div>

          {/* Margin Mode */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Margin Mode</Label>
            <div className="grid grid-cols-2 gap-0 rounded-lg overflow-hidden border border-border">
              <button
                type="button"
                onClick={() => setMarginMode("isolated")}
                className={`py-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  marginMode === "isolated"
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-105"
                }`}
              >
                Isolated
              </button>
              <button
                type="button"
                onClick={() => setMarginMode("cross")}
                className={`py-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                  marginMode === "cross"
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-105"
                }`}
              >
                Cross
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
                className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 cursor-pointer"
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
                className="text-center font-bold text-sm sm:text-lg h-7 sm:h-8 w-16 sm:w-20 no-spinner"
                min={1}
                max={maxLeverage}
              />
              <span className="text-xs sm:text-sm text-muted-foreground shrink-0">x</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 cursor-pointer"
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
                  className="h-5 sm:h-6 px-1 sm:px-2 text-xs cursor-pointer"
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
                className="bg-card border-border pr-16 text-right no-spinner"
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
              className={`w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-primary/90 hover:to-accent/90 disabled:opacity-50 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:shadow-primary/20 ${
                isEnterPressed ? 'ring-2 ring-primary/50 scale-[0.98]' : ''
              }`}
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
                <div className="flex items-center justify-center gap-2">
                  <span>คำนวณทุก Position</span>
                </div>
              )}
            </Button>
            {!canCalculate ? (
              <div
                id="calculate-button-help"
                className="text-xs text-muted-foreground mt-1"
              >
                กรุณาป้อนข้อมูล position อย่างน้อย 1 ตัวและยอดคงเหลือ
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-1 text-center">
                คลิกปุ่มหรือกด <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Enter</kbd> เพื่อคำนวณ
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Position Table */}
      <div className="rounded-lg euler-border p-6 transition-all duration-200 card-hover backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Positions</h3>
          
          {/* Unit Preference Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Unit Preference:</Label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setUnitPreference('quantity')}
                className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  unitPreference === 'quantity'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {baseAsset}
              </button>
              <button
                type="button"
                onClick={() => setUnitPreference('orderSize')}
                className={`px-3 py-1 text-xs font-medium transition-colors border-l border-border cursor-pointer ${
                  unitPreference === 'orderSize'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                USDT
              </button>
              <button
                type="button"
                onClick={() => setUnitPreference('initialMargin')}
                className={`px-3 py-1 text-xs font-medium transition-colors border-l border-border cursor-pointer ${
                  unitPreference === 'initialMargin'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                Margin
              </button>
            </div>
          </div>
        </div>

        {/* Unit Preference Description */}
        <div className="mb-4 p-3 rounded-lg bg-muted/20 border border-muted">
          <div className="text-sm">
            {unitPreference === 'quantity' && (
              <div>
                <span className="font-medium">{baseAsset}</span>
                <p className="text-muted-foreground text-xs mt-1">
                  Input and display order size in {baseAsset}.
                </p>
              </div>
            )}
            {unitPreference === 'orderSize' && (
              <div>
                <span className="font-medium">USDT</span>
                <p className="text-muted-foreground text-xs mt-1">
                  Input and display order size in USDT.
                </p>
              </div>
            )}
            {unitPreference === 'initialMargin' && (
              <div>
                <span className="font-medium">Initial Margin</span>
                <p className="text-muted-foreground text-xs mt-1">
                  To place an order using Initial Margin, enter the initial margin amount.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Margin Mode Description */}
        <div className="mb-4 p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <div className="text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-blue-700 dark:text-blue-300">
                {marginMode === 'isolated' ? 'Isolated Margin' : 'Cross Margin'}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                marginMode === 'isolated' 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                  : 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
              }`}>
                {marginMode === 'isolated' ? 'Default' : 'Advanced'}
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              {marginMode === 'isolated' 
                ? 'Each position uses only its allocated margin. Losses are limited to the margin assigned to that position.'
                : 'All positions share the same margin pool. Profits from one position can offset losses from another.'
              }
            </p>
          </div>
        </div>

        <PositionTable
          positions={positions}
          onPositionChange={updatePosition}
          onAddPosition={addPosition}
          onRemovePosition={removePosition}
          baseAsset={baseAsset}
          positionSide={positionSide}
          unitPreference={unitPreference}
          leverage={leverage}
          currentPrice={currentPrice}
          pricePrecision={pricePrecision}
          quantityPrecision={quantityPrecision}
        />
      </div>

      {/* Results Summary */}
      {summary && (
        <div className="rounded-lg euler-border p-6 transition-all duration-300 animate-in slide-in-from-bottom-4 card-hover backdrop-blur-sm">
          <h3 className="text-lg font-semibold mb-4 text-primary">Summary</h3>
          <ResultsSummary
            summary={summary}
            riskAnalysis={riskAnalysis}
            baseAsset={baseAsset}
            positionSide={positionSide}
            currentPrice={currentPrice}
            pricePrecision={pricePrecision}
            quantityPrecision={quantityPrecision}
          />
        </div>
      )}
    </div>
  );
}

export const MultiPositionCalculator = memo(MultiPositionCalculatorComponent);
