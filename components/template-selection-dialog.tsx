'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText as FileTemplate,
  Search,
  Star,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Target,
  BarChart3,
} from 'lucide-react';
import {
  getAllTemplates,
  getTemplatesByCategory,
  getPopularTemplates,
  searchTemplates,
  getCategories,
  getCategoryInfo,
  createPlanFromTemplate,
  PlanTemplate,
} from '@/lib/plan-templates';
import { db } from '@/lib/database';
import { toast } from 'sonner';

interface TemplateSelectionDialogProps {
  trigger?: React.ReactNode;
  onTemplateSelect?: (templateId: string) => void;
}

export function TemplateSelectionDialog({ trigger, onTemplateSelect }: TemplateSelectionDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);

  const allTemplates = getAllTemplates();
  const categories = getCategories();
  const popularTemplates = getPopularTemplates();

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let templates = allTemplates;

    // Apply search filter
    if (searchQuery.trim()) {
      templates = searchTemplates(searchQuery);
    }

    // Apply category filter
    if (selectedCategory !== 'all' && selectedCategory !== 'popular') {
      templates = templates.filter(template => template.category === selectedCategory);
    } else if (selectedCategory === 'popular') {
      templates = templates.filter(template => template.isPopular);
    }

    return templates;
  }, [allTemplates, searchQuery, selectedCategory]);

  // Handle template selection
  const handleTemplateSelect = async (template: PlanTemplate) => {
    try {
      setIsCreating(true);
      
      // Create plan from template
      const planData = createPlanFromTemplate(template);
      const planId = await db.createPlan(planData);
      
      toast.success(`Created plan from template: ${template.name}`);
      setIsOpen(false);
      
      // Navigate to the new plan or call callback
      if (onTemplateSelect) {
        onTemplateSelect(template.id);
      } else {
        router.push(`/plan/${planId}`);
      }
    } catch (error) {
      console.error('Failed to create plan from template:', error);
      toast.error('Failed to create plan from template');
    } finally {
      setIsCreating(false);
    }
  };

  // Get category icon
  const getCategoryIcon = (category: PlanTemplate['category']) => {
    switch (category) {
      case 'scalping':
        return <Zap className="h-4 w-4" />;
      case 'swing':
        return <Clock className="h-4 w-4" />;
      case 'dca':
        return <BarChart3 className="h-4 w-4" />;
      case 'breakout':
        return <Target className="h-4 w-4" />;
      default:
        return <FileTemplate className="h-4 w-4" />;
    }
  };

  // Get side icon
  const getSideIcon = (side: 'long' | 'short') => {
    return side === 'long' ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="flex items-center gap-2">
            <FileTemplate className="h-4 w-4" />
            Use Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose a Trading Plan Template</DialogTitle>
          <DialogDescription>
            Start with a pre-built strategy template and customize it to your needs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates by name, trading pair, or strategy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="popular" className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                Popular
              </TabsTrigger>
              {categories.map((category) => {
                const info = getCategoryInfo(category);
                return (
                  <TabsTrigger key={category} value={category} className="flex items-center gap-1">
                    {getCategoryIcon(category)}
                    {info.name}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-6">
              {/* Templates Grid */}
              {filteredTemplates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map((template) => {
                    const categoryInfo = getCategoryInfo(template.category);
                    return (
                      <Card 
                        key={template.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg flex items-center gap-2">
                                {template.name}
                                {template.isPopular && (
                                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                )}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {template.description}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-1">
                              {getCategoryIcon(template.category)}
                              {getSideIcon(template.template.side)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            {/* Template Details */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <Label className="text-muted-foreground">Trading Pair</Label>
                                <div className="font-medium">{template.template.tradingPair}</div>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Leverage</Label>
                                <div className="font-medium">{template.template.leverage}x</div>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Positions</Label>
                                <div className="font-medium">{template.template.positions.length}</div>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Balance</Label>
                                <div className="font-medium">${template.template.balance}</div>
                              </div>
                            </div>

                            {/* Category Badge */}
                            <div className="flex items-center justify-between">
                              <Badge 
                                variant="secondary" 
                                className="flex items-center gap-1"
                              >
                                {getCategoryIcon(template.category)}
                                {categoryInfo.name}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {template.template.side}
                              </Badge>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1">
                              {template.tags.slice(0, 4).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {template.tags.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{template.tags.length - 4} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileTemplate className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No templates found matching your criteria</p>
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      onClick={() => setSearchQuery('')}
                      className="mt-2"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Popular Templates Quick Access */}
          {selectedCategory === 'all' && !searchQuery && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <h3 className="text-lg font-semibold">Popular Templates</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {popularTemplates.slice(0, 3).map((template) => (
                  <Card 
                    key={template.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors p-4"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{template.name}</h4>
                      {getSideIcon(template.template.side)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {template.template.tradingPair} • {template.template.leverage}x
                    </p>
                    <div className="flex items-center gap-1">
                      {getCategoryIcon(template.category)}
                      <Badge variant="outline" className="text-xs">
                        {getCategoryInfo(template.category).name}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {isCreating && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex items-center gap-2 bg-card p-4 rounded-lg border">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Creating plan from template...</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}