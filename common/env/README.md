# Environment Configuration

This directory contains centralized environment configuration for the application.

## Structure

- `index.ts` - Main environment configuration export
- `development.ts` - Development-specific settings
- `production.ts` - Production-specific settings  
- `test.ts` - Test-specific settings

## Usage

```typescript
import { env, spriteFlowApiEndpoint, isDevelopment } from '@/common/env';

// Use the full config object
console.log(env.spriteFlowApiEndpoint);

// Or use individual exports
if (isDevelopment) {
  console.log('Running in development mode');
}
```

## Configuration

The environment is automatically detected from `NODE_ENV` and the appropriate configuration is loaded:

- `development` (default) - Uses development.ts
- `production` - Uses production.ts  
- `test` - Uses test.ts

## Adding New Environment Variables

1. Add the variable to the `EnvironmentConfig` interface in `index.ts`
2. Add the variable to each environment-specific file
3. Export it from `index.ts` for convenience

## Migration from .env files

This replaces the previous `.env` file approach for better type safety and environment-specific configuration management.