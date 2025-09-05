/**
 * Global Test Setup
 * Initializes test environment, database, and authentication
 */

import { chromium, FullConfig } from '@playwright/test';
import dotenv from 'dotenv';
import { setupTestDatabase } from './database-setup';
import { initializeMockServer } from './mock-server';

dotenv.config({ path: '.env.test' });

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting StudyFlow AI E2E Test Setup...');

  try {
    // 1. Initialize Mock Server for AI Services
    console.log('📡 Setting up mock server...');
    await initializeMockServer();

    // 2. Setup Test Database
    if (process.env.RESET_DB_BEFORE_TESTS === 'true') {
      console.log('🗄️  Setting up test database...');
      await setupTestDatabase();
    }

    // 3. Skip Test Users (using mock auth instead)
    console.log('👤 Skipping test user creation (using mock authentication)...');

    // 4. Setup Authentication State
    console.log('🔐 Setting up authentication state...');
    await setupAuthState();

    // 5. Warm up the application
    console.log('🔥 Warming up application...');
    await warmupApplication();

    console.log('✅ Global setup completed successfully!');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

/**
 * Setup authenticated user state for tests (mock authentication)
 */
async function setupAuthState() {
  try {
    // Create mock authentication state for tests
    const mockAuthState = {
      cookies: [],
      origins: [
        {
          origin: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080',
          localStorage: [
            {
              name: 'sb-localhost-auth-token',
              value: JSON.stringify({
                access_token: 'mock-access-token',
                token_type: 'bearer',
                expires_in: 3600,
                expires_at: Date.now() + 3600000,
                refresh_token: 'mock-refresh-token',
                user: {
                  id: 'test-user-id',
                  email: process.env.TEST_USER_EMAIL || 'test@studyflow.ai',
                  email_confirmed_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  role: 'authenticated',
                  aud: 'authenticated',
                  app_metadata: {},
                  user_metadata: {
                    display_name: 'Test User',
                    full_name: 'Test User'
                  }
                }
              })
            }
          ]
        }
      ]
    };

    // Ensure auth directory exists
    const { mkdirSync } = await import('fs');
    const { dirname } = await import('path');
    try {
      mkdirSync(dirname('tests/.auth/user.json'), { recursive: true });
    } catch {
      // Directory already exists
    }

    // Write mock auth state
    const { writeFileSync } = await import('fs');
    writeFileSync('tests/.auth/user.json', JSON.stringify(mockAuthState, null, 2));
    
    console.log('✅ Mock authentication state created');

  } catch (error) {
    console.error('❌ Failed to setup mock authentication state:', error);
    throw error;
  }
}

/**
 * Warm up the application by visiting key routes
 */
async function warmupApplication() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const routes = [
      '/',
      '/auth',
      '/dashboard',
      '/tasks',
      '/study',
      '/ai-tutor',
    ];

    for (const route of routes) {
      try {
        await page.goto(`${process.env.PLAYWRIGHT_BASE_URL}${route}`, { 
          waitUntil: 'domcontentloaded',
          timeout: 10000 
        });
        console.log(`✅ Warmed up route: ${route}`);
      } catch (error) {
        console.warn(`⚠️  Failed to warm up route ${route}:`, error.message);
      }
    }

  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;