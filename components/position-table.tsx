"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";

interface Position {
  id: string;
  orderPrice: string;
  inputValue: string;
  inputType: 'quantity' | 'orderSize' | 'initialMargin';
  quantity: string;
  liquidationPrice?: number;
  error?: string;
}

interface PositionTableProps {
  positions: Position[];
  onPositionChange: (id: string, field: keyof Position, value: any) => void;
  onAddPosition: () => void;
  onRemovePosition: (id: string) => void;
  baseAsset: string;
  positionSide: "long" | "short";
  unitPreference: 'quantity' | 'orderSize' | 'initialMargin';
  leverage: number;
}

interface PositionRowProps {
  position: Position;
  index: number;
  onPositionChange: (id: string, field: keyof Position, value: any) => void;
  onRemovePosition: (id: string) => void;
  canRemove: boolean;
  baseAsset: string;
  positionSide: "long" | "short";
  unitPreference: 'quantity' | 'orderSize' | 'initialMargin';
  leverage: number;
}

function PositionRow({
  position,
  index,
  onPositionChange,
  onRemovePosition,
  canRemove,
  baseAsset,
  positionSide,
  unitPreference,
  leverage,
}: PositionRowProps) {
  
  // Helper function to get input label and placeholder
  const getInputConfig = () => {
    switch (unitPreference) {
      case 'quantity':
        return {
          label: `Size (${baseAsset})`,
          placeholder: '0.000',
          step: '0.001',
          unit: baseAsset
        };
      case 'orderSize':
        return {
          label: 'Size (USDT)',
          placeholder: '0.00',
          step: '0.01',
          unit: 'USDT'
        };
      case 'initialMargin':
        return {
          label: 'Initial Margin (USDT)',
          placeholder: '0.00',
          step: '0.01',
          unit: 'USDT'
        };
      default:
        return {
          label: `Size (${baseAsset})`,
          placeholder: '0.000',
          step: '0.001',
          unit: baseAsset
        };
    }
  };

  const inputConfig = getInputConfig();

  // Handle input value change and calculate quantity
  const handleInputChange = (value: string) => {
    onPositionChange(position.id, 'inputValue', value);
    
    // Calculate quantity based on input type
    const orderPrice = parseFloat(position.orderPrice) || 0;
    const inputValue = parseFloat(value) || 0;
    
    if (orderPrice > 0 && inputValue > 0) {
      let calculatedQuantity = 0;
      
      switch (unitPreference) {
        case 'quantity':
          calculatedQuantity = inputValue;
          break;
        case 'orderSize':
          calculatedQuantity = inputValue / orderPrice;
          break;
        case 'initialMargin':
          calculatedQuantity = (inputValue * leverage) / orderPrice;
          break;
      }
      
      onPositionChange(position.id, 'quantity', calculatedQuantity.toString());
    } else {
      onPositionChange(position.id, 'quantity', '');
    }
  };
  return (
    <tr className="border-t border-border hover:bg-muted/25 transition-colors duration-200">
      <td className="p-3 text-sm font-medium text-center">{index}</td>
      <td className="p-3">
        <Input
          type="number"
          value={position.orderPrice}
          onChange={(e) =>
            onPositionChange(position.id, "orderPrice", e.target.value)
          }
          placeholder="0.00"
          className="text-right bg-card border-border transition-all duration-200 focus:ring-2 focus:ring-primary/20"
          step="0.01"
          aria-label={`Order price for position ${index}`}
        />
      </td>
      <td className="p-3">
        <Input
          type="number"
          value={position.inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={inputConfig.placeholder}
          step={inputConfig.step}
          className="text-right bg-card border-border transition-all duration-200 focus:ring-2 focus:ring-primary/20"
          aria-label={`${inputConfig.label} for position ${index}`}
        />
      </td>
      <td className="p-3">
        <div className="text-right">
          {position.liquidationPrice ? (
            <span
              className={`font-medium ${
                positionSide === "long" ? "text-destructive" : "text-success"
              }`}
            >
              {position.liquidationPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          ) : position.error ? (
            <span
              className="text-destructive text-xs"
              role="alert"
              aria-live="polite"
            >
              {position.error}
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>
      </td>
      <td className="p-3 text-center">
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemovePosition(position.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200 hover:scale-105 cursor-pointer"
            aria-label={`Remove position ${index}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </td>
    </tr>
  );
}

// Mobile version of position table
function MobilePositionTable({
  positions,
  onPositionChange,
  onAddPosition,
  onRemovePosition,
  baseAsset,
  positionSide,
  unitPreference,
  leverage,
}: PositionTableProps) {
  return (
    <div className="space-y-4 md:hidden">
      {positions.map((position, index) => (
        <div
          key={position.id}
          className="rounded-lg border border-border p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">Position {index + 1}</span>
            {positions.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemovePosition(position.id)}
                className="text-destructive cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid gap-3">
            <div>
              <label
                className="text-xs text-muted-foreground"
                htmlFor={`order-price-${position.id}`}
              >
                Order Price (USDT)
              </label>
              <Input
                id={`order-price-${position.id}`}
                type="number"
                value={position.orderPrice}
                onChange={(e) =>
                  onPositionChange(position.id, "orderPrice", e.target.value)
                }
                className="text-right bg-card border-border mt-1"
                step="0.01"
              />
            </div>

            <div>
              <label
                className="text-xs text-muted-foreground"
                htmlFor={`input-${position.id}`}
              >
                {unitPreference === 'quantity' && `Size (${baseAsset})`}
                {unitPreference === 'orderSize' && 'Size (USDT)'}
                {unitPreference === 'initialMargin' && 'Initial Margin (USDT)'}
              </label>
              <Input
                id={`input-${position.id}`}
                type="number"
                value={position.inputValue}
                onChange={(e) => {
                  const value = e.target.value;
                  onPositionChange(position.id, 'inputValue', value);
                  
                  // Calculate quantity based on input type
                  const orderPrice = parseFloat(position.orderPrice) || 0;
                  const inputValue = parseFloat(value) || 0;
                  
                  if (orderPrice > 0 && inputValue > 0) {
                    let calculatedQuantity = 0;
                    
                    switch (unitPreference) {
                      case 'quantity':
                        calculatedQuantity = inputValue;
                        break;
                      case 'orderSize':
                        calculatedQuantity = inputValue / orderPrice;
                        break;
                      case 'initialMargin':
                        calculatedQuantity = (inputValue * leverage) / orderPrice;
                        break;
                    }
                    
                    onPositionChange(position.id, 'quantity', calculatedQuantity.toString());
                  } else {
                    onPositionChange(position.id, 'quantity', '');
                  }
                }}
                className="text-right bg-card border-border mt-1"
                step={unitPreference === 'quantity' ? '0.001' : '0.01'}
                placeholder={unitPreference === 'quantity' ? '0.000' : '0.00'}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">
                Liquidation Price
              </label>
              <div className="text-right font-medium mt-1 p-2 bg-muted/20 rounded">
                {position.liquidationPrice ? (
                  <span
                    className={
                      positionSide === "long"
                        ? "text-destructive"
                        : "text-success"
                    }
                  >
                    {position.liquidationPrice.toLocaleString()} USDT
                  </span>
                ) : position.error ? (
                  <span
                    className="text-destructive text-xs"
                    role="alert"
                    aria-live="polite"
                  >
                    {position.error}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      <Button
        variant="outline"
        onClick={onAddPosition}
        className="w-full border-dashed transition-all duration-200 hover:bg-primary/5 hover:border-primary/50 cursor-pointer"
      >
        + Add Position
      </Button>
    </div>
  );
}

export function PositionTable({
  positions,
  onPositionChange,
  onAddPosition,
  onRemovePosition,
  baseAsset,
  positionSide,
  unitPreference,
  leverage,
}: PositionTableProps) {
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <table className="w-full" role="table" aria-label="Position table">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-center p-3 text-sm font-medium" scope="col">
                #
              </th>
              <th className="text-left p-3 text-sm font-medium" scope="col">
                Order Price (USDT)
              </th>
              <th className="text-left p-3 text-sm font-medium" scope="col">
                {unitPreference === 'quantity' && `Size (${baseAsset})`}
                {unitPreference === 'orderSize' && 'Size (USDT)'}
                {unitPreference === 'initialMargin' && 'Initial Margin (USDT)'}
              </th>
              <th className="text-left p-3 text-sm font-medium" scope="col">
                Liquidation Price
              </th>
              <th className="text-center p-3 text-sm font-medium" scope="col">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position, index) => (
              <PositionRow
                key={position.id}
                position={position}
                index={index + 1}
                onPositionChange={onPositionChange}
                onRemovePosition={onRemovePosition}
                canRemove={positions.length > 1}
                baseAsset={baseAsset}
                positionSide={positionSide}
                unitPreference={unitPreference}
                leverage={leverage}
              />
            ))}
            <tr>
              <td colSpan={5} className="p-3">
                <Button
                  variant="outline"
                  onClick={onAddPosition}
                  className="w-full border-dashed transition-all duration-200 hover:bg-primary/5 hover:border-primary/50 cursor-pointer"
                >
                  + Add Position
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile Table */}
      <MobilePositionTable
        positions={positions}
        onPositionChange={onPositionChange}
        onAddPosition={onAddPosition}
        onRemovePosition={onRemovePosition}
        baseAsset={baseAsset}
        positionSide={positionSide}
        unitPreference={unitPreference}
        leverage={leverage}
      />
    </>
  );
}
