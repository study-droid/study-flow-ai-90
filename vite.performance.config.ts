/**
 * Vite Performance Optimization Configuration
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';

// Performance-optimized configuration
export default defineConfig({
  plugins: [
    // Use SWC for faster builds
    react({
      jsxImportSource: '@emotion/react',
    }),
    
    // Compression plugin for better bundle sizes
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files > 10kb
      deleteOriginFile: false,
    }),
    
    // Brotli compression for even better compression
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false,
    }),
    
    // PWA support for offline functionality
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Study Flow AI',
        short_name: 'StudyFlow',
        theme_color: '#3B82F6',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5, // 5 minutes
              },
            },
          },
        ],
      },
    }),
    
    // Bundle analyzer (only in analyze mode)
    process.env.ANALYZE && visualizer({
      open: true,
      filename: 'dist/bundle-analysis.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',
    
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // UI libraries
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
          ],
          
          // Form handling
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          
          // Date utilities
          'date-vendor': ['date-fns', 'react-day-picker'],
          
          // Charts and visualization
          'chart-vendor': ['recharts', 'react-circular-progressbar'],
          
          // AI SDKs (lazy loaded)
          'ai-vendor': ['@google/generative-ai', '@anthropic-ai/sdk'],
          
          // Supabase
          'supabase-vendor': ['@supabase/supabase-js', '@supabase/ssr'],
          
          // PDF generation
          'pdf-vendor': ['jspdf', 'html2canvas'],
          
          // Icons
          'icon-vendor': ['lucide-react'],
        },
        
        // Optimize chunk names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : '';
          if (facadeModuleId.includes('node_modules')) {
            return 'js/vendor-[hash].js';
          }
          return 'js/[name]-[hash].js';
        },
        
        // Optimize entry file names
        entryFileNames: 'js/[name]-[hash].js',
        
        // Optimize asset file names
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').pop() || '';
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return 'img/[name]-[hash][extname]';
          }
          if (/woff|woff2|eot|ttf|otf/i.test(extType)) {
            return 'fonts/[name]-[hash][extname]';
          }
          if (extType === 'css') {
            return 'css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    
    // Increase chunk size warning limit slightly
    chunkSizeWarningLimit: 600,
    
    // Enable source maps for production debugging
    sourcemap: true,
    
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true, // Remove debugger statements
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2, // Run compression twice for better results
      },
      mangle: {
        safari10: true, // Work around Safari 10 bugs
      },
      format: {
        comments: false, // Remove all comments
      },
    },
    
    // Enable CSS code splitting
    cssCodeSplit: true,
    
    // Inline assets smaller than 4kb
    assetsInlineLimit: 4096,
    
    // Report compressed size
    reportCompressedSize: true,
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'date-fns',
      'zod',
    ],
    exclude: [
      '@google/generative-ai', // Lazy load AI SDKs
      '@anthropic-ai/sdk',
      'jspdf', // Lazy load PDF generation
      'html2canvas',
    ],
  },
  
  // Server configuration for development
  server: {
    port: 5173,
    strictPort: false,
    open: false,
    cors: true,
    // Prebundle dependencies for faster dev startup
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/pages/Index.tsx',
      ],
    },
  },
  
  // Preview configuration
  preview: {
    port: 4173,
    strictPort: false,
    open: false,
    cors: true,
  },
});