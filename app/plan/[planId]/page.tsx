'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { PlanForm } from '@/components/plan-form';
import { MultiPositionCalculator } from '@/components/multi-position-calculator';
import { db } from '@/lib/database';
import { TradingPlan, CreateTradingPlanData } from '@/lib/types';
import { toast } from 'sonner';

export default function PlanEditorPage() {
  
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;
  const isNewPlan = planId === 'new';

  const [plan, setPlan] = useState<TradingPlan | null>(null);
  const [isLoading, setIsLoading] = useState(!isNewPlan);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load existing plan if editing
  useEffect(() => {
    if (!isNewPlan) {
      loadPlan();
    }
  }, [planId, isNewPlan]);

  const loadPlan = async () => {
    try {
      setIsLoading(true);
      const existingPlan = await db.getPlan(planId);
      
      if (!existingPlan) {
        toast.error('Plan not found');
        router.push('/');
        return;
      }
      
      setPlan(existingPlan);
    } catch (error) {
      console.error('Failed to load plan:', error);
      toast.error('Failed to load plan');
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle save basic plan info (name, description, trading pair only)
  const handleSaveBasicInfo = async (planData: { name?: string; description?: string; tradingPair: string }) => {
    try {
      setIsSaving(true);
      
      if (isNewPlan) {
        // Create new plan with default values for calculator fields
        const newPlanData: CreateTradingPlanData = {
          name: planData.name,
          description: planData.description,
          tradingPair: planData.tradingPair,
          side: 'long',
          marginMode: 'cross',
          leverage: 10,
          balance: 1000,
          unitPreference: 'quantity',
          positions: [{ size: 0.1, entryPrice: 50000 }],
        };
        
        const newPlanId = await db.createPlan(newPlanData);
        toast.success('Plan created successfully');
        router.push(`/plan/${newPlanId}`);
      } else {
        // Update existing plan - only basic info
        await db.updatePlan(planId, {
          name: planData.name,
          description: planData.description,
          tradingPair: planData.tradingPair,
        });
        toast.success('Plan updated successfully');
        setHasUnsavedChanges(false);
        // Reload the plan to get updated data
        await loadPlan();
      }
    } catch (error) {
      console.error('Failed to save plan:', error);
      toast.error('Failed to save plan');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel/back navigation
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (!confirmed) return;
    }
    router.push('/');
  };

  // Handle save calculator data (full plan data)
  const handleSave = useCallback(async (data: {
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
  }) => {
    if (!plan && !isNewPlan) return;
    
    try {
      if (isNewPlan) {
        // This shouldn't happen as we create the plan in handleSaveBasicInfo first
        console.warn('Attempting to save calculator data for new plan without basic info');
        return;
      }
      
      // Update existing plan with calculator data
      await db.updatePlan(planId, {
        tradingPair: data.tradingPair,
        side: data.side,
        marginMode: data.marginMode,
        leverage: data.leverage,
        balance: data.balance,
        unitPreference: data.unitPreference,
        positions: data.positions,
      });
      
      // Update local state
      setPlan(prev => prev ? { ...prev, ...data } : null);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save calculator data:', error);
      toast.error('Failed to save calculator data');
    }
  }, [plan, isNewPlan, planId]);

  // Handle calculator calculation complete (only when user clicks calculate button)
  const handleCalculationComplete = useCallback(async (data: {
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
  }) => {
    // Only save to database when calculation is successful and valid
    try {
      await handleSave(data);
    } catch (error) {
      console.error('Failed to save calculation results:', error);
    }
  }, [handleSave]);

  // Memoized form change handler
  const handleFormChange = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Handle browser back button with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        return (e.returnValue = '');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Trading Plans</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {isNewPlan ? 'New Plan' : plan?.name || planId}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Plans
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isNewPlan ? 'Create New Plan' : 'Edit Plan'}
              </h1>
              {!isNewPlan && plan && (
                <p className="text-muted-foreground mt-1">
                  {plan.planId} • {plan.tradingPair}
                </p>
              )}
            </div>
          </div>
          
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <div className="h-2 w-2 bg-amber-600 rounded-full"></div>
              Unsaved changes
            </div>
          )}
        </div>

        {/* Plan Form */}
        <div className="space-y-8">
          <PlanForm
            plan={plan || undefined}
            onSave={handleSaveBasicInfo}
            onCancel={handleCancel}
            isLoading={isSaving}
            onFormChange={handleFormChange}
          />

          {/* Multi Position Calculator Integration */}
          {(plan || isNewPlan) && (
            <div className="border-t pt-8">
              <h2 className="text-2xl font-bold mb-6">Position Calculator</h2>
              <MultiPositionCalculator 
                initialData={plan ? {
                  tradingPair: plan.tradingPair,
                  side: plan.side,
                  marginMode: plan.marginMode,
                  leverage: plan.leverage,
                  balance: plan.balance,
                  unitPreference: plan.unitPreference,
                  positions: plan.positions,
                } : undefined}
                onCalculationComplete={handleCalculationComplete}
                hideTradingPairSelector={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}