/**
 * Global Test Teardown
 * Cleanup after all tests complete
 */

import { FullConfig } from '@playwright/test';
import { cleanupTestDatabase } from './database-setup';
import { stopMockServer } from './mock-server';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting StudyFlow AI E2E Test Cleanup...');

  try {
    // 1. Stop Mock Server
    console.log('📡 Stopping mock server...');
    await stopMockServer();

    // 2. Cleanup Test Database (if configured)
    if (process.env.CLEANUP_DB_AFTER_TESTS === 'true') {
      console.log('🗄️  Cleaning up test database...');
      await cleanupTestDatabase();
    }

    // 3. Cleanup authentication files
    console.log('🔐 Cleaning up authentication files...');
    await cleanupAuthFiles();

    // 4. Generate test summary
    console.log('📊 Generating test summary...');
    await generateTestSummary();

    console.log('✅ Global teardown completed successfully!');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here as tests have already completed
  }
}

/**
 * Cleanup authentication files
 */
async function cleanupAuthFiles() {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const authDir = 'tests/.auth';
    
    // Remove auth state files but keep directory
    const files = await fs.readdir(authDir).catch(() => []);
    
    for (const file of files) {
      if (file.endsWith('.json') || file.endsWith('.png')) {
        await fs.unlink(path.join(authDir, file)).catch(() => {});
      }
    }
    
    console.log('✅ Authentication files cleaned up');
    
  } catch (error) {
    console.warn('⚠️  Failed to cleanup auth files:', error.message);
  }
}

/**
 * Generate test summary report
 */
async function generateTestSummary() {
  try {
    const fs = await import('fs/promises');
    
    // Read test results if available
    const resultsPath = 'test-results/results.json';
    let testResults = null;
    
    try {
      const resultsData = await fs.readFile(resultsPath, 'utf-8');
      testResults = JSON.parse(resultsData);
    } catch {
      console.log('📊 No test results found for summary');
      return;
    }
    
    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      totalTests: testResults.stats?.expected || 0,
      passedTests: testResults.stats?.passed || 0,
      failedTests: testResults.stats?.failed || 0,
      skippedTests: testResults.stats?.skipped || 0,
      duration: testResults.stats?.duration || 0,
      environment: process.env.NODE_ENV || 'test',
    };
    
    await fs.writeFile(
      'test-results/test-summary.json', 
      JSON.stringify(summary, null, 2)
    );
    
    console.log('📊 Test Summary:');
    console.log(`   Total: ${summary.totalTests}`);
    console.log(`   Passed: ${summary.passedTests}`);
    console.log(`   Failed: ${summary.failedTests}`);
    console.log(`   Duration: ${Math.round(summary.duration / 1000)}s`);
    
  } catch (error) {
    console.warn('⚠️  Failed to generate test summary:', error.message);
  }
}

export default globalTeardown;