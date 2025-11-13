'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';
import { TradingPairSelector } from '@/components/trading-pair-selector';
import { CreateTradingPlanData, UpdateTradingPlanData, TradingPlan } from '@/lib/types';

// Form validation schema - only basic plan info
const planFormSchema = z.object({
  name: z.string().max(100, 'Name must not exceed 100 characters').optional().or(z.literal('')),
  description: z.string().max(500, 'Description must not exceed 500 characters').optional().or(z.literal('')),
  tradingPair: z.string().min(1, 'Trading pair is required'),
});

type PlanFormData = z.infer<typeof planFormSchema>;

interface PlanFormProps {
  plan?: TradingPlan;
  onSave: (planData: { name?: string; description?: string; tradingPair: string }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  onFormChange?: () => void;
}

export function PlanForm({ plan, onSave, onCancel, isLoading, onFormChange }: PlanFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!plan;

  // Initialize form with default values - only basic plan info
  const form = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: plan?.name || '',
      description: plan?.description || '',
      tradingPair: plan?.tradingPair || 'BTCUSDT',
    },
  });

  // Memoize trading pair change handler
  const handleTradingPairChange = useCallback((value: string) => {
    form.setValue('tradingPair', value);
  }, [form]);

  // Watch for form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      onFormChange?.();
    });
    return () => subscription.unsubscribe();
  }, [form, onFormChange]);

  // Handle form submission
  const onSubmit = async (data: PlanFormData) => {
    try {
      setIsSaving(true);
      
      // Clean up empty optional fields - only save basic plan info
      const cleanData = {
        name: data.name || undefined,
        description: data.description || undefined,
        tradingPair: data.tradingPair,
      };

      await onSave(cleanData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSaving(false);
    }
  };



  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Edit Trading Plan' : 'Create New Trading Plan'}
        </CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Update your trading plan details and position configurations.'
            : 'Set up your trading plan with basic information and position details.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="My Trading Strategy" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      Give your plan a memorable name (max 100 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tradingPair"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trading Pair</FormLabel>
                    <FormControl>
                      <TradingPairSelector
                        selectedSymbol={field.value}
                        onSymbolChange={handleTradingPairChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your trading strategy, market conditions, or any notes..."
                      className="min-h-20"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Add notes about your strategy (max 500 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />



            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSaving || isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || isLoading}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : isEditing ? 'Update Plan' : 'Create Plan'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}