# GEMINI.md - Project Context for StudyFlow AI

## Project Overview

This is a comprehensive educational SaaS platform called **StudyFlow AI**. It's designed to help users manage their studies with features like task management, study sessions (using the Pomodoro technique), flashcards with spaced repetition, and an AI tutor. The platform also includes analytics, calendar integration, gamification, and more.

The application is built with a modern tech stack:

*   **Frontend:** React 18.3, TypeScript 5.6, and Vite 7.1.
*   **Styling:** Tailwind CSS and Radix UI for accessible and unstyled components.
*   **Backend:** Supabase, which provides a PostgreSQL database and Edge Functions.
*   **Authentication:** Supabase Auth, including Google OAuth.
*   **State Management:** TanStack Query for managing server state.
*   **AI Integration:** The platform integrates with multiple AI providers, including Google Gemini, OpenAI, and Anthropic Claude.
*   **Deployment:** The application is deployed on Vercel.

## Building and Running

The project uses `npm` for package management. Here are the key commands:

*   **`npm install`**: Install dependencies.
*   **`npm run dev`**: Start the development server.
*   **`npm run build`**: Build the application for production.
*   **`npm run preview`**: Preview the production build locally.
*   **`npm run test`**: Run unit and integration tests with Vitest.
*   **`npm run test:e2e`**: Run end-to-end tests with Playwright.
*   **`npm run lint`**: Lint the codebase with ESLint.
*   **`npm run type-check`**: Check for TypeScript errors.

### Running the Full Application

To run the full application, you'll need to:

1.  **Set up Supabase:** Create a Supabase project and get the URL and anon key.
2.  **Configure Environment Variables:** Copy `.env.example` to `.env` and fill in the Supabase and any AI API keys.
3.  **Run Migrations:** The `README.md` mentions running database migrations, but doesn't provide a specific command. You'll likely need to use the Supabase CLI for this.
4.  **Start the Development Server:** `npm run dev`.

## Development Conventions

*   **Code Style:** The project uses ESLint and Prettier for code quality and consistent formatting.
*   **TypeScript:** Strict mode is enabled in `tsconfig.json`, and all new code should be written in TypeScript.
*   **Testing:** The project has a comprehensive testing setup with Vitest for unit/integration tests and Playwright for end-to-end tests. New features should be accompanied by tests.
*   **Components:** Reusable UI components are located in `src/components`.
*   **State Management:** TanStack Query is used for managing server state. Avoid using component-level state for data that comes from the backend.
*   **Commits:** The `README.md` suggests a conventional commit format (`feat: Add some AmazingFeature`).
*   **Security:** The project has a strong focus on security, with features like Row Level Security (RLS) in Supabase, a Content Security Policy (CSP), and input sanitization.
