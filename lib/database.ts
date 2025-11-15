import Dexie, { Table } from 'dexie';
import { TradingPlan, CreateTradingPlanData, UpdateTradingPlanData, DatabaseError, PlanNotFoundError } from './types';

export class TradingPlanDatabase extends Dexie {
  plans!: Table<TradingPlan, number>;

  constructor() {
    super('TradingPlanDB');
    
    // Define database schema
    this.version(1).stores({
      plans: '++id, planId, tradingPair, createdAt, updatedAt'
    });

    // Add hooks for automatic timestamp management
    this.plans.hook('creating', (primKey, obj, trans) => {
      const now = new Date();
      obj.createdAt = now;
      obj.updatedAt = now;
    });

    this.plans.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as any).updatedAt = new Date();
    });
  }

  /**
   * Generate next available plan ID in format plan_<number>
   */
  private async generatePlanId(): Promise<string> {
    try {
      // Get all existing plan IDs and find the highest number
      const existingPlans = await this.plans.orderBy('planId').toArray();
      
      if (existingPlans.length === 0) {
        return 'plan_1';
      }

      // Extract numbers from existing plan IDs and find the maximum
      const numbers = existingPlans
        .map(plan => {
          const match = plan.planId.match(/^plan_(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);

      const maxNumber = Math.max(...numbers, 0);
      return `plan_${maxNumber + 1}`;
    } catch (error) {
      throw new DatabaseError('Failed to generate plan ID', error as Error);
    }
  }

  /**
   * Create a new trading plan
   */
  async createPlan(planData: CreateTradingPlanData): Promise<string> {
    try {
      const planId = await this.generatePlanId();
      const now = new Date();
      
      const newPlan: Omit<TradingPlan, 'id'> = {
        ...planData,
        planId,
        createdAt: now,
        updatedAt: now,
      };

      await this.plans.add(newPlan);
      return planId;
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError('Failed to create plan', error as Error);
    }
  }

  /**
   * Get a trading plan by plan ID
   */
  async getPlan(planId: string): Promise<TradingPlan | undefined> {
    try {
      const plan = await this.plans.where('planId').equals(planId).first();
      return plan;
    } catch (error) {
      throw new DatabaseError(`Failed to get plan ${planId}`, error as Error);
    }
  }

  /**
   * Get all trading plans, sorted by updatedAt descending
   */
  async getAllPlans(): Promise<TradingPlan[]> {
    try {
      const plans = await this.plans.orderBy('updatedAt').reverse().toArray();
      return plans;
    } catch (error) {
      throw new DatabaseError('Failed to get all plans', error as Error);
    }
  }

  /**
   * Get filtered plans by trading pair
   */
  async getFilteredPlans(tradingPair?: string): Promise<TradingPlan[]> {
    try {
      if (!tradingPair) {
        return this.getAllPlans();
      }

      const plans = await this.plans
        .where('tradingPair')
        .equals(tradingPair)
        .reverse()
        .sortBy('updatedAt');
      
      return plans;
    } catch (error) {
      throw new DatabaseError(`Failed to get filtered plans for ${tradingPair}`, error as Error);
    }
  }

  /**
   * Update an existing trading plan
   */
  async updatePlan(planId: string, updates: UpdateTradingPlanData): Promise<void> {
    try {
      const existingPlan = await this.getPlan(planId);
      if (!existingPlan) {
        throw new PlanNotFoundError(planId);
      }

      const updatedData = {
        ...updates,
        updatedAt: new Date(),
      };

      const updateCount = await this.plans
        .where('planId')
        .equals(planId)
        .modify(updatedData);

      if (updateCount === 0) {
        throw new PlanNotFoundError(planId);
      }
    } catch (error) {
      if (error instanceof PlanNotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Failed to update plan ${planId}`, error as Error);
    }
  }

  /**
   * Delete a trading plan
   */
  async deletePlan(planId: string): Promise<void> {
    try {
      const deleteCount = await this.plans.where('planId').equals(planId).delete();
      
      if (deleteCount === 0) {
        throw new PlanNotFoundError(planId);
      }
    } catch (error) {
      if (error instanceof PlanNotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Failed to delete plan ${planId}`, error as Error);
    }
  }

  /**
   * Get unique trading pairs from all plans
   */
  async getUniqueTradingPairs(): Promise<string[]> {
    try {
      const plans = await this.plans.toArray();
      const uniquePairs = [...new Set(plans.map(plan => plan.tradingPair))];
      return uniquePairs.sort();
    } catch (error) {
      throw new DatabaseError('Failed to get unique trading pairs', error as Error);
    }
  }

  /**
   * Check if database is accessible
   */
  async isAccessible(): Promise<boolean> {
    try {
      await this.plans.limit(1).toArray();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{ totalPlans: number; uniqueTradingPairs: number }> {
    try {
      const [totalPlans, tradingPairs] = await Promise.all([
        this.plans.count(),
        this.getUniqueTradingPairs(),
      ]);

      return {
        totalPlans,
        uniqueTradingPairs: tradingPairs.length,
      };
    } catch (error) {
      throw new DatabaseError('Failed to get database statistics', error as Error);
    }
  }
}

// Create and export database instance
export const db = new TradingPlanDatabase();

// Database error handler utility
export class DatabaseErrorHandler {
  static handleDexieError(error: Error): string {
    if (error.name === 'DatabaseClosedError') {
      return 'Database connection lost. Please refresh the page.';
    }
    if (error.name === 'QuotaExceededError') {
      return 'Storage quota exceeded. Please delete some plans.';
    }
    if (error.name === 'VersionError') {
      return 'Database version conflict. Please refresh the page.';
    }
    if (error.name === 'OpenFailedError') {
      return 'Failed to open database. Please check your browser settings.';
    }
    if (error instanceof PlanNotFoundError) {
      return error.message;
    }
    if (error instanceof DatabaseError) {
      return error.message;
    }
    return 'An unexpected database error occurred. Please try again.';
  }

  static isRetryableError(error: Error): boolean {
    return [
      'DatabaseClosedError',
      'TransactionInactiveError',
      'AbortError',
    ].includes(error.name);
  }
}