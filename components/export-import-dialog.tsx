'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Database,
} from 'lucide-react';
import {
  exportPlans,
  downloadPlansAsFile,
  importPlansFromFile,
  createBackup,
  getExportStats,
  saveExportDate,
} from '@/lib/export-import';
import { TradingPlan } from '@/lib/types';
import { toast } from 'sonner';

interface ExportImportDialogProps {
  plans: TradingPlan[];
  onImportComplete: () => void;
  trigger?: React.ReactNode;
}

export function ExportImportDialog({ plans, onImportComplete, trigger }: ExportImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [exportStats, setExportStats] = useState<{
    totalPlans: number;
    totalSize: number;
    lastExportDate?: string;
  } | null>(null);
  const [importOptions, setImportOptions] = useState({
    overwriteExisting: false,
    skipDuplicates: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load export stats when dialog opens
  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open) {
      try {
        const stats = await getExportStats();
        setExportStats(stats);
      } catch (error) {
        console.error('Failed to load export stats:', error);
      }
    }
  };

  // Handle plan selection
  const handlePlanSelection = (planId: string, checked: boolean) => {
    if (checked) {
      setSelectedPlans(prev => [...prev, planId]);
    } else {
      setSelectedPlans(prev => prev.filter(id => id !== planId));
    }
  };

  // Select all plans
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPlans(plans.map(p => p.planId));
    } else {
      setSelectedPlans([]);
    }
  };

  // Export selected plans
  const handleExport = async () => {
    try {
      setIsExporting(true);
      const planIds = selectedPlans.length > 0 ? selectedPlans : undefined;
      const filename = selectedPlans.length > 0 
        ? `selected-plans-${selectedPlans.length}-${new Date().toISOString().split('T')[0]}.json`
        : undefined;
      
      await downloadPlansAsFile(planIds, filename);
      saveExportDate();
      toast.success(`Exported ${planIds?.length || plans.length} plans successfully`);
      
      // Refresh stats
      const stats = await getExportStats();
      setExportStats(stats);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export plans');
    } finally {
      setIsExporting(false);
    }
  };

  // Create full backup
  const handleBackup = async () => {
    try {
      setIsExporting(true);
      await createBackup();
      saveExportDate();
      toast.success('Backup created successfully');
      
      // Refresh stats
      const stats = await getExportStats();
      setExportStats(stats);
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error('Failed to create backup');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file import
  const handleImport = async (file: File) => {
    try {
      setIsImporting(true);
      setImportProgress(0);
      setImportResult(null);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const result = await importPlansFromFile(file, importOptions);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);

      if (result.imported > 0) {
        toast.success(`Imported ${result.imported} plans successfully`);
        onImportComplete();
      }

      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} plans failed to import`);
      }

      if (result.skipped > 0) {
        toast.info(`${result.skipped} plans were skipped`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import plans');
      setImportResult({
        imported: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImport(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="flex items-center gap-2 cursor-pointer">
            <Database className="h-4 w-4" />
            Export/Import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export & Import Trading Plans</DialogTitle>
          <DialogDescription>
            Backup your trading plans or import plans from a file
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="cursor-pointer">Export</TabsTrigger>
            <TabsTrigger value="import" className="cursor-pointer">Import</TabsTrigger>
          </TabsList>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-6">
            {/* Export Stats */}
            {exportStats && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold">{exportStats.totalPlans}</div>
                  <div className="text-sm text-muted-foreground">Total Plans</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {(exportStats.totalSize / 1024).toFixed(1)}KB
                  </div>
                  <div className="text-sm text-muted-foreground">Export Size</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">
                    {exportStats.lastExportDate 
                      ? new Date(exportStats.lastExportDate).toLocaleDateString()
                      : 'Never'
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">Last Export</div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Quick Actions</h4>
                <div className="flex gap-2">
                  <Button
                    onClick={handleBackup}
                    disabled={isExporting || plans.length === 0}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    {isExporting ? 'Creating...' : 'Create Full Backup'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Plan Selection */}
            {plans.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Select Plans to Export</h4>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedPlans.length === plans.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all" className="text-sm">
                      Select All ({plans.length})
                    </Label>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-2">
                  {plans.map((plan) => (
                    <div key={plan.planId} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded">
                      <Checkbox
                        id={plan.planId}
                        checked={selectedPlans.includes(plan.planId)}
                        onCheckedChange={(checked) => handlePlanSelection(plan.planId, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {plan.name || plan.planId}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {plan.tradingPair} • {plan.positions.length} positions
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {plan.side}
                      </Badge>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full flex items-center gap-2 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  {isExporting ? 'Exporting...' : `Export Selected (${selectedPlans.length || 'All'})`}
                </Button>
              </div>
            )}

            {plans.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No trading plans to export</p>
              </div>
            )}
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-6">
            {/* Import Options */}
            <div className="space-y-4">
              <h4 className="font-medium">Import Options</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="overwrite"
                    checked={importOptions.overwriteExisting}
                    onCheckedChange={(checked) => 
                      setImportOptions(prev => ({ ...prev, overwriteExisting: checked as boolean }))
                    }
                  />
                  <Label htmlFor="overwrite" className="text-sm">
                    Overwrite existing plans with same ID
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skip-duplicates"
                    checked={importOptions.skipDuplicates}
                    onCheckedChange={(checked) => 
                      setImportOptions(prev => ({ ...prev, skipDuplicates: checked as boolean }))
                    }
                  />
                  <Label htmlFor="skip-duplicates" className="text-sm">
                    Skip duplicate plans
                  </Label>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="import-file" className="text-sm font-medium">
                  Select JSON File
                </Label>
                <Input
                  id="import-file"
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  disabled={isImporting}
                  ref={fileInputRef}
                  className="mt-2"
                />
              </div>

              {isImporting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Importing plans...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <Progress value={importProgress} className="w-full" />
                </div>
              )}
            </div>

            {/* Import Results */}
            {importResult && (
              <div className="space-y-4">
                <h4 className="font-medium">Import Results</h4>
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {importResult.imported}
                    </div>
                    <div className="text-sm text-muted-foreground">Imported</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {importResult.skipped}
                    </div>
                    <div className="text-sm text-muted-foreground">Skipped</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {importResult.errors.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Import Errors
                    </div>
                    <div className="max-h-32 overflow-y-auto bg-destructive/10 border border-destructive/30 rounded p-3">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="text-sm text-destructive">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {importResult.imported > 0 && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Import completed successfully
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}