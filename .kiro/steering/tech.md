# StudyFlow AI - Technical Stack & Build System

## Core Technology Stack

### Frontend
- **React 18.3** with TypeScript 5.9 in strict mode
- **Vite 7.1** as build tool and dev server
- **Tailwind CSS** with custom design system and shadcn/ui components
- **Radix UI** for accessible component primitives
- **TanStack Query** for server state management
- **React Router DOM** for client-side routing
- **Zustand** for local state management

### Backend & Infrastructure
- **Supabase** - PostgreSQL database with Row Level Security (RLS)
- **Supabase Edge Functions** - Serverless functions for AI proxy and analytics
- **Vercel** - Deployment platform with edge optimization

### AI Integration
- **Multi-provider AI support**: Google Gemini, OpenAI, Anthropic Claude, DeepSeek
- **Streaming responses** with proper error handling and rate limiting
- **Secure API key storage** using Supabase encrypted vault

### Testing & Quality
- **Vitest** for unit testing with jsdom environment
- **Playwright** for E2E testing across browsers
- **ESLint** with TypeScript and React rules
- **Coverage thresholds**: 80% global, 90%+ for critical modules

## Build Commands

### Development
```bash
npm run dev              # Start development server (port 8080)
npm run dev:ai           # Start with test environment for AI features
npm run type-check       # TypeScript type checking
npm run type-check:watch # Watch mode type checking
```

### Building
```bash
npm run build           # Production build with optimizations
npm run build:dev       # Development build
npm run build:prod      # Production build with NODE_ENV=production
npm run preview         # Preview production build locally
```

### Testing
```bash
npm run test            # Run unit tests with Vitest
npm run test:ui         # Run tests with UI interface
npm run test:coverage   # Generate coverage report
npm run test:watch      # Watch mode testing
npm run test:e2e        # Run Playwright E2E tests
npm run test:e2e:ui     # E2E tests with UI
npm run test:comprehensive # Run all test suites
```

### Deployment
```bash
npm run deploy          # Deploy to Vercel production
npm run deploy:preview  # Deploy to Vercel preview
npm run deploy:functions # Deploy Supabase Edge Functions
```

### Security & Validation
```bash
npm run security:audit     # NPM security audit
npm run security:validate  # Custom security validation
npm run lint               # ESLint code quality check
```

## Development Server Configuration

- **Host**: `::` (IPv6 all interfaces)
- **Port**: 8080
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.
- **Hot Module Replacement**: Enabled with React Fast Refresh

## Build Optimizations

### Code Splitting Strategy
- **React Core**: `react`, `react-dom`, `react-router-dom`
- **UI Components**: All Radix UI components bundled together
- **Data Libraries**: TanStack Query, Supabase client
- **AI Services**: Conditionally bundled based on usage
- **Charts**: Recharts for analytics visualization
- **Forms**: React Hook Form with Zod validation

### Performance Features
- **Lazy Loading**: All pages and heavy components
- **Asset Optimization**: Images, fonts, and static assets
- **Bundle Analysis**: Chunk size warnings at 600KB
- **Tree Shaking**: Unused code elimination
- **Terser Minification**: Production console.log removal

## Environment Configuration

### Required Environment Variables
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=optional_gemini_key
# Additional AI service keys as needed
```

### Security Configuration
- **Content Security Policy**: Strict CSP with specific allowed sources
- **CORS**: Configured for Supabase and AI service endpoints
- **Rate Limiting**: Implemented on Edge Functions
- **Input Validation**: Zod schemas for all user inputs
- **CSRF Protection**: Built-in request signing