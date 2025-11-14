'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Filter } from 'lucide-react';
import { PlanFilterProps } from '@/lib/types';

export function PlanFilter({ tradingPairs, selectedPair, onFilterChange }: PlanFilterProps) {
  const handleClearFilter = () => {
    onFilterChange(undefined);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filter by Trading Pair:</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Select value={selectedPair || 'all'} onValueChange={(value) => onFilterChange(value === 'all' ? undefined : value)}>
          <SelectTrigger className="w-48 bg-background border-border">
            <SelectValue placeholder="All trading pairs" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-border shadow-lg backdrop-blur-none [&>*]:bg-slate-900 [&_[data-highlighted]]:!bg-slate-700 [&_[data-highlighted]]:!text-white">
            <SelectItem value="all" className="cursor-pointer bg-slate-900 focus:bg-slate-700 focus:text-white data-[highlighted]:bg-slate-700 data-[highlighted]:text-white hover:bg-slate-700 hover:text-white data-[state=checked]:bg-slate-700 data-[state=checked]:text-white">All trading pairs</SelectItem>
            {tradingPairs.map((pair) => (
              <SelectItem key={pair} value={pair} className="cursor-pointer bg-slate-900 focus:bg-slate-700 focus:text-white data-[highlighted]:bg-slate-700 data-[highlighted]:text-white hover:bg-slate-700 hover:text-white data-[state=checked]:bg-slate-700 data-[state=checked]:text-white">
                {pair}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedPair && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 cursor-pointer"
            onClick={handleClearFilter}
            aria-label="Clear trading pair filter"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
      
      {selectedPair && (
        <div className="text-sm text-muted-foreground">
          Showing plans for <span className="font-medium">{selectedPair}</span>
        </div>
      )}
    </div>
  );
}