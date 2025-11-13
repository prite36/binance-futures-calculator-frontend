import { z } from 'zod';

// Core interfaces for Trading Plan Management
export interface TradingPlan {
  id?: number;              // Auto-increment primary key
  planId: string;           // Unique identifier (plan_1, plan_2, etc.)
  name?: string;            // Optional plan name (max 100 chars)
  description?: string;     // Optional description (max 500 chars)
  tradingPair: string;      // Trading pair (BTCUSDT, ETHUSDT, etc.)
  side: 'long' | 'short';   // ทิศทางการเทรดสำหรับทุก position
  marginMode: 'cross' | 'isolated'; // โหมด margin สำหรับทุก position
  leverage: number;         // Leverage สำหรับทุก position ในแผน
  balance: number;          // ยอดเงินที่ใช้ในการเทรด
  unitPreference: 'quantity' | 'orderSize' | 'initialMargin'; // หน่วยที่ใช้ในการคำนวณ
  positions: Position[];    // Array of position configurations
  createdAt: Date;          // Creation timestamp
  updatedAt: Date;          // Last modification timestamp
}

export interface Position {
  size: number;
  entryPrice: number;
  liquidationPrice?: number; // Calculated value
}

// Zod validation schemas
export const PositionSchema = z.object({
  size: z.number().positive('Size must be positive'),
  entryPrice: z.number().positive('Entry price must be positive'),
  liquidationPrice: z.number().positive().optional(),
});

export const TradingPlanSchema = z.object({
  id: z.number().optional(),
  planId: z.string().regex(/^plan_\d+$/, 'Plan ID must be in format plan_<number>'),
  name: z.string().max(100, 'Name must not exceed 100 characters').optional(),
  description: z.string().max(500, 'Description must not exceed 500 characters').optional(),
  tradingPair: z.string().min(1, 'Trading pair is required'),
  side: z.enum(['long', 'short'], { required_error: 'Side must be long or short' }),
  marginMode: z.enum(['cross', 'isolated'], { required_error: 'Margin mode must be cross or isolated' }),
  leverage: z.number().min(1, 'Leverage must be at least 1').max(500, 'Leverage must not exceed 500'),
  balance: z.number().positive('Balance must be positive'),
  unitPreference: z.enum(['quantity', 'orderSize', 'initialMargin'], { 
    required_error: 'Unit preference must be quantity, orderSize, or initialMargin' 
  }),
  positions: z.array(PositionSchema).min(1, 'At least one position is required'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Type for creating new plans (without auto-generated fields)
export type CreateTradingPlanData = Omit<TradingPlan, 'id' | 'planId' | 'createdAt' | 'updatedAt'>;

// Type for updating existing plans
export type UpdateTradingPlanData = Partial<Omit<TradingPlan, 'id' | 'planId' | 'createdAt'>>;

// Props interfaces for components
export interface PlanListProps {
  plans: TradingPlan[];
  onPlanSelect: (planId: string) => void;
  onPlanDelete: (planId: string) => void;
  isLoading?: boolean;
}

export interface PlanFilterProps {
  tradingPairs: string[];
  selectedPair?: string;
  onFilterChange: (pair?: string) => void;
}

export interface PlanFormProps {
  plan?: TradingPlan;
  onSave: (planData: CreateTradingPlanData | UpdateTradingPlanData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  onFormChange?: () => void;
}

// Database error types
export class DatabaseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class PlanNotFoundError extends Error {
  constructor(planId: string) {
    super(`Plan with ID ${planId} not found`);
    this.name = 'PlanNotFoundError';
  }
}