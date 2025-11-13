import { TradingPlan } from './types';
import { db } from './database';

export interface ExportData {
  version: string;
  exportDate: string;
  plans: TradingPlan[];
}

/**
 * Export trading plans to JSON format
 */
export async function exportPlans(planIds?: string[]): Promise<string> {
  try {
    let plans: TradingPlan[];
    
    if (planIds && planIds.length > 0) {
      // Export specific plans
      plans = [];
      for (const planId of planIds) {
        const plan = await db.getPlan(planId);
        if (plan) {
          plans.push(plan);
        }
      }
    } else {
      // Export all plans
      plans = await db.getAllPlans();
    }

    const exportData: ExportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      plans: plans.map(plan => ({
        ...plan,
        // Remove auto-generated fields for cleaner export
        id: undefined,
      })),
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    throw new Error(`Failed to export plans: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download plans as JSON file
 */
export async function downloadPlansAsFile(planIds?: string[], filename?: string): Promise<void> {
  try {
    const jsonData = await exportPlans(planIds);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `trading-plans-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(`Failed to download plans: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate import data structure
 */
function validateImportData(data: any): data is ExportData {
  if (!data || typeof data !== 'object') {
    return false;
  }

  if (!data.version || !data.exportDate || !Array.isArray(data.plans)) {
    return false;
  }

  // Validate each plan structure
  for (const plan of data.plans) {
    if (!plan.planId || !plan.tradingPair || !plan.side || !plan.marginMode) {
      return false;
    }
    
    if (typeof plan.leverage !== 'number' || typeof plan.balance !== 'number') {
      return false;
    }
    
    if (!Array.isArray(plan.positions) || plan.positions.length === 0) {
      return false;
    }
    
    for (const position of plan.positions) {
      if (typeof position.size !== 'number' || typeof position.entryPrice !== 'number') {
        return false;
      }
    }
  }

  return true;
}

/**
 * Import plans from JSON data
 */
export async function importPlans(
  jsonData: string, 
  options: {
    overwriteExisting?: boolean;
    skipDuplicates?: boolean;
  } = {}
): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> {
  const { overwriteExisting = false, skipDuplicates = true } = options;
  const result = {
    imported: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    const data = JSON.parse(jsonData);
    
    if (!validateImportData(data)) {
      throw new Error('Invalid import data format');
    }

    const existingPlans = await db.getAllPlans();
    const existingPlanIds = new Set(existingPlans.map(p => p.planId));

    for (const planData of data.plans) {
      try {
        const planExists = existingPlanIds.has(planData.planId);
        
        if (planExists) {
          if (skipDuplicates && !overwriteExisting) {
            result.skipped++;
            continue;
          }
          
          if (overwriteExisting) {
            // Update existing plan
            await db.updatePlan(planData.planId, {
              name: planData.name,
              description: planData.description,
              tradingPair: planData.tradingPair,
              side: planData.side,
              marginMode: planData.marginMode,
              leverage: planData.leverage,
              balance: planData.balance,
              unitPreference: planData.unitPreference,
              positions: planData.positions,
            });
            result.imported++;
          } else {
            result.skipped++;
          }
        } else {
          // Create new plan with original planId
          const newPlan = {
            ...planData,
            createdAt: new Date(planData.createdAt || new Date()),
            updatedAt: new Date(),
          };
          
          // Remove id field and let database generate new one
          delete newPlan.id;
          
          await db.plans.add(newPlan);
          result.imported++;
        }
      } catch (error) {
        result.errors.push(`Failed to import plan ${planData.planId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to import plans: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Import plans from file
 */
export async function importPlansFromFile(
  file: File,
  options?: {
    overwriteExisting?: boolean;
    skipDuplicates?: boolean;
  }
): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const jsonData = event.target?.result as string;
        const result = await importPlans(jsonData, options);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Create backup of all plans
 */
export async function createBackup(): Promise<void> {
  try {
    const stats = await db.getStats();
    const filename = `trading-plans-backup-${new Date().toISOString().split('T')[0]}-${stats.totalPlans}plans.json`;
    await downloadPlansAsFile(undefined, filename);
  } catch (error) {
    throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get import/export statistics
 */
export async function getExportStats(): Promise<{
  totalPlans: number;
  totalSize: number;
  lastExportDate?: string;
}> {
  try {
    const plans = await db.getAllPlans();
    const exportData = await exportPlans();
    const size = new Blob([exportData]).size;
    
    // Try to get last export date from localStorage
    const lastExportDate = localStorage.getItem('lastExportDate');
    
    return {
      totalPlans: plans.length,
      totalSize: size,
      lastExportDate: lastExportDate || undefined,
    };
  } catch (error) {
    throw new Error(`Failed to get export stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save export date to localStorage
 */
export function saveExportDate(): void {
  localStorage.setItem('lastExportDate', new Date().toISOString());
}