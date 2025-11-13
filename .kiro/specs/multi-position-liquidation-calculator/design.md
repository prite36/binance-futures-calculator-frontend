# เอกสารการออกแบบ - Multi-Position Liquidation Calculator

## ภาพรวม

Multi-Position Liquidation Calculator เป็นฟีเจอร์ต่อยอดจาก Binance Futures Calculator เดิม โดยเพิ่มความสามารถในการคำนวณ liquidation price สำหรับการเปิด position หลายไม้ในคู่เทรดเดียวกัน ฟีเจอร์นี้จะช่วยให้เทรดเดอร์สามารถวางแผนการถัวเฉลี่ย (Dollar Cost Averaging) และวิเคราะห์ผลกระทบต่อ liquidation price ได้อย่างแม่นยำ

## สถาปัตยกรรม

### Component Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    FuturesCalculator                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   Tab Navigation                        │ │
│  │  [Liquidation Price] [Multi-Position Calculator]       │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Tab Content Area                                       │ │
│  │  ├── LiquidationCalculator (เดิม - ปรับปรุง UI)        │ │
│  │  └── MultiPositionCalculator (ใหม่)                    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Position Calculator Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Configuration Panel                                        │
│  ├── Trading Pair Selector                                 │
│  ├── Leverage Slider                                        │
│  ├── Position Side (Long/Short)                            │
│  └── Balance Input                                          │
├─────────────────────────────────────────────────────────────┤
│  Position Table                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ # │ Order Price │ Quantity │ Liquidation Price │ Action │ │
│  │ 1 │ [Input]     │ [Input]  │ [Calculated]      │ [Del]  │ │
│  │ 2 │ [Input]     │ [Input]  │ [Calculated]      │ [Del]  │ │
│  │ + │ Add Position                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Action Panel                                               │
│  └── [Calculate All Positions] Button                      │
├─────────────────────────────────────────────────────────────┤
│  Results Summary                                            │
│  ├── Total Position Size                                    │
│  ├── Average Entry Price                                    │
│  ├── Final Liquidation Price                               │
│  ├── Total Margin Used                                      │
│  └── Remaining Balance                                      │
└─────────────────────────────────────────────────────────────┘
```

## คอมโพเนนต์และอินเทอร์เฟซ

### 1. การปรับปรุง FuturesCalculator Component

#### เพิ่ม Tab Navigation
```typescript
interface Tab {
  id: string;
  label: string;
  component: React.ComponentType;
}

const tabs: Tab[] = [
  { id: "liquidation", label: "Liquidation Price", component: LiquidationCalculator },
  { id: "multi-position", label: "Multi-Position Calculator", component: MultiPositionCalculator },
];

interface FuturesCalculatorState {
  activeTab: string;
}
```

### 2. การปรับปรุง LiquidationCalculator Component

#### UI Improvements
```typescript
interface UIImprovements {
  // Position Side Toggle - เพิ่ม active state styling
  positionSideActive: boolean;
  
  // Trading Pair Dropdown - เพิ่ม solid background
  dropdownBackground: 'solid' | 'transparent';
  
  // Manual Calculation - ไม่ auto-calculate เมื่อ input เปลี่ยน
  autoCalculate: false;
  
  // Calculation Details - แสดง Current Leverage แทน Max Leverage
  showCurrentLeverage: boolean;
}

// ปรับปรุง Position Side Toggle
const PositionSideToggle = () => (
  <div className="grid grid-cols-2 gap-0 rounded-lg overflow-hidden border border-border">
    <button
      type="button"
      onClick={() => setSide("long")}
      className={`py-3 text-sm font-medium transition-all duration-200 ${
        side === "long"
          ? "bg-success text-success-foreground shadow-sm border-success" // เพิ่ม active styling
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
          ? "bg-destructive text-destructive-foreground shadow-sm border-destructive" // เพิ่ม active styling
          : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      Short
    </button>
  </div>
);
```

### 3. MultiPositionCalculator Component

#### Main Interface
```typescript
interface Position {
  id: string;
  orderPrice: number;
  quantity: number;
  liquidationPrice?: number;
  error?: string;
}

interface MultiPositionState {
  selectedSymbol: string;
  leverage: number;
  positionSide: 'long' | 'short';
  balance: number;
  positions: Position[];
  isCalculating: boolean;
  summary: PositionSummary | null;
}

interface PositionSummary {
  totalPositionSize: number;
  averageEntryPrice: number;
  finalLiquidationPrice: number;
  totalMarginUsed: number;
  remainingBalance: number;
  riskWarnings: string[];
}
```

#### Position Table Component
```typescript
interface PositionTableProps {
  positions: Position[];
  onPositionChange: (id: string, field: keyof Position, value: any) => void;
  onAddPosition: () => void;
  onRemovePosition: (id: string) => void;
  baseAsset: string;
  positionSide: 'long' | 'short';
}

const PositionTable: React.FC<PositionTableProps> = ({
  positions,
  onPositionChange,
  onAddPosition,
  onRemovePosition,
  baseAsset,
  positionSide
}) => (
  <div className="rounded-lg border border-border overflow-hidden">
    <table className="w-full">
      <thead className="bg-muted/50">
        <tr>
          <th className="text-left p-3 text-sm font-medium">#</th>
          <th className="text-left p-3 text-sm font-medium">Order Price (USDT)</th>
          <th className="text-left p-3 text-sm font-medium">Quantity ({baseAsset})</th>
          <th className="text-left p-3 text-sm font-medium">Liquidation Price</th>
          <th className="text-center p-3 text-sm font-medium">Action</th>
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
          />
        ))}
        <tr>
          <td colSpan={5} className="p-3">
            <Button
              variant="outline"
              onClick={onAddPosition}
              className="w-full border-dashed"
            >
              + Add Position
            </Button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);
```

#### Position Row Component
```typescript
interface PositionRowProps {
  position: Position;
  index: number;
  onPositionChange: (id: string, field: keyof Position, value: any) => void;
  onRemovePosition: (id: string) => void;
  canRemove: boolean;
  baseAsset: string;
  positionSide: 'long' | 'short';
}

const PositionRow: React.FC<PositionRowProps> = ({
  position,
  index,
  onPositionChange,
  onRemovePosition,
  canRemove,
  baseAsset,
  positionSide
}) => (
  <tr className="border-t border-border hover:bg-muted/25">
    <td className="p-3 text-sm font-medium">{index}</td>
    <td className="p-3">
      <Input
        type="number"
        value={position.orderPrice || ''}
        onChange={(e) => onPositionChange(position.id, 'orderPrice', parseFloat(e.target.value))}
        placeholder="0.00"
        className="text-right"
      />
    </td>
    <td className="p-3">
      <Input
        type="number"
        value={position.quantity || ''}
        onChange={(e) => onPositionChange(position.id, 'quantity', parseFloat(e.target.value))}
        placeholder="0.000"
        step="0.001"
        className="text-right"
      />
    </td>
    <td className="p-3">
      <div className="text-right">
        {position.liquidationPrice ? (
          <span className={`font-medium ${
            positionSide === 'long' ? 'text-destructive' : 'text-success'
          }`}>
            {position.liquidationPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ) : position.error ? (
          <span className="text-destructive text-xs">{position.error}</span>
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
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          Remove
        </Button>
      )}
    </td>
  </tr>
);
```

## โมเดลข้อมูลและการคำนวณ

### 1. Multi-Position Calculation Logic

#### การคำนวณแบบสะสม (Cumulative Calculation)
```typescript
interface CumulativePosition {
  totalQuantity: number;
  totalNotionalValue: number;
  averageEntryPrice: number;
  totalMarginUsed: number;
}

function calculateCumulativePosition(positions: Position[], leverage: number): CumulativePosition {
  let totalQuantity = 0;
  let totalNotionalValue = 0;
  
  positions.forEach(position => {
    if (position.orderPrice > 0 && position.quantity > 0) {
      totalQuantity += position.quantity;
      totalNotionalValue += position.orderPrice * position.quantity;
    }
  });
  
  const averageEntryPrice = totalQuantity > 0 ? totalNotionalValue / totalQuantity : 0;
  const totalMarginUsed = totalNotionalValue / leverage;
  
  return {
    totalQuantity,
    totalNotionalValue,
    averageEntryPrice,
    totalMarginUsed
  };
}
```

#### การคำนวณ Liquidation Price แต่ละ Row
```typescript
function calculatePositionLiquidationPrices(
  positions: Position[],
  leverage: number,
  balance: number,
  positionSide: 'long' | 'short',
  tiers: MaintenanceTier[]
): Position[] {
  const calculatedPositions: Position[] = [];
  let cumulativeQuantity = 0;
  let cumulativeNotionalValue = 0;
  
  positions.forEach((position, index) => {
    if (position.orderPrice <= 0 || position.quantity <= 0) {
      calculatedPositions.push({
        ...position,
        error: 'กรุณาป้อนราคาและจำนวนที่ถูกต้อง'
      });
      return;
    }
    
    // คำนวณ position สะสมจนถึง row นี้
    cumulativeQuantity += position.quantity;
    cumulativeNotionalValue += position.orderPrice * position.quantity;
    
    const averageEntryPrice = cumulativeNotionalValue / cumulativeQuantity;
    const totalMarginUsed = cumulativeNotionalValue / leverage;
    
    // ตรวจสอบว่า margin เพียงพอหรือไม่
    if (totalMarginUsed > balance) {
      calculatedPositions.push({
        ...position,
        error: 'Margin ไม่เพียงพอ'
      });
      return;
    }
    
    // คำนวณ liquidation price สำหรับ position รวม
    try {
      const liquidationPrice = calculateLiquidationPrice({
        side: positionSide,
        leverage,
        entryPrice: averageEntryPrice,
        quantity: cumulativeQuantity,
        balance,
        marginMode: 'cross', // ใช้ cross margin สำหรับ multi-position
        tiers
      });
      
      // ตรวจสอบ risk warning
      let error: string | undefined;
      if (index > 0) {
        const previousLiquidationPrice = calculatedPositions[index - 1]?.liquidationPrice;
        if (previousLiquidationPrice) {
          if (positionSide === 'long' && position.orderPrice < previousLiquidationPrice) {
            error = 'ราคาต่ำกว่า Liquidation Price ของ position ก่อนหน้า';
          } else if (positionSide === 'short' && position.orderPrice > previousLiquidationPrice) {
            error = 'ราคาสูงกว่า Liquidation Price ของ position ก่อนหน้า';
          }
        }
      }
      
      calculatedPositions.push({
        ...position,
        liquidationPrice,
        error
      });
    } catch (error) {
      calculatedPositions.push({
        ...position,
        error: 'ไม่สามารถคำนวณได้'
      });
    }
  });
  
  return calculatedPositions;
}
```

### 2. Position Summary Calculation

```typescript
function calculatePositionSummary(
  positions: Position[],
  leverage: number,
  balance: number
): PositionSummary {
  const validPositions = positions.filter(p => p.orderPrice > 0 && p.quantity > 0);
  
  if (validPositions.length === 0) {
    return {
      totalPositionSize: 0,
      averageEntryPrice: 0,
      finalLiquidationPrice: 0,
      totalMarginUsed: 0,
      remainingBalance: balance,
      riskWarnings: []
    };
  }
  
  const cumulative = calculateCumulativePosition(validPositions, leverage);
  const finalPosition = positions[positions.length - 1];
  
  const riskWarnings: string[] = [];
  
  // ตรวจสอบ risk warnings
  if (cumulative.totalMarginUsed > balance * 0.8) {
    riskWarnings.push('ใช้ margin มากกว่า 80% ของยอดคงเหลือ');
  }
  
  if (cumulative.totalMarginUsed > balance) {
    riskWarnings.push('Margin ไม่เพียงพอสำหรับ position ทั้งหมด');
  }
  
  positions.forEach((position, index) => {
    if (position.error && position.error.includes('Liquidation Price')) {
      riskWarnings.push(`Position ${index + 1}: ${position.error}`);
    }
  });
  
  return {
    totalPositionSize: cumulative.totalQuantity,
    averageEntryPrice: cumulative.averageEntryPrice,
    finalLiquidationPrice: finalPosition?.liquidationPrice || 0,
    totalMarginUsed: cumulative.totalMarginUsed,
    remainingBalance: balance - cumulative.totalMarginUsed,
    riskWarnings
  };
}
```

## การจัดการข้อผิดพลาดและการตรวจสอบ

### 1. Input Validation

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: { [key: string]: string };
}

function validatePosition(position: Position): ValidationResult {
  const errors: { [key: string]: string } = {};
  
  if (!position.orderPrice || position.orderPrice <= 0) {
    errors.orderPrice = 'กรุณาป้อนราคาที่ถูกต้อง';
  }
  
  if (!position.quantity || position.quantity <= 0) {
    errors.quantity = 'กรุณาป้อนจำนวนที่ถูกต้อง';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

function validateMultiPosition(
  positions: Position[],
  balance: number,
  leverage: number,
  positionSide: 'long' | 'short'
): ValidationResult {
  const errors: { [key: string]: string } = {};
  
  // ตรวจสอบว่ามี position อย่างน้อย 1 ตัว
  const validPositions = positions.filter(p => p.orderPrice > 0 && p.quantity > 0);
  if (validPositions.length === 0) {
    errors.positions = 'กรุณาป้อนข้อมูล position อย่างน้อย 1 ตัว';
  }
  
  // ตรวจสอบ balance
  if (balance <= 0) {
    errors.balance = 'กรุณาป้อนยอดคงเหลือที่ถูกต้อง';
  }
  
  // ตรวจสอบ total margin
  const totalMarginUsed = validPositions.reduce((sum, pos) => {
    return sum + (pos.orderPrice * pos.quantity) / leverage;
  }, 0);
  
  if (totalMarginUsed > balance) {
    errors.margin = 'Margin ที่ต้องใช้เกินยอดคงเหลือ';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
```

### 2. Risk Analysis

```typescript
interface RiskAnalysis {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  warnings: string[];
  recommendations: string[];
}

function analyzePositionRisk(
  positions: Position[],
  summary: PositionSummary,
  currentPrice: number
): RiskAnalysis {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let riskLevel: RiskAnalysis['riskLevel'] = 'LOW';
  
  // ตรวจสอบ margin utilization
  const marginUtilization = summary.totalMarginUsed / (summary.totalMarginUsed + summary.remainingBalance);
  
  if (marginUtilization > 0.9) {
    riskLevel = 'CRITICAL';
    warnings.push('ใช้ margin มากกว่า 90%');
    recommendations.push('ลดขนาด position หรือเพิ่มยอดคงเหลือ');
  } else if (marginUtilization > 0.7) {
    riskLevel = 'HIGH';
    warnings.push('ใช้ margin มากกว่า 70%');
    recommendations.push('ควรระวังการจัดการ risk');
  } else if (marginUtilization > 0.5) {
    riskLevel = 'MEDIUM';
    warnings.push('ใช้ margin มากกว่า 50%');
  }
  
  // ตรวจสอบระยะห่างจาก liquidation price
  if (currentPrice && summary.finalLiquidationPrice) {
    const priceDistance = Math.abs(currentPrice - summary.finalLiquidationPrice) / currentPrice;
    
    if (priceDistance < 0.05) { // น้อยกว่า 5%
      riskLevel = 'CRITICAL';
      warnings.push('ราคาปัจจุบันใกล้ Liquidation Price มาก');
      recommendations.push('ปิด position บางส่วนหรือเพิ่ม margin');
    } else if (priceDistance < 0.1) { // น้อยกว่า 10%
      if (riskLevel !== 'CRITICAL') riskLevel = 'HIGH';
      warnings.push('ราคาปัจจุบันใกล้ Liquidation Price');
    }
  }
  
  // ตรวจสอบ position ordering
  positions.forEach((position, index) => {
    if (position.error && position.error.includes('Liquidation Price')) {
      if (riskLevel !== 'CRITICAL') riskLevel = 'HIGH';
      warnings.push(`Position ${index + 1}: วางราคาในระดับเสี่ยง`);
      recommendations.push(`ปรับราคา Position ${index + 1} ให้เหมาะสม`);
    }
  });
  
  return {
    riskLevel,
    warnings,
    recommendations
  };
}
```

## การออกแบบ UI/UX

### 1. Tab Navigation Design

```typescript
const TabNavigation = ({ activeTab, onTabChange }: TabNavigationProps) => (
  <div className="border-b border-border bg-card">
    <div className="container mx-auto px-4">
      <div className="flex gap-8">
        <button
          onClick={() => onTabChange('liquidation')}
          className={`relative py-4 text-sm font-medium transition-colors ${
            activeTab === 'liquidation' 
              ? 'text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Liquidation Price
          {activeTab === 'liquidation' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => onTabChange('multi-position')}
          className={`relative py-4 text-sm font-medium transition-colors ${
            activeTab === 'multi-position' 
              ? 'text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Multi-Position Calculator
          {activeTab === 'multi-position' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>
    </div>
  </div>
);
```

### 2. Results Summary Design

```typescript
const ResultsSummary = ({ summary, riskAnalysis }: ResultsSummaryProps) => (
  <div className="space-y-6">
    {/* Summary Cards */}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-lg bg-card border border-border p-4">
        <div className="text-sm text-muted-foreground">Total Position Size</div>
        <div className="text-xl font-bold">
          {summary.totalPositionSize.toLocaleString(undefined, {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
          })}
        </div>
      </div>
      
      <div className="rounded-lg bg-card border border-border p-4">
        <div className="text-sm text-muted-foreground">Average Entry Price</div>
        <div className="text-xl font-bold">
          {summary.averageEntryPrice.toLocaleString()} USDT
        </div>
      </div>
      
      <div className="rounded-lg bg-card border border-border p-4">
        <div className="text-sm text-muted-foreground">Final Liquidation Price</div>
        <div className={`text-xl font-bold ${
          summary.finalLiquidationPrice > 0 
            ? 'text-destructive' 
            : 'text-muted-foreground'
        }`}>
          {summary.finalLiquidationPrice > 0 
            ? `${summary.finalLiquidationPrice.toLocaleString()} USDT`
            : 'N/A'
          }
        </div>
      </div>
    </div>
    
    {/* Risk Analysis */}
    {riskAnalysis && (
      <div className={`rounded-lg border p-4 ${
        riskAnalysis.riskLevel === 'CRITICAL' 
          ? 'bg-destructive/10 border-destructive/20'
          : riskAnalysis.riskLevel === 'HIGH'
          ? 'bg-orange-500/10 border-orange-500/20'
          : riskAnalysis.riskLevel === 'MEDIUM'
          ? 'bg-yellow-500/10 border-yellow-500/20'
          : 'bg-success/10 border-success/20'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${
            riskAnalysis.riskLevel === 'CRITICAL' 
              ? 'bg-destructive'
              : riskAnalysis.riskLevel === 'HIGH'
              ? 'bg-orange-500'
              : riskAnalysis.riskLevel === 'MEDIUM'
              ? 'bg-yellow-500'
              : 'bg-success'
          }`} />
          <span className="font-medium">Risk Level: {riskAnalysis.riskLevel}</span>
        </div>
        
        {riskAnalysis.warnings.length > 0 && (
          <div className="space-y-1">
            {riskAnalysis.warnings.map((warning, index) => (
              <div key={index} className="text-sm text-muted-foreground">
                • {warning}
              </div>
            ))}
          </div>
        )}
        
        {riskAnalysis.recommendations.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-sm font-medium">คำแนะนำ:</div>
            {riskAnalysis.recommendations.map((rec, index) => (
              <div key={index} className="text-sm text-muted-foreground">
                • {rec}
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);
```

### 3. Mobile Responsive Design

```typescript
// Mobile-first responsive design
const MobilePositionTable = ({ positions, ...props }: PositionTableProps) => (
  <div className="space-y-4 md:hidden">
    {positions.map((position, index) => (
      <div key={position.id} className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">Position {index + 1}</span>
          {positions.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => props.onRemovePosition(position.id)}
              className="text-destructive"
            >
              Remove
            </Button>
          )}
        </div>
        
        <div className="grid gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Order Price (USDT)</Label>
            <Input
              type="number"
              value={position.orderPrice || ''}
              onChange={(e) => props.onPositionChange(position.id, 'orderPrice', parseFloat(e.target.value))}
              className="text-right"
            />
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground">Quantity ({props.baseAsset})</Label>
            <Input
              type="number"
              value={position.quantity || ''}
              onChange={(e) => props.onPositionChange(position.id, 'quantity', parseFloat(e.target.value))}
              className="text-right"
            />
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground">Liquidation Price</Label>
            <div className="text-right font-medium">
              {position.liquidationPrice ? (
                <span className={props.positionSide === 'long' ? 'text-destructive' : 'text-success'}>
                  {position.liquidationPrice.toLocaleString()} USDT
                </span>
              ) : position.error ? (
                <span className="text-destructive text-xs">{position.error}</span>
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
      onClick={props.onAddPosition}
      className="w-full border-dashed"
    >
      + Add Position
    </Button>
  </div>
);
```

## การรวมกับระบบเดิม

### 1. การใช้ API และ Library เดิม

```typescript
// ใช้ TradingPairSelector component เดิม
import { TradingPairSelector } from "@/components/trading-pair-selector";

// ใช้ liquidation formula เดิม
import { calculateLiquidationPrice } from "@/lib/liquidation-formula";

// ใช้ API endpoints เดิม
const fetchLeverageBrackets = async (symbol: string) => {
  const response = await fetch(`/api/binance/leverage-bracket?symbol=${symbol}`);
  return response.json();
};
```

### 2. การแชร์ State และ Logic

```typescript
// Shared hooks สำหรับ trading data
const useTradingData = (symbol: string) => {
  const [leverageBrackets, setLeverageBrackets] = useState<any[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [maxLeverage, setMaxLeverage] = useState<number>(150);
  
  // ... existing logic from LiquidationCalculator
  
  return {
    leverageBrackets,
    currentPrice,
    maxLeverage,
    isLoading: false // ... other states
  };
};

// ใช้ใน MultiPositionCalculator
const MultiPositionCalculator = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const { leverageBrackets, currentPrice, maxLeverage } = useTradingData(selectedSymbol);
  
  // ... component logic
};
```

## การทดสอบและ Quality Assurance

### 1. Unit Testing Strategy

```typescript
// Test cases สำหรับ calculation functions
describe('Multi-Position Calculations', () => {
  test('should calculate cumulative position correctly', () => {
    const positions = [
      { orderPrice: 50000, quantity: 0.1 },
      { orderPrice: 48000, quantity: 0.05 }
    ];
    
    const result = calculateCumulativePosition(positions, 10);
    
    expect(result.totalQuantity).toBe(0.15);
    expect(result.averageEntryPrice).toBeCloseTo(49333.33);
  });
  
  test('should validate position risks correctly', () => {
    // Test risk validation logic
  });
  
  test('should handle edge cases in liquidation calculation', () => {
    // Test edge cases
  });
});
```

### 2. Integration Testing

```typescript
// Test การทำงานร่วมกันของ components
describe('MultiPositionCalculator Integration', () => {
  test('should update liquidation prices when positions change', () => {
    // Test component integration
  });
  
  test('should show correct risk warnings', () => {
    // Test risk analysis integration
  });
});
```

### 3. Performance Considerations

```typescript
// Memoization สำหรับ expensive calculations
const memoizedCalculations = useMemo(() => {
  return calculatePositionLiquidationPrices(
    positions,
    leverage,
    balance,
    positionSide,
    leverageBrackets
  );
}, [positions, leverage, balance, positionSide, leverageBrackets]);

// Debounced input handling
const debouncedPositionChange = useCallback(
  debounce((id: string, field: keyof Position, value: any) => {
    setPositions(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  }, 300),
  []
);
```

## การปรับใช้งานและ Deployment

### 1. Feature Flag Implementation

```typescript
// Feature flag สำหรับ multi-position calculator
const useFeatureFlags = () => {
  return {
    multiPositionCalculator: true, // เปิดใช้งานฟีเจอร์ใหม่
    improvedUI: true // เปิดใช้งาน UI improvements
  };
};
```

### 2. Backward Compatibility

```typescript
// รักษา compatibility กับ component เดิม
const FuturesCalculator = () => {
  const featureFlags = useFeatureFlags();
  
  return (
    <div>
      {/* Tab navigation */}
      <TabNavigation />
      
      {/* Existing liquidation calculator with improvements */}
      {activeTab === 'liquidation' && (
        <LiquidationCalculator 
          improvedUI={featureFlags.improvedUI}
        />
      )}
      
      {/* New multi-position calculator */}
      {activeTab === 'multi-position' && featureFlags.multiPositionCalculator && (
        <MultiPositionCalculator />
      )}
    </div>
  );
};
```

การออกแบบนี้จะช่วยให้ฟีเจอร์ใหม่สามารถทำงานร่วมกับระบบเดิมได้อย่างราบรื่น และให้ประสบการณ์ผู้ใช้ที่ดีขึ้นสำหรับการวิเคราะห์และวางแผนการเทรด futures แบบหลายไม้