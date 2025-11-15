/**
 * Centralized Environment Configuration
 * Manages environment-specific settings based on NODE_ENV
 */

import { developmentConfig } from './development';
import { productionConfig } from './production';
import { testConfig } from './test';

export interface EnvironmentConfig {
  spriteFlowApiEndpoint: string;
  nodeEnv: 'development' | 'production' | 'test';
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  debug: boolean;
  logLevel: 'debug' | 'warn' | 'error';
}

const getEnvironmentConfig = (): EnvironmentConfig => {
  const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
  
  const baseConfig = {
    nodeEnv,
    isDevelopment: nodeEnv === 'development',
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
  };

  // Load environment-specific configuration
  let envSpecificConfig;
  switch (nodeEnv) {
    case 'production':
      envSpecificConfig = productionConfig;
      break;
    case 'test':
      envSpecificConfig = testConfig;
      break;
    case 'development':
    default:
      envSpecificConfig = developmentConfig;
      break;
  }

  return {
    ...baseConfig,
    ...envSpecificConfig,
  };
};

export const env = getEnvironmentConfig();

// Export individual values for convenience
export const {
  spriteFlowApiEndpoint,
  nodeEnv,
  isDevelopment,
  isProduction,
  isTest
} = env;