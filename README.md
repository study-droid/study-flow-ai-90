# StudyFlow AI - Educational SaaS Platform

A comprehensive study management platform with AI-powered tutoring, task management, and learning analytics.

## Features

### Core Functionality
- **Task Management** - Organize assignments with priorities, due dates, and progress tracking
- **Study Sessions** - Pomodoro timer with focus tracking and ambient sounds
- **Flashcards** - Spaced repetition algorithm for effective memorization
- **AI Tutor** - Multi-provider AI integration (Gemini, Claude, OpenAI)
- **Analytics Dashboard** - Visualize study patterns and progress
- **Calendar Integration** - Manage events, assignments, and study sessions
- **Achievement System** - Gamification with badges and progress tracking
- **Timetable Management** - Weekly schedule and class organization
- **Subject Organization** - Materials, assignments, and resources per subject
- **Goal Setting** - SMART goals with deadline tracking

### Advanced Features
- **Multi-provider AI** - Connect your own API keys for AI services
- **Export to PDF** - Generate reports and export data
- **Security Dashboard** - Monitor account security status
- **Performance Monitoring** - Track application performance
- **Mobile Optimization** - Fully responsive design
- **Dark/Light Mode** - Theme customization
- **Global Search** - Command palette with fuzzy search
- **Notifications** - In-app notification system
- **Ambient Audio** - Study music and sounds player

## Tech Stack

- **Frontend:** React 18.3, TypeScript 5.6, Vite 7.1
- **Styling:** Tailwind CSS, Radix UI
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Authentication:** Supabase Auth with Google OAuth
- **State Management:** TanStack Query
- **AI Services:** Google Gemini, OpenAI, Anthropic Claude
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- API keys for AI services (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/study-flow-ai.git
cd study-flow-ai
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
# Add other API keys as needed
```

5. Run database migrations:
```bash
# Apply all migrations in supabase/migrations folder
```

6. Start the development server:
```bash
npm run dev
```

## Development

### Available Scripts

```bash
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build
npm run test            # Run tests
npm run test:coverage   # Run tests with coverage
npm run test:ui         # Run tests with UI
npm run lint            # Run ESLint
npm run type-check      # Check TypeScript types
```

### Project Structure

```
src/
├── components/         # Reusable UI components
├── pages/             # Route pages
├── hooks/             # Custom React hooks
├── services/          # Business logic and API clients
├── lib/               # Utilities and helpers
├── integrations/      # Third-party integrations
├── types/             # TypeScript type definitions
└── test/              # Test setup and utilities

supabase/
├── functions/         # Edge Functions
└── migrations/        # Database migrations
```

### Testing

The project uses Vitest and React Testing Library:

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# UI mode
npm run test:ui
```

### Code Quality

- **TypeScript:** Strict mode enabled
- **ESLint:** Configured for React and TypeScript
- **Prettier:** Code formatting (configure as needed)

## Security

### Security Features
- Row Level Security (RLS) on all database tables
- CSRF protection
- Content Security Policy (CSP)
- Input sanitization with DOMPurify
- Rate limiting on API endpoints
- HMAC request signing
- Secure session management

### Security Checklist
- [ ] Rotate API keys regularly
- [ ] Use environment variables for sensitive data
- [ ] Never commit `.env` file
- [ ] Enable 2FA on all services
- [ ] Review RLS policies regularly
- [ ] Monitor rate limiting
- [ ] Check for dependency vulnerabilities

## Database Schema

### Core Tables
- `profiles` - User profiles and settings
- `tasks` - Task management
- `subjects` - Subject organization
- `study_sessions` - Study session tracking
- `flashcards` - Flashcard system
- `goals` - Goal management
- `achievements` - Achievement tracking
- `materials` - Study materials
- `assignments` - Assignment tracking

### Security Tables
- `api_vault` - Encrypted API key storage
- `rate_limits` - Rate limiting tracking

## API Documentation

### Supabase Edge Functions

#### `/ai-proxy`
Proxy for AI service requests with rate limiting.

#### `/ai-study-analytics`
Generate AI-powered study analytics.

#### `/ai-study-recommendations`
Get personalized study recommendations.

#### `/auth-validation`
Server-side authentication validation.

#### `/encryption`
Secure encryption/decryption service.

## Deployment

### Vercel Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy to preview:
```bash
npm run deploy:preview
```

3. Deploy to production:
```bash
npm run deploy
```

### Environment Variables

Set these in your deployment platform:
- All variables from `.env.example`
- `NODE_ENV=production`
- Database connection strings
- API keys

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Standards
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Ensure all tests pass
- No console.logs in production code

## Troubleshooting

### Common Issues

**Build fails with TypeScript errors**
```bash
npm run type-check
# Fix any type errors
```

**Database connection issues**
- Check Supabase URL and keys
- Verify RLS policies
- Check network connectivity

**AI features not working**
- Verify API keys are set
- Check rate limits
- Review error logs

## License

This project is proprietary software. All rights reserved.

## Support

For support, email support@studyflow.ai or open an issue on GitHub.

## Acknowledgments

- Supabase for backend infrastructure
- Radix UI for component primitives
- Tailwind CSS for styling
- All open source contributors