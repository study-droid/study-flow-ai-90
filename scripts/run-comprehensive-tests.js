#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Runs all test suites with proper reporting and coverage
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n${description}`, 'cyan');
  log(`Running: ${command}`, 'blue');
  
  try {
    const output = execSync(command, { 
      stdio: 'inherit',
      encoding: 'utf8'
    });
    log(`✅ ${description} completed successfully`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, 'red');
    log(`Error: ${error.message}`, 'red');
    return false;
  }
}

function checkTestFiles() {
  const testDirectories = [
    'src/**/*.test.{ts,tsx}',
    'src/**/*.spec.{ts,tsx}',
    'tests/**/*.test.{ts,tsx}',
    'tests/**/*.spec.{ts,tsx}'
  ];

  log('\n📋 Checking test file coverage...', 'yellow');
  
  const testFiles = [];
  
  // Find all test files
  try {
    const output = execSync('find src tests -name "*.test.*" -o -name "*.spec.*"', { encoding: 'utf8' });
    testFiles.push(...output.trim().split('\n').filter(Boolean));
  } catch (error) {
    log('Could not enumerate test files', 'yellow');
  }

  log(`Found ${testFiles.length} test files:`, 'blue');
  testFiles.forEach(file => log(`  - ${file}`, 'reset'));

  return testFiles.length > 0;
}

function generateTestReport(results) {
  const reportPath = path.join(process.cwd(), 'test-results', 'comprehensive-test-report.json');
  
  // Ensure directory exists
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalSuites: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      successRate: (results.filter(r => r.success).length / results.length) * 100
    },
    results: results,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📊 Test report generated: ${reportPath}`, 'cyan');
  
  return report;
}

async function main() {
  log('🚀 Starting Comprehensive Test Suite', 'bright');
  log('=====================================', 'bright');

  // Check if test files exist
  if (!checkTestFiles()) {
    log('⚠️  No test files found. Exiting.', 'yellow');
    process.exit(1);
  }

  const testSuites = [
    {
      name: 'Unit Tests',
      command: 'npm run test:unit',
      description: 'Running unit tests for all components and services'
    },
    {
      name: 'Integration Tests', 
      command: 'npm run test:integration',
      description: 'Running integration tests for AI service flows'
    },
    {
      name: 'Accessibility Tests',
      command: 'npm run test:accessibility', 
      description: 'Running accessibility compliance tests'
    },
    {
      name: 'Performance Tests',
      command: 'npm run test:performance',
      description: 'Running performance and load tests'
    },
    {
      name: 'Security Tests',
      command: 'npm run test:security',
      description: 'Running security validation tests'
    },
    {
      name: 'Coverage Report',
      command: 'npm run test:coverage',
      description: 'Generating comprehensive coverage report'
    }
  ];

  const results = [];
  let overallSuccess = true;

  for (const suite of testSuites) {
    const success = runCommand(suite.command, suite.description);
    results.push({
      name: suite.name,
      command: suite.command,
      success,
      timestamp: new Date().toISOString()
    });
    
    if (!success) {
      overallSuccess = false;
    }
  }

  // Generate comprehensive report
  const report = generateTestReport(results);

  // Summary
  log('\n📈 Test Suite Summary', 'bright');
  log('====================', 'bright');
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`${status} ${result.name}`, color);
  });

  log(`\n📊 Overall Results:`, 'bright');
  log(`   Total Suites: ${report.summary.totalSuites}`, 'blue');
  log(`   Passed: ${report.summary.passed}`, 'green');
  log(`   Failed: ${report.summary.failed}`, 'red');
  log(`   Success Rate: ${report.summary.successRate.toFixed(1)}%`, 'cyan');

  if (overallSuccess) {
    log('\n🎉 All test suites completed successfully!', 'green');
    process.exit(0);
  } else {
    log('\n💥 Some test suites failed. Check the logs above for details.', 'red');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\n⚠️  Test execution interrupted by user', 'yellow');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log('\n💥 Uncaught exception during test execution:', 'red');
  log(error.message, 'red');
  process.exit(1);
});

// Run the main function
main().catch(error => {
  log('\n💥 Error running comprehensive tests:', 'red');
  log(error.message, 'red');
  process.exit(1);
});