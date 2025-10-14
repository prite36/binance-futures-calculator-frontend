# Project Structure

## Directory Organization

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── binance/       # Binance API integration
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── futures-calculator.tsx
│   ├── liquidation-calculator.tsx
│   └── theme-provider.tsx
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
│   ├── liquidation-formula.ts  # Core calculation logic
│   └── utils.ts          # General utilities
├── public/               # Static assets
├── scripts/              # Build/utility scripts
└── styles/               # Additional stylesheets
```

## Naming Conventions

- **Files**: kebab-case for components and utilities (`futures-calculator.tsx`)
- **Components**: PascalCase for React components (`FuturesCalculator`)
- **Functions**: camelCase for functions and variables
- **Constants**: UPPER_SNAKE_CASE for constants (`BTCUSDT_TIERS`)

## Component Architecture

- **Page Components**: Located in `app/` directory following App Router structure
- **Feature Components**: Main business logic components in `components/`
- **UI Components**: Reusable shadcn/ui components in `components/ui/`
- **Layout Components**: Shared layout and theme components

## Import Patterns

- Use path aliases: `@/components`, `@/lib`, `@/hooks`
- Group imports: React imports first, then third-party, then local
- Prefer named exports over default exports for utilities

## File Organization Rules

- **Single Responsibility**: Each file should have one primary purpose
- **Co-location**: Related components and utilities should be grouped together
- **API Routes**: Mirror the structure of external APIs in `app/api/`
- **Type Definitions**: Include interfaces and types in the same file as implementation when possible

## Code Organization

- **Business Logic**: Core calculations in `lib/` directory
- **API Integration**: Binance API calls in `app/api/binance/`
- **Form Logic**: Use React Hook Form with Zod validation
- **State Management**: Prefer React hooks and local state over external state management

## Configuration Files

- `components.json`: shadcn/ui configuration
- `tsconfig.json`: TypeScript configuration with path aliases
- `next.config.mjs`: Next.js configuration with build optimizations
- `package.json`: Dependencies and scripts using pnpm