/**
 * Application Configuration
 * Centralized configuration management with environment variable support
 */

interface AppConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  app: {
    name: string;
    version: string;
    url: string;
  };
  features: {
    aiRecommendations: boolean;
    advancedAnalytics: boolean;
    gamification: boolean;
  };
  security: {
    rateLimitRequestsPerMinute: number;
    maxFileUploadSize: number;
    cspSources: {
      script: string[];
      style: string[];
      img: string[];
      connect: string[];
    };
  };
  analytics: {
    enabled: boolean;
  };
  development: {
    devMode: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

// Validate required environment variables
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

export const config: AppConfig = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || 'StudyFlow AI',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    url: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
  },
  features: {
    aiRecommendations: import.meta.env.VITE_FEATURE_AI_RECOMMENDATIONS === 'true',
    advancedAnalytics: import.meta.env.VITE_FEATURE_ADVANCED_ANALYTICS === 'true',
    gamification: import.meta.env.VITE_FEATURE_GAMIFICATION === 'true',
  },
  security: {
    rateLimitRequestsPerMinute: parseInt(import.meta.env.VITE_RATE_LIMIT_REQUESTS_PER_MINUTE || '60'),
    maxFileUploadSize: parseInt(import.meta.env.VITE_MAX_FILE_UPLOAD_SIZE || '10485760'), // 10MB
    cspSources: {
      script: [
        "'self'",
        "https://*.supabase.co",
        "https://cdn.jsdelivr.net"
      ],
      style: [
        "'self'",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net"
      ],
      img: [
        "'self'",
        "data:",
        "blob:",
        "https://*.supabase.co",
        "https://images.unsplash.com",
      ],
      connect: [
        "'self'",
        "https://*.supabase.co",
        "wss://*.supabase.co",
        "https://api.openai.com",
        "https://generativelanguage.googleapis.com",
        "https://*.googleapis.com",
        "https://ai.google.dev"
      ]
    }
  },
  analytics: {
    enabled: import.meta.env.VITE_ANALYTICS_ENABLED === 'true',
  },
  development: {
    devMode: import.meta.env.VITE_DEV_MODE === 'true',
    logLevel: (import.meta.env.VITE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'error',
  },
};

// Helper functions for configuration access
export const getSupabaseUrl = () => config.supabase.url;
export const getSupabaseAnonKey = () => config.supabase.anonKey;
export const getAppConfig = () => config.app;
export const getFeatureFlags = () => config.features;
export const getSecurityConfig = () => config.security;

// Environment-specific utilities
export const isDevelopment = () => config.development.devMode || import.meta.env.DEV;
export const isProduction = () => import.meta.env.PROD && !config.development.devMode;

// API endpoints builder
export const getApiUrl = (path: string) => {
  const baseUrl = config.supabase.url;
  return `${baseUrl}/functions/v1${path.startsWith('/') ? path : `/${path}`}`;
};

// Re-export logger for backward compatibility
import { logger } from './logger';
export const log = logger;

export default config;