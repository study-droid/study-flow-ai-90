# StudyFlow AI - Project Structure & Organization

## Root Directory Structure

```
├── src/                    # Main source code
├── supabase/              # Database and Edge Functions
├── tests/                 # E2E and integration tests
├── scripts/               # Build and deployment scripts
├── public/                # Static assets
├── docs/                  # Documentation
└── .kiro/                 # Kiro AI assistant configuration
```

## Source Code Organization (`src/`)

### Core Application Structure
```
src/
├── App.tsx               # Root application component with providers
├── main.tsx              # Application entry point
├── index.css             # Global styles and CSS variables
└── vite-env.d.ts         # Vite type definitions
```

### Feature-Based Architecture
```
src/
├── components/           # Reusable UI components (organized by feature)
│   ├── ui/              # Base UI components (shadcn/ui)
│   ├── layout/          # Layout components (navigation, sidebar)
│   ├── auth/            # Authentication components
│   ├── ai-tutor/        # AI tutoring interface components
│   ├── tasks/           # Task management components
│   ├── study/           # Study session components
│   ├── analytics/       # Analytics and charts
│   └── [feature]/       # Other feature-specific components
├── pages/               # Route-level page components
├── hooks/               # Custom React hooks
├── services/            # Business logic and API clients
├── lib/                 # Utilities and helper functions
├── types/               # TypeScript type definitions
├── integrations/        # Third-party service integrations
└── utils/               # General utility functions
```

### Detailed Component Organization
- **UI Components** (`components/ui/`): Base components from shadcn/ui
- **Feature Components**: Organized by domain (auth, ai-tutor, tasks, etc.)
- **Layout Components**: Navigation, sidebar, protected routes
- **Error Boundaries**: Global and feature-specific error handling

### Services Layer (`services/`)
```
services/
├── ai/                  # AI service integrations
├── api/                 # API clients and interceptors
├── analytics/           # Analytics and tracking
├── audio/               # Ambient audio services
├── encryption/          # Security and encryption
├── monitoring/          # Performance and error monitoring
└── [domain]/            # Domain-specific services
```

### Custom Hooks (`hooks/`)
- **Data Hooks**: `useTasks`, `useSubjects`, `useFlashcards`
- **Auth Hooks**: `useAuth`, `useSecurity`
- **UI Hooks**: `useToast`, `useDebounce`, `use-mobile`
- **Feature Hooks**: `useStudySessions`, `useAchievements`

## Database Structure (`supabase/`)

```
supabase/
├── migrations/          # Database schema migrations
├── functions/           # Edge Functions (AI proxy, analytics)
└── config.toml          # Supabase configuration
```

### Key Database Tables
- `profiles` - User profiles and settings
- `tasks` - Task management with priorities and due dates
- `subjects` - Subject organization and materials
- `study_sessions` - Pomodoro and focus session tracking
- `flashcards` - Spaced repetition flashcard system
- `goals` - SMART goal setting and tracking
- `achievements` - Gamification and progress badges
- `api_vault` - Encrypted API key storage

## Testing Structure (`tests/`)

```
tests/
├── e2e/                 # End-to-end tests (Playwright)
│   ├── auth/           # Authentication flows
│   ├── core/           # Core functionality
│   ├── ai/             # AI features
│   └── accessibility/  # Accessibility compliance
├── integration/         # Integration tests
├── performance/         # Performance benchmarks
└── security/           # Security validation tests
```

## Configuration Files

### Build & Development
- `vite.config.ts` - Vite build configuration with security headers
- `tailwind.config.ts` - Tailwind CSS with custom design system
- `tsconfig.json` - TypeScript configuration with strict mode
- `vitest.config.ts` - Test configuration with coverage thresholds

### Code Quality
- `eslint.config.js` - ESLint rules for TypeScript and React
- `components.json` - shadcn/ui component configuration
- `playwright.config.ts` - E2E test configuration

### Deployment
- `vercel.json` - Vercel deployment with security headers
- `package.json` - Dependencies and build scripts

## Import Path Conventions

### Absolute Imports
- `@/components/*` - Component imports
- `@/hooks/*` - Custom hooks
- `@/services/*` - Service layer
- `@/lib/*` - Utilities and helpers
- `@/types/*` - Type definitions

### Component Import Patterns
```typescript
// UI components
import { Button } from "@/components/ui/button"

// Feature components
import { TaskList } from "@/components/tasks/TaskList"

// Hooks
import { useTasks } from "@/hooks/useTasks"

// Services
import { aiService } from "@/services/ai/ai-service"
```

## File Naming Conventions

- **Components**: PascalCase (`TaskList.tsx`, `AITutor.tsx`)
- **Hooks**: camelCase with `use` prefix (`useTasks.ts`, `useAuth.tsx`)
- **Services**: kebab-case (`ai-service.ts`, `task-service.ts`)
- **Types**: kebab-case (`ai-tutor.ts`, `task-types.ts`)
- **Utilities**: kebab-case (`async-error-handler.ts`)

## Security Architecture

### Security Layers
1. **Frontend**: Input validation with Zod schemas
2. **API**: Rate limiting and request signing
3. **Database**: Row Level Security (RLS) policies
4. **Infrastructure**: CSP headers and HTTPS enforcement

### Key Security Files
- `src/lib/security.ts` - Core security utilities
- `src/lib/input-validation.ts` - Input sanitization
- `src/services/encryption/` - Encryption services
- `src/hooks/useSecurity.tsx` - Security context and hooks