import { TradingPlan } from './types';

/**
 * Utility functions for trading plan management
 */

/**
 * Extract number from plan ID (e.g., "plan_5" -> 5)
 */
export function extractPlanNumber(planId: string): number | null {
  const match = planId.match(/^plan_(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Validate plan ID format
 */
export function isValidPlanId(planId: string): boolean {
  return /^plan_\d+$/.test(planId);
}

/**
 * Generate plan ID from number
 */
export function generatePlanId(number: number): string {
  return `plan_${number}`;
}

/**
 * Find next available plan number from existing plans
 */
export function findNextPlanNumber(existingPlans: TradingPlan[]): number {
  if (existingPlans.length === 0) {
    return 1;
  }

  const numbers = existingPlans
    .map(plan => extractPlanNumber(plan.planId))
    .filter((num): num is number => num !== null)
    .sort((a, b) => a - b);

  if (numbers.length === 0) {
    return 1;
  }

  // Find the first gap in the sequence, or return max + 1
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] !== i + 1) {
      return i + 1;
    }
  }

  return Math.max(...numbers) + 1;
}

/**
 * Sort plans by various criteria
 */
export function sortPlans(plans: TradingPlan[], sortBy: 'updatedAt' | 'createdAt' | 'planId' | 'tradingPair', order: 'asc' | 'desc' = 'desc'): TradingPlan[] {
  const sorted = [...plans].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'updatedAt':
      case 'createdAt':
        comparison = new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime();
        break;
      case 'planId':
        const numA = extractPlanNumber(a.planId) || 0;
        const numB = extractPlanNumber(b.planId) || 0;
        comparison = numA - numB;
        break;
      case 'tradingPair':
        comparison = a.tradingPair.localeCompare(b.tradingPair);
        break;
    }

    return order === 'desc' ? -comparison : comparison;
  });

  return sorted;
}

/**
 * Filter plans by search term (searches in name and description)
 */
export function filterPlansBySearch(plans: TradingPlan[], searchTerm: string): TradingPlan[] {
  if (!searchTerm.trim()) {
    return plans;
  }

  const term = searchTerm.toLowerCase();
  return plans.filter(plan => {
    const name = plan.name?.toLowerCase() || '';
    const description = plan.description?.toLowerCase() || '';
    const planId = plan.planId.toLowerCase();
    const tradingPair = plan.tradingPair.toLowerCase();

    return name.includes(term) || 
           description.includes(term) || 
           planId.includes(term) || 
           tradingPair.includes(term);
  });
}

/**
 * Get unique values from plans for filtering
 */
export function getUniqueValues<K extends keyof TradingPlan>(plans: TradingPlan[], key: K): TradingPlan[K][] {
  const values = plans.map(plan => plan[key]);
  return [...new Set(values)].filter(Boolean) as TradingPlan[K][];
}

/**
 * Format plan for display
 */
export function formatPlanForDisplay(plan: TradingPlan) {
  return {
    ...plan,
    displayName: plan.name || plan.planId,
    shortDescription: plan.description ? 
      (plan.description.length > 100 ? `${plan.description.substring(0, 100)}...` : plan.description) : 
      undefined,
    formattedCreatedAt: new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(plan.createdAt),
    formattedUpdatedAt: new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(plan.updatedAt),
  };
}

/**
 * Validate plan data before saving
 */
export function validatePlanData(data: Partial<TradingPlan>): string[] {
  const errors: string[] = [];

  if (data.name && data.name.length > 100) {
    errors.push('Plan name must not exceed 100 characters');
  }

  if (data.description && data.description.length > 500) {
    errors.push('Plan description must not exceed 500 characters');
  }

  if (data.leverage && (data.leverage < 1 || data.leverage > 125)) {
    errors.push('Leverage must be between 1 and 125');
  }

  if (data.balance && data.balance <= 0) {
    errors.push('Balance must be positive');
  }

  if (data.positions) {
    data.positions.forEach((position, index) => {
      if (position.size <= 0) {
        errors.push(`Position ${index + 1}: Size must be positive`);
      }
      if (position.entryPrice <= 0) {
        errors.push(`Position ${index + 1}: Entry price must be positive`);
      }
    });
  }

  return errors;
}

/**
 * Calculate total position value for a plan
 */
export function calculateTotalPositionValue(plan: TradingPlan): number {
  return plan.positions.reduce((total, position) => {
    return total + (position.size * position.entryPrice);
  }, 0);
}

/**
 * Check if plan has unsaved changes
 */
export function hasUnsavedChanges(original: TradingPlan, current: Partial<TradingPlan>): boolean {
  const fieldsToCheck: (keyof TradingPlan)[] = [
    'name', 'description', 'tradingPair', 'side', 'marginMode', 
    'leverage', 'balance', 'unitPreference'
  ];

  for (const field of fieldsToCheck) {
    if (current[field] !== undefined && current[field] !== original[field]) {
      return true;
    }
  }

  // Check positions array
  if (current.positions) {
    if (current.positions.length !== original.positions.length) {
      return true;
    }

    for (let i = 0; i < current.positions.length; i++) {
      const currentPos = current.positions[i];
      const originalPos = original.positions[i];
      
      if (currentPos.size !== originalPos.size || 
          currentPos.entryPrice !== originalPos.entryPrice) {
        return true;
      }
    }
  }

  return false;
}