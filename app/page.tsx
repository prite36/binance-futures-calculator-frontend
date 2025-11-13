'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PlanList } from '@/components/plan-list';
import { PlanFilter } from '@/components/plan-filter';
import { ExportImportDialog } from '@/components/export-import-dialog';
import { PlanSearchSort } from '@/components/plan-search-sort';
import { TemplateSelectionDialog } from '@/components/template-selection-dialog';
import { db } from '@/lib/database';
import { TradingPlan } from '@/lib/types';
import { toast } from 'sonner';

export default function Home() {
  const router = useRouter();
  const [plans, setPlans] = useState<TradingPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<TradingPlan[]>([]);
  const [searchSortedPlans, setSearchSortedPlans] = useState<TradingPlan[]>([]);
  const [tradingPairs, setTradingPairs] = useState<string[]>([]);
  const [selectedPair, setSelectedPair] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Load plans from database
  const loadPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      const allPlans = await db.getAllPlans();
      setPlans(allPlans);
      
      // Extract unique trading pairs
      const uniquePairs = await db.getUniqueTradingPairs();
      setTradingPairs(uniquePairs);
      
      // Apply current filter
      if (selectedPair) {
        const filtered = await db.getFilteredPlans(selectedPair);
        setFilteredPlans(filtered);
      } else {
        setFilteredPlans(allPlans);
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
      toast.error('Failed to load trading plans');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPair]);

  // Load plans on component mount
  useEffect(() => {
    loadPlans();
  }, []);

  // Handle filter changes with debouncing
  const handleFilterChange = useCallback(async (pair?: string) => {
    setSelectedPair(pair);
    try {
      const filtered = await db.getFilteredPlans(pair);
      setFilteredPlans(filtered);
    } catch (error) {
      console.error('Failed to filter plans:', error);
      toast.error('Failed to filter plans');
    }
  }, []);

  // Handle search and sort changes
  const handleSearchSortChange = useCallback((searchSortedPlans: TradingPlan[]) => {
    setSearchSortedPlans(searchSortedPlans);
  }, []);

  // Handle plan selection (navigate to editor)
  const handlePlanSelect = useCallback((planId: string) => {
    router.push(`/plan/${planId}`);
  }, [router]);

  // Handle plan deletion
  const handlePlanDelete = useCallback(async (planId: string) => {
    try {
      await db.deletePlan(planId);
      toast.success('Plan deleted successfully');
      // Reload plans after deletion
      await loadPlans();
    } catch (error) {
      console.error('Failed to delete plan:', error);
      toast.error('Failed to delete plan');
    }
  }, [loadPlans]);

  // Handle create new plan
  const handleCreatePlan = useCallback(() => {
    router.push('/plan/new');
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trading Plans</h1>
            <p className="text-muted-foreground mt-2">
              Manage your trading strategies and position calculations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportImportDialog 
              plans={plans}
              onImportComplete={loadPlans}
            />
            <TemplateSelectionDialog 
              onTemplateSelect={() => loadPlans()}
            />
            <Button 
              onClick={handleCreatePlan} 
              className="flex items-center gap-2"
              aria-label="Create a new trading plan"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create New Plan
            </Button>
          </div>
        </div>

        {/* Search and Sort */}
        {plans.length > 0 && (
          <div className="mb-6">
            <PlanSearchSort
              plans={filteredPlans}
              onFilteredPlansChange={handleSearchSortChange}
              className="mb-4"
            />
          </div>
        )}

        {/* Filter */}
        {tradingPairs.length > 0 && (
          <div className="mb-6">
            <PlanFilter
              tradingPairs={tradingPairs}
              selectedPair={selectedPair}
              onFilterChange={handleFilterChange}
            />
          </div>
        )}

        {/* Plans List */}
        <main role="main" aria-label="Trading plans list">
          <PlanList
            plans={searchSortedPlans.length > 0 ? searchSortedPlans : filteredPlans}
            onPlanSelect={handlePlanSelect}
            onPlanDelete={handlePlanDelete}
            isLoading={isLoading}
          />
        </main>
      </div>
    </div>
  );
}
