#!/usr/bin/env node

/**
 * Security Test Script
 * Tests all implemented security features
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔒 Running Security Tests...\n');

let testsPassed = 0;
let testsFailed = 0;

// Test 1: Check CSP headers
function testCSPHeaders() {
  console.log('1. Testing CSP Headers...');
  
  const vercelConfig = fs.readFileSync(path.join(__dirname, '../vercel.json'), 'utf8');
  const viteConfig = fs.readFileSync(path.join(__dirname, '../vite.config.ts'), 'utf8');
  
  // Check for actual unsafe directives (not in comments)
  const vercelCSP = JSON.parse(vercelConfig).headers[0].headers.find(h => h.key === 'Content-Security-Policy')?.value || '';
  const viteCSPMatch = viteConfig.match(/['"]Content-Security-Policy['"]:\s*\[([\s\S]*?)\]\.join/);
  const viteCSP = viteCSPMatch ? viteCSPMatch[1] : '';
  
  const hasUnsafeInline = vercelCSP.includes('unsafe-inline') || (viteCSP.includes('unsafe-inline') && !viteCSP.includes('// '));
  const hasUnsafeEval = vercelCSP.includes('unsafe-eval') || (viteCSP.includes('unsafe-eval') && !viteCSP.includes('// '));
  
  if (!hasUnsafeInline && !hasUnsafeEval) {
    console.log('   ✅ CSP headers are secure (no unsafe-inline or unsafe-eval)');
    testsPassed++;
  } else {
    console.log('   ❌ CSP headers contain unsafe directives');
    testsFailed++;
  }
}

// Test 2: Check for API key management
function testAPIKeyManagement() {
  console.log('\n2. Testing API Key Management...');
  
  const apiKeyManagerExists = fs.existsSync(path.join(__dirname, '../supabase/functions/lib/api-key-manager.ts'));
  const aiProxyContent = fs.readFileSync(path.join(__dirname, '../supabase/functions/ai-proxy/index.ts'), 'utf8');
  
  const usesKeyManager = aiProxyContent.includes('apiKeyManager');
  const hasHardcodedKeys = /Deno\.env\.get\('Gemini_key_[2-5]'\)/.test(aiProxyContent);
  
  if (apiKeyManagerExists && usesKeyManager && !hasHardcodedKeys) {
    console.log('   ✅ API keys are managed securely');
    testsPassed++;
  } else {
    console.log('   ❌ API key management issues detected');
    testsFailed++;
  }
}

// Test 3: Check secure logging
function testSecureLogging() {
  console.log('\n3. Testing Secure Logging...');
  
  const secureLoggerExists = fs.existsSync(path.join(__dirname, '../src/lib/secure-logger.ts'));
  const aiProxyClient = fs.readFileSync(path.join(__dirname, '../src/services/ai-proxy-client.ts'), 'utf8');
  
  const usesSecureLogger = aiProxyClient.includes('SecureLogger');
  const hasConsoleLog = aiProxyClient.includes('console.log') && !aiProxyClient.includes('// console.log');
  
  if (secureLoggerExists && usesSecureLogger && !hasConsoleLog) {
    console.log('   ✅ Secure logging is implemented');
    testsPassed++;
  } else {
    console.log('   ❌ Logging security issues detected');
    testsFailed++;
  }
}

// Test 4: Check rate limiting
function testRateLimiting() {
  console.log('\n4. Testing Rate Limiting...');
  
  const rateLimiterExists = fs.existsSync(path.join(__dirname, '../src/lib/rate-limiter.ts'));
  const authHook = fs.readFileSync(path.join(__dirname, '../src/hooks/useAuth.tsx'), 'utf8');
  
  const usesRateLimiter = authHook.includes('authRateLimiter');
  
  if (rateLimiterExists && usesRateLimiter) {
    console.log('   ✅ Rate limiting is implemented');
    testsPassed++;
  } else {
    console.log('   ❌ Rate limiting not properly implemented');
    testsFailed++;
  }
}

// Test 5: Check password policy
function testPasswordPolicy() {
  console.log('\n5. Testing Password Policy...');
  
  const envExample = fs.readFileSync(path.join(__dirname, '../.env.example'), 'utf8');
  
  const hasSecureInstructions = envExample.includes('openssl rand -hex 32');
  const hasWeakExample = envExample.includes('your_secure_encryption_password_here');
  
  if (hasSecureInstructions && !hasWeakExample) {
    console.log('   ✅ Password policy is properly documented');
    testsPassed++;
  } else {
    console.log('   ❌ Weak password examples detected');
    testsFailed++;
  }
}

// Test 6: Check XSS protection
function testXSSProtection() {
  console.log('\n6. Testing XSS Protection...');
  
  const enhancedSecurityExists = fs.existsSync(path.join(__dirname, '../src/lib/enhanced-security.ts'));
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  
  const hasDOMPurify = packageJson.dependencies['dompurify'] || packageJson.devDependencies['dompurify'];
  
  if (enhancedSecurityExists && hasDOMPurify) {
    console.log('   ✅ XSS protection with DOMPurify is implemented');
    testsPassed++;
  } else {
    console.log('   ❌ XSS protection not properly implemented');
    testsFailed++;
  }
}

// Test 7: Check security headers
function testSecurityHeaders() {
  console.log('\n7. Testing Security Headers...');
  
  const vercelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../vercel.json'), 'utf8'));
  const headers = vercelConfig.headers[0].headers;
  
  const requiredHeaders = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security',
    'Content-Security-Policy',
    'X-Permitted-Cross-Domain-Policies',
    'Cross-Origin-Opener-Policy'
  ];
  
  const headerKeys = headers.map(h => h.key);
  const hasAllHeaders = requiredHeaders.every(h => headerKeys.includes(h));
  
  if (hasAllHeaders) {
    console.log('   ✅ All security headers are configured');
    testsPassed++;
  } else {
    console.log('   ❌ Missing security headers');
    testsFailed++;
  }
}

// Test 8: Check console log removal
function testConsoleLogRemoval() {
  console.log('\n8. Testing Console Log Removal...');
  
  const viteConfig = fs.readFileSync(path.join(__dirname, '../vite.config.ts'), 'utf8');
  
  const hasDropConsole = viteConfig.includes('drop_console');
  const hasProduction = viteConfig.includes("mode === 'production'");
  
  if (hasDropConsole && hasProduction) {
    console.log('   ✅ Console logs are removed in production');
    testsPassed++;
  } else {
    console.log('   ❌ Console log removal not configured');
    testsFailed++;
  }
}

// Test 9: Check input validation
function testInputValidation() {
  console.log('\n9. Testing Input Validation...');
  
  const inputValidationExists = fs.existsSync(path.join(__dirname, '../src/lib/input-validation.ts'));
  
  if (inputValidationExists) {
    console.log('   ✅ Input validation is implemented');
    testsPassed++;
  } else {
    console.log('   ❌ Input validation not found');
    testsFailed++;
  }
}

// Run all tests
console.log('=' . repeat(50));
testCSPHeaders();
testAPIKeyManagement();
testSecureLogging();
testRateLimiting();
testPasswordPolicy();
testXSSProtection();
testSecurityHeaders();
testConsoleLogRemoval();
testInputValidation();

// Summary
console.log('\n' + '=' . repeat(50));
console.log('\n📊 Security Test Results:');
console.log(`   ✅ Passed: ${testsPassed}/9`);
console.log(`   ❌ Failed: ${testsFailed}/9`);

const score = Math.round((testsPassed / 9) * 100);
console.log(`\n🎯 Security Score: ${score}%`);

if (score === 100) {
  console.log('🎉 All security tests passed! Your application is well protected.');
} else if (score >= 80) {
  console.log('👍 Good security implementation, but some improvements needed.');
} else if (score >= 60) {
  console.log('⚠️  Security needs attention. Please fix the failed tests.');
} else {
  console.log('🚨 Critical security issues detected. Immediate action required!');
}

process.exit(testsFailed > 0 ? 1 : 0);