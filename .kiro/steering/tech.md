# Technology Stack

## Framework & Runtime

- **Next.js 15.2.4**: React framework with App Router
- **React 19**: UI library with React Server Components (RSC)
- **TypeScript 5**: Static type checking
- **Node.js**: Runtime environment

## UI & Styling

- **Tailwind CSS 4.1.9**: Utility-first CSS framework
- **shadcn/ui**: Component library based on Radix UI primitives
- **Radix UI**: Headless UI components for accessibility
- **Lucide React**: Icon library
- **Geist Font**: Typography (Sans & Mono variants)
- **next-themes**: Dark/light theme support

## Form & Validation

- **React Hook Form 7.60.0**: Form state management
- **Zod 3.25.67**: Schema validation
- **@hookform/resolvers**: Form validation integration

## Data & Charts

- **Recharts 2.15.4**: Chart library for data visualization
- **date-fns 4.1.0**: Date manipulation utilities

## Development Tools

- **ESLint**: Code linting (build errors ignored in config)
- **PostCSS**: CSS processing
- **pnpm**: Package manager (preferred over npm/yarn)

## Build & Deployment

- **Vercel Analytics**: Performance monitoring
- **Image optimization**: Disabled in Next.js config for static export compatibility

## Common Commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Package management
pnpm install          # Install dependencies
pnpm add <package>    # Add new dependency
```

## Configuration Notes

- TypeScript and ESLint errors are ignored during builds for rapid prototyping
- Path aliases configured: `@/*` maps to workspace root
- Strict TypeScript configuration with ES6 target
- CSS variables enabled for theming support