"use client";

import { DecimalMath } from "@/lib/decimal-utils";

interface PositionSummary {
  totalPositionSize: number;
  averageEntryPrice: number;
  finalLiquidationPrice: number;
  totalMarginUsed: number;
  remainingBalance: number;
  riskWarnings: string[];
}

interface RiskAnalysis {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  warnings: string[];
  recommendations: string[];
}

interface ResultsSummaryProps {
  summary: PositionSummary;
  riskAnalysis: RiskAnalysis | null;
  baseAsset: string;
  positionSide: 'long' | 'short';
  currentPrice?: number | null;
  pricePrecision?: number;
  quantityPrecision?: number;
}

export function ResultsSummary({ 
  summary, 
  riskAnalysis, 
  baseAsset, 
  positionSide,
  currentPrice,
  pricePrecision = 2,
  quantityPrecision = 3,
}: ResultsSummaryProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-destructive/10 border-destructive/20 text-destructive-foreground';
      case 'HIGH':
        return 'bg-orange-500/10 border-orange-500/20 text-orange-500';
      case 'MEDIUM':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600';
      default:
        return 'bg-success/10 border-success/20 text-success-foreground';
    }
  };

  const getRiskIndicatorColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-destructive';
      case 'HIGH':
        return 'bg-orange-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      default:
        return 'bg-success';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg euler-border p-4 backdrop-blur-sm">
          <div className="text-sm text-muted-foreground">Total Position Size</div>
          <div className="text-xl font-bold text-primary">
            {DecimalMath.formatQuantity(summary.totalPositionSize, quantityPrecision)} {baseAsset}
          </div>
        </div>
        
        <div className="rounded-lg euler-border p-4 backdrop-blur-sm">
          <div className="text-sm text-muted-foreground">Average Entry Price</div>
          <div className="text-xl font-bold text-primary">
            {DecimalMath.formatPrice(summary.averageEntryPrice, pricePrecision)} USDT
          </div>
        </div>
        
        <div className="rounded-lg euler-border p-4 backdrop-blur-sm">
          <div className="text-sm text-muted-foreground">Final Liquidation Price</div>
          <div className={`text-xl font-bold ${
            summary.finalLiquidationPrice > 0 
              ? positionSide === 'long' ? 'text-destructive' : 'text-success'
              : 'text-muted-foreground'
          }`}>
            {summary.finalLiquidationPrice > 0 
              ? `${DecimalMath.formatPrice(summary.finalLiquidationPrice, pricePrecision)} USDT`
              : 'N/A'
            }
          </div>
        </div>
      </div>

      {/* Additional Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg euler-border p-4 backdrop-blur-sm">
          <div className="text-sm text-muted-foreground">Total Margin Used</div>
          <div className="text-lg font-bold text-primary">
            {DecimalMath.format(summary.totalMarginUsed, 2)} USDT
          </div>
        </div>
        
        <div className="rounded-lg euler-border p-4 backdrop-blur-sm">
          <div className="text-sm text-muted-foreground">Remaining Balance</div>
          <div className="text-lg font-bold text-primary">
            {DecimalMath.format(summary.remainingBalance, 2)} USDT
          </div>
        </div>

        {currentPrice && (
          <div className="rounded-lg euler-border p-4 backdrop-blur-sm">
            <div className="text-sm text-muted-foreground">Current Price</div>
            <div className="text-lg font-bold text-primary">
              {DecimalMath.formatPrice(currentPrice, pricePrecision)} USDT
            </div>
          </div>
        )}

        {currentPrice && summary.finalLiquidationPrice > 0 && (
          <div className="rounded-lg euler-border p-4 backdrop-blur-sm">
            <div className="text-sm text-muted-foreground">Distance to Liquidation</div>
            <div className="text-lg font-bold text-primary">
              {DecimalMath.format((Math.abs(currentPrice - summary.finalLiquidationPrice) / currentPrice * 100), 2)}%
            </div>
          </div>
        )}
      </div>
      
      {/* Risk Analysis */}
      {riskAnalysis && (
        <div className={`rounded-lg border p-4 ${getRiskColor(riskAnalysis.riskLevel)}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${getRiskIndicatorColor(riskAnalysis.riskLevel)}`} />
            <span className="font-medium">Risk Level: {riskAnalysis.riskLevel}</span>
          </div>
          
          {riskAnalysis.warnings.length > 0 && (
            <div className="space-y-1 mb-3">
              <div className="text-sm font-medium">คำเตือน:</div>
              {riskAnalysis.warnings.map((warning, index) => (
                <div key={index} className="text-sm">
                  • {warning}
                </div>
              ))}
            </div>
          )}
          
          {riskAnalysis.recommendations.length > 0 && (
            <div className="space-y-1">
              <div className="text-sm font-medium">คำแนะนำ:</div>
              {riskAnalysis.recommendations.map((rec, index) => (
                <div key={index} className="text-sm">
                  • {rec}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Position Value Breakdown */}
      <div className="rounded-lg euler-border p-4 backdrop-blur-sm">
        <h4 className="font-semibold text-sm mb-3 text-primary">Position Breakdown</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Position Value:</span>
            <span className="font-medium">
              {DecimalMath.format(summary.averageEntryPrice * summary.totalPositionSize, 2)} USDT
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Margin Utilization:</span>
            <span className="font-medium">
              {DecimalMath.format((summary.totalMarginUsed / (summary.totalMarginUsed + summary.remainingBalance)) * 100, 1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Position Side:</span>
            <span className={`font-medium capitalize ${
              positionSide === 'long' ? 'text-success' : 'text-destructive'
            }`}>
              {positionSide}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}