import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      // Enhanced Security Headers
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      
      // Content Security Policy - Different for dev vs production
      'Content-Security-Policy': mode === 'development' ? [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' http://localhost:* http://127.0.0.1:* ws: wss: https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://*.googleapis.com https://ai.google.dev https://cdn.freesound.org https://openrouter.ai https://api.openai.com https://api.deepseek.com",
        "media-src 'self' https://cdn.freesound.org https:",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ') : [
        "default-src 'self'",
        "script-src 'self' https://cdn.jsdelivr.net",
        "style-src 'self' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://*.googleapis.com https://ai.google.dev https://cdn.freesound.org https://api.deepseek.com",
        "media-src 'self' https://cdn.freesound.org https:",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests"
      ].join('; ')
    }
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: mode === 'development',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-core': ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          
          // UI Components
          'radix-ui': [
            '@radix-ui/react-slider',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-progress',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch',
            '@radix-ui/react-alert-dialog'
          ],
          
          // Data fetching and state management
          'data-libs': ['@tanstack/react-query', '@supabase/supabase-js'],
          
          // Icons and utilities
          'ui-utils': ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          
          // AI and external services (conditionally include only if used)
          ...((() => {
            const aiServices = [];
            try {
              require.resolve('@anthropic-ai/sdk');
              aiServices.push('@anthropic-ai/sdk');
            } catch {}
            try {
              require.resolve('@google/generative-ai');
              aiServices.push('@google/generative-ai');
            } catch {}
            try {
              require.resolve('openai');
              aiServices.push('openai');
            } catch {}
            return aiServices.length > 0 ? { 'ai-services': aiServices } : {};
          })()),
          
          // Charts and visualizations
          'charts': ['recharts'],
          
          // PDF and document handling
          'pdf-libs': ['jspdf', 'jspdf-autotable'],
          
          // Form handling
          'form-libs': ['react-hook-form', '@hookform/resolvers', 'zod']
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop().replace('.tsx', '').replace('.ts', '') : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'css/[name]-[hash][extname]';
          }
          if (assetInfo.name && /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
            return 'img/[name]-[hash][extname]';
          }
          if (assetInfo.name && /\.(woff|woff2|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return 'fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.info', 'console.debug', 'console.warn'] : []
      },
      mangle: {
        safari10: true
      }
    },
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 600
  },
  optimizeDeps: {
    include: [
      '@radix-ui/react-slider',
      '@radix-ui/react-tooltip', 
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-progress',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-switch',
      '@radix-ui/react-alert-dialog',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react'
    ]
  },
  preview: {
    port: 4173,
    strictPort: true,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    }
  }
}));
