'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  X, 
  SortAsc, 
  SortDesc,
  Calendar,
  Hash,
  TrendingUp,
} from 'lucide-react';
import { TradingPlan } from '@/lib/types';
import { filterPlansBySearch, sortPlans } from '@/lib/plan-utils';

interface PlanSearchSortProps {
  plans: TradingPlan[];
  onFilteredPlansChange: (filteredPlans: TradingPlan[]) => void;
  className?: string;
}

type SortOption = 'updatedAt' | 'createdAt' | 'planId' | 'tradingPair';
type SortOrder = 'asc' | 'desc';

export function PlanSearchSort({ plans, onFilteredPlansChange, className }: PlanSearchSortProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter and sort plans
  const filteredAndSortedPlans = useMemo(() => {
    let filtered = plans;

    // Apply search filter
    if (debouncedSearchTerm.trim()) {
      filtered = filterPlansBySearch(filtered, debouncedSearchTerm);
    }

    // Apply sorting
    filtered = sortPlans(filtered, sortBy, sortOrder);

    return filtered;
  }, [plans, debouncedSearchTerm, sortBy, sortOrder]);

  // Notify parent of changes
  useEffect(() => {
    onFilteredPlansChange(filteredAndSortedPlans);
  }, [filteredAndSortedPlans, onFilteredPlansChange]);

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm('');
  };

  // Toggle sort order
  const handleSortOrderToggle = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Get sort icon
  const getSortIcon = () => {
    return sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />;
  };

  // Get sort option display info
  const getSortOptionInfo = (option: SortOption) => {
    switch (option) {
      case 'updatedAt':
        return { label: 'Last Updated', icon: <Calendar className="h-4 w-4" /> };
      case 'createdAt':
        return { label: 'Created Date', icon: <Calendar className="h-4 w-4" /> };
      case 'planId':
        return { label: 'Plan ID', icon: <Hash className="h-4 w-4" /> };
      case 'tradingPair':
        return { label: 'Trading Pair', icon: <TrendingUp className="h-4 w-4" /> };
    }
  };

  const currentSortInfo = getSortOptionInfo(sortBy);

  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${className}`}>
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search plans by name, description, ID, or trading pair..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
          <SelectTrigger className="w-48 bg-background border-border">
            <div className="flex items-center gap-2">
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-border shadow-lg backdrop-blur-none [&>*]:bg-slate-900 [&_[data-highlighted]]:!bg-slate-700 [&_[data-highlighted]]:!text-white">
            <SelectItem value="updatedAt" className="cursor-pointer bg-slate-900 focus:bg-slate-700 focus:text-white data-[highlighted]:bg-slate-700 data-[highlighted]:text-white hover:bg-slate-700 hover:text-white data-[state=checked]:bg-slate-700 data-[state=checked]:text-white">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Last Updated
              </div>
            </SelectItem>
            <SelectItem value="createdAt" className="cursor-pointer bg-slate-900 focus:bg-slate-700 focus:text-white data-[highlighted]:bg-slate-700 data-[highlighted]:text-white hover:bg-slate-700 hover:text-white data-[state=checked]:bg-slate-700 data-[state=checked]:text-white">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Created Date
              </div>
            </SelectItem>
            <SelectItem value="planId" className="cursor-pointer bg-slate-900 focus:bg-slate-700 focus:text-white data-[highlighted]:bg-slate-700 data-[highlighted]:text-white hover:bg-slate-700 hover:text-white data-[state=checked]:bg-slate-700 data-[state=checked]:text-white">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Plan ID
              </div>
            </SelectItem>
            <SelectItem value="tradingPair" className="cursor-pointer bg-slate-900 focus:bg-slate-700 focus:text-white data-[highlighted]:bg-slate-700 data-[highlighted]:text-white hover:bg-slate-700 hover:text-white data-[state=checked]:bg-slate-700 data-[state=checked]:text-white">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trading Pair
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSortOrderToggle}
          className="flex items-center gap-2 cursor-pointer"
          aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
        >
          {getSortIcon()}
          {sortOrder === 'asc' ? 'Asc' : 'Desc'}
        </Button>
      </div>

      {/* Search Results Info */}
      {debouncedSearchTerm && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Search className="h-3 w-3" />
            {filteredAndSortedPlans.length} result{filteredAndSortedPlans.length !== 1 ? 's' : ''}
          </Badge>
          {filteredAndSortedPlans.length !== plans.length && (
            <span>of {plans.length} total</span>
          )}
        </div>
      )}
    </div>
  );
}