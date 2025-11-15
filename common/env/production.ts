/**
 * Production Environment Configuration
 */

export const productionConfig = {
  spriteFlowApiEndpoint: 'https://trading-bot-api.spritelemon36.space',
  // Add other production-specific configurations here
  debug: false,
  logLevel: 'error' as const,
};