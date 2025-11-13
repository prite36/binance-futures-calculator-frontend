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
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All trading pairs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All trading pairs</SelectItem>
            {tradingPairs.map((pair) => (
              <SelectItem key={pair} value={pair}>
                {pair}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedPair && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilter}
            className="h-8 w-8 p-0"
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