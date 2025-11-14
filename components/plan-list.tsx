'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Edit, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  FileText,
  Calendar,
  FileText as FileTemplate
} from 'lucide-react';
import { PlanListProps } from '@/lib/types';
import { formatPlanForDisplay } from '@/lib/plan-utils';
import { TemplateSelectionDialog } from '@/components/template-selection-dialog';

export function PlanList({ plans, onPlanSelect, onPlanDelete, isLoading }: PlanListProps) {
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  const handleDelete = async (planId: string) => {
    setDeletingPlanId(planId);
    try {
      await onPlanDelete(planId);
    } finally {
      setDeletingPlanId(null);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Trading Pair</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Positions</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="md:hidden space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (plans.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <CardTitle className="mb-2">No Trading Plans</CardTitle>
          <CardDescription className="mb-4">
            You haven't created any trading plans yet. Create your first plan to get started.
          </CardDescription>
          <div className="flex items-center gap-2 justify-center">
            <Button onClick={() => onPlanSelect('new')} className="cursor-pointer">
              Create Your First Plan
            </Button>
            <span className="text-muted-foreground">or</span>
            <TemplateSelectionDialog 
              trigger={
                <Button variant="outline" className="cursor-pointer">
                  <FileTemplate className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Desktop table view
  const DesktopView = () => (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Trading Pair</TableHead>
            <TableHead>Side</TableHead>
            <TableHead>Positions</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => {
            const formatted = formatPlanForDisplay(plan);
            return (
              <TableRow 
                key={plan.planId}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onPlanSelect(plan.planId)}
              >
                <TableCell className="font-mono text-sm">
                  {plan.planId}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {formatted.displayName}
                    </div>
                    {plan.description && (
                      <div className="text-sm text-muted-foreground truncate max-w-48">
                        {formatted.shortDescription}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{plan.tradingPair}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {plan.side === 'long' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className="capitalize">{plan.side}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {plan.positions.length}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(plan.updatedAt, { addSuffix: true })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlanSelect(plan.planId);
                      }}
                      aria-label={`Edit plan ${formatted.displayName}`}
                    >
                      <Edit className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                          disabled={deletingPlanId === plan.planId}
                          aria-label={`Delete plan ${formatted.displayName}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Trading Plan</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{formatted.displayName}"? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(plan.planId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  // Mobile card view
  const MobileView = () => (
    <div className="md:hidden space-y-4">
      {plans.map((plan) => {
        const formatted = formatPlanForDisplay(plan);
        return (
          <Card 
            key={plan.planId}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onPlanSelect(plan.planId)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      {plan.planId}
                    </span>
                    {plan.side === 'long' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {formatted.displayName}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlanSelect(plan.planId);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                        disabled={deletingPlanId === plan.planId}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Trading Plan</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{formatted.displayName}"? 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(plan.planId)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Trading Pair:</span>
                  <Badge variant="outline">{plan.tradingPair}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Positions:</span>
                  <Badge variant="secondary">{plan.positions.length}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDistanceToNow(plan.updatedAt, { addSuffix: true })}
                  </span>
                </div>
                {plan.description && (
                  <div className="text-sm text-muted-foreground pt-2 border-t">
                    {formatted.shortDescription}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div role="region" aria-label="Trading plans">
      <DesktopView />
      <MobileView />
    </div>
  );
}