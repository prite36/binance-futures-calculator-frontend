import { CreateTradingPlanData } from './types';

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  category: 'scalping' | 'swing' | 'dca' | 'breakout' | 'custom';
  tags: string[];
  template: Omit<CreateTradingPlanData, 'name' | 'description'>;
  isPopular?: boolean;
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'btc-long-scalp',
    name: 'BTC Long Scalping',
    description: 'Quick scalping strategy for Bitcoin with tight stops and multiple entries',
    category: 'scalping',
    tags: ['BTC', 'Long', 'Scalping', 'High Frequency'],
    isPopular: true,
    template: {
      tradingPair: 'BTCUSDT',
      side: 'long',
      marginMode: 'cross',
      leverage: 20,
      balance: 1000,
      unitPreference: 'quantity',
      positions: [
        { size: 0.01, entryPrice: 65000 },
        { size: 0.015, entryPrice: 64500 },
        { size: 0.02, entryPrice: 64000 },
      ],
    },
  },
  {
    id: 'eth-swing-long',
    name: 'ETH Swing Trading',
    description: 'Medium-term swing trading strategy for Ethereum with gradual position building',
    category: 'swing',
    tags: ['ETH', 'Long', 'Swing', 'Medium Term'],
    isPopular: true,
    template: {
      tradingPair: 'ETHUSDT',
      side: 'long',
      marginMode: 'isolated',
      leverage: 10,
      balance: 2000,
      unitPreference: 'orderSize',
      positions: [
        { size: 0.5, entryPrice: 3200 },
        { size: 0.7, entryPrice: 3100 },
        { size: 1.0, entryPrice: 3000 },
      ],
    },
  },
  {
    id: 'btc-dca-strategy',
    name: 'BTC DCA Strategy',
    description: 'Dollar Cost Averaging strategy for Bitcoin with regular intervals',
    category: 'dca',
    tags: ['BTC', 'DCA', 'Long Term', 'Conservative'],
    template: {
      tradingPair: 'BTCUSDT',
      side: 'long',
      marginMode: 'cross',
      leverage: 5,
      balance: 5000,
      unitPreference: 'initialMargin',
      positions: [
        { size: 0.02, entryPrice: 70000 },
        { size: 0.02, entryPrice: 65000 },
        { size: 0.02, entryPrice: 60000 },
        { size: 0.02, entryPrice: 55000 },
        { size: 0.02, entryPrice: 50000 },
      ],
    },
  },
  {
    id: 'sol-breakout-long',
    name: 'SOL Breakout Strategy',
    description: 'Breakout trading strategy for Solana with momentum-based entries',
    category: 'breakout',
    tags: ['SOL', 'Long', 'Breakout', 'Momentum'],
    template: {
      tradingPair: 'SOLUSDT',
      side: 'long',
      marginMode: 'isolated',
      leverage: 15,
      balance: 1500,
      unitPreference: 'quantity',
      positions: [
        { size: 5, entryPrice: 180 },
        { size: 7, entryPrice: 185 },
        { size: 10, entryPrice: 190 },
      ],
    },
  },
  {
    id: 'bnb-short-hedge',
    name: 'BNB Short Hedge',
    description: 'Hedging strategy using BNB short positions for portfolio protection',
    category: 'swing',
    tags: ['BNB', 'Short', 'Hedge', 'Risk Management'],
    template: {
      tradingPair: 'BNBUSDT',
      side: 'short',
      marginMode: 'cross',
      leverage: 8,
      balance: 3000,
      unitPreference: 'orderSize',
      positions: [
        { size: 2, entryPrice: 600 },
        { size: 3, entryPrice: 620 },
        { size: 4, entryPrice: 640 },
      ],
    },
  },
  {
    id: 'ada-scalp-short',
    name: 'ADA Short Scalping',
    description: 'Quick short scalping strategy for Cardano during downtrends',
    category: 'scalping',
    tags: ['ADA', 'Short', 'Scalping', 'Downtrend'],
    template: {
      tradingPair: 'ADAUSDT',
      side: 'short',
      marginMode: 'isolated',
      leverage: 25,
      balance: 800,
      unitPreference: 'quantity',
      positions: [
        { size: 100, entryPrice: 0.45 },
        { size: 150, entryPrice: 0.47 },
        { size: 200, entryPrice: 0.49 },
      ],
    },
  },
];

/**
 * Get all available templates
 */
export function getAllTemplates(): PlanTemplate[] {
  return PLAN_TEMPLATES;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: PlanTemplate['category']): PlanTemplate[] {
  return PLAN_TEMPLATES.filter(template => template.category === category);
}

/**
 * Get popular templates
 */
export function getPopularTemplates(): PlanTemplate[] {
  return PLAN_TEMPLATES.filter(template => template.isPopular);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): PlanTemplate | undefined {
  return PLAN_TEMPLATES.find(template => template.id === id);
}

/**
 * Search templates by name, description, or tags
 */
export function searchTemplates(query: string): PlanTemplate[] {
  const searchTerm = query.toLowerCase();
  return PLAN_TEMPLATES.filter(template => 
    template.name.toLowerCase().includes(searchTerm) ||
    template.description.toLowerCase().includes(searchTerm) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
    template.template.tradingPair.toLowerCase().includes(searchTerm)
  );
}

/**
 * Get unique categories
 */
export function getCategories(): PlanTemplate['category'][] {
  const categories = new Set(PLAN_TEMPLATES.map(template => template.category));
  return Array.from(categories);
}

/**
 * Get unique tags
 */
export function getAllTags(): string[] {
  const tags = new Set(PLAN_TEMPLATES.flatMap(template => template.tags));
  return Array.from(tags).sort();
}

/**
 * Create plan data from template
 */
export function createPlanFromTemplate(
  template: PlanTemplate,
  customizations?: {
    name?: string;
    description?: string;
    balance?: number;
    leverage?: number;
  }
): CreateTradingPlanData {
  return {
    name: customizations?.name || template.name,
    description: customizations?.description || template.description,
    tradingPair: template.template.tradingPair,
    side: template.template.side,
    marginMode: template.template.marginMode,
    leverage: customizations?.leverage || template.template.leverage,
    balance: customizations?.balance || template.template.balance,
    unitPreference: template.template.unitPreference,
    positions: [...template.template.positions], // Clone positions array
  };
}

/**
 * Get category display info
 */
export function getCategoryInfo(category: PlanTemplate['category']) {
  const categoryInfo = {
    scalping: {
      name: 'Scalping',
      description: 'Quick, short-term trades with small profits',
      color: 'bg-red-500',
    },
    swing: {
      name: 'Swing Trading',
      description: 'Medium-term trades lasting days to weeks',
      color: 'bg-blue-500',
    },
    dca: {
      name: 'DCA (Dollar Cost Averaging)',
      description: 'Regular purchases regardless of price',
      color: 'bg-green-500',
    },
    breakout: {
      name: 'Breakout',
      description: 'Trading price breakouts from key levels',
      color: 'bg-purple-500',
    },
    custom: {
      name: 'Custom',
      description: 'User-created custom strategies',
      color: 'bg-gray-500',
    },
  };

  return categoryInfo[category];
}