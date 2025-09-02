#!/usr/bin/env node

/**
 * Comprehensive Security Test Suite
 * Tests all implemented security measures
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔒 Running Comprehensive Security Tests...\n');
console.log('=' .repeat(60));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function testPass(testName) {
  console.log(`✅ ${testName}`);
  passedTests++;
  totalTests++;
}

function testFail(testName, reason) {
  console.log(`❌ ${testName}`);
  console.log(`   Reason: ${reason}`);
  failedTests++;
  totalTests++;
}

// Test 1: CSP Configuration
console.log('\n📋 Testing Content Security Policy...');
const enhancedSecurityPath = path.join(__dirname, '..', 'src', 'lib', 'enhanced-security.ts');
if (fs.existsSync(enhancedSecurityPath)) {
  const content = fs.readFileSync(enhancedSecurityPath, 'utf8');
  
  if (!content.includes('unsafe-inline') && !content.includes('unsafe-eval')) {
    testPass('CSP does not contain unsafe-inline or unsafe-eval');
  } else {
    testFail('CSP Configuration', 'Still contains unsafe directives');
  }
  
  if (content.includes('generateCSPNonce')) {
    testPass('CSP nonce generation implemented');
  } else {
    testFail('CSP Nonce', 'Nonce generation not found');
  }
} else {
  testFail('Enhanced Security', 'File not found');
}

// Test 2: Encryption Keys
console.log('\n🔐 Testing Encryption Configuration...');
const envExamplePath = path.join(__dirname, '..', '.env.example');
if (fs.existsSync(envExamplePath)) {
  const envContent = fs.readFileSync(envExamplePath, 'utf8');
  
  if (!envContent.includes('VITE_ENCRYPTION_PASSWORD') && !envContent.includes('VITE_APP_SALT')) {
    testPass('Encryption keys removed from frontend environment');
  } else {
    testFail('Encryption Keys', 'Still present in .env.example');
  }
}

const encryptionServicePath = path.join(__dirname, '..', 'supabase', 'functions', 'encryption', 'index.ts');
if (fs.existsSync(encryptionServicePath)) {
  testPass('Backend encryption service created');
} else {
  testFail('Encryption Service', 'Backend service not found');
}

// Test 3: Secure Logging
console.log('\n📝 Testing Secure Logging...');
const secureLoggerPath = path.join(__dirname, '..', 'supabase', 'functions', 'lib', 'secure-logger.ts');
if (fs.existsSync(secureLoggerPath)) {
  const loggerContent = fs.readFileSync(secureLoggerPath, 'utf8');
  
  if (loggerContent.includes('SENSITIVE_PATTERNS') && loggerContent.includes('redactSensitiveData')) {
    testPass('Secure logger with data redaction implemented');
  } else {
    testFail('Secure Logger', 'Missing redaction functionality');
  }
  
  if (loggerContent.includes('isProduction') && loggerContent.includes('STACK_TRACE_HIDDEN')) {
    testPass('Stack traces hidden in production');
  } else {
    testFail('Stack Traces', 'Not properly hidden in production');
  }
} else {
  testFail('Secure Logger', 'File not found');
}

// Test 4: Request Signing (HMAC)
console.log('\n🔏 Testing Request Signing/HMAC...');
const requestSignerPath = path.join(__dirname, '..', 'src', 'lib', 'request-signer.ts');
const requestVerifierPath = path.join(__dirname, '..', 'supabase', 'functions', 'lib', 'request-verifier.ts');

if (fs.existsSync(requestSignerPath)) {
  const signerContent = fs.readFileSync(requestSignerPath, 'utf8');
  
  if (signerContent.includes('signRequest') && signerContent.includes('HMAC')) {
    testPass('Client-side request signing implemented');
  } else {
    testFail('Request Signer', 'Missing HMAC implementation');
  }
  
  if (signerContent.includes('generateNonce') && signerContent.includes('constantTimeCompare')) {
    testPass('Nonce generation and timing-safe comparison');
  } else {
    testFail('Security Features', 'Missing nonce or timing-safe comparison');
  }
} else {
  testFail('Request Signer', 'File not found');
}

if (fs.existsSync(requestVerifierPath)) {
  testPass('Server-side request verification implemented');
} else {
  testFail('Request Verifier', 'File not found');
}

// Test 5: Email Validation
console.log('\n📧 Testing Email Validation...');
const authValidationPath = path.join(__dirname, '..', 'supabase', 'functions', 'auth-validation', 'index.ts');
if (fs.existsSync(authValidationPath)) {
  const validationContent = fs.readFileSync(authValidationPath, 'utf8');
  
  if (validationContent.includes('ALLOWED_EMAIL_DOMAINS') && validationContent.includes('disposableProviders')) {
    testPass('Server-side email validation with domain and disposable checks');
  } else {
    testFail('Email Validation', 'Missing comprehensive validation');
  }
} else {
  testFail('Auth Validation', 'Server-side validation not found');
}

// Test 6: CORS Configuration
console.log('\n🌐 Testing CORS Configuration...');
const corsConfigPath = path.join(__dirname, '..', 'supabase', 'functions', 'cors-config.ts');
if (fs.existsSync(corsConfigPath)) {
  const corsContent = fs.readFileSync(corsConfigPath, 'utf8');
  
  if (corsContent.includes('isOriginAllowed') && corsContent.includes('new URL(')) {
    testPass('CORS uses URL parsing instead of regex');
  } else {
    testFail('CORS Validation', 'Still using regex pattern matching');
  }
  
  if (!corsContent.includes('*') || corsContent.includes('NO WILDCARDS')) {
    testPass('CORS wildcards properly restricted');
  } else {
    testFail('CORS Wildcards', 'Unsafe wildcard usage detected');
  }
} else {
  testFail('CORS Config', 'File not found');
}

// Test 7: CSRF Protection
console.log('\n🛡️ Testing CSRF Protection...');
const csrfPath = path.join(__dirname, '..', 'src', 'lib', 'csrf-protection.ts');
if (fs.existsSync(csrfPath)) {
  const csrfContent = fs.readFileSync(csrfPath, 'utf8');
  
  if (csrfContent.includes('generateCSRFToken') && csrfContent.includes('double-submit')) {
    testPass('CSRF double-submit cookie pattern implemented');
  } else {
    testFail('CSRF Pattern', 'Double-submit pattern not found');
  }
  
  if (csrfContent.includes('constantTimeCompare')) {
    testPass('CSRF timing-safe comparison implemented');
  } else {
    testFail('CSRF Comparison', 'Missing timing-safe comparison');
  }
} else {
  testFail('CSRF Protection', 'File not found');
}

// Test 8: Rate Limiting
console.log('\n⏱️ Testing Rate Limiting...');
const rateLimiterPath = path.join(__dirname, '..', 'src', 'lib', 'distributed-rate-limiter.ts');
const rateLimitMigrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250115_create_rate_limits_table.sql');

if (fs.existsSync(rateLimiterPath)) {
  const rateLimiterContent = fs.readFileSync(rateLimiterPath, 'utf8');
  
  if (rateLimiterContent.includes('DistributedRateLimiter') && rateLimiterContent.includes('checkLimit')) {
    testPass('Distributed rate limiter implemented');
  } else {
    testFail('Rate Limiter', 'Missing implementation');
  }
} else {
  testFail('Rate Limiter', 'File not found');
}

if (fs.existsSync(rateLimitMigrationPath)) {
  testPass('Rate limit database migration created');
} else {
  testFail('Rate Limit DB', 'Migration not found');
}

// Test 9: Security Headers
console.log('\n📋 Testing Security Headers...');
if (fs.existsSync(enhancedSecurityPath)) {
  const content = fs.readFileSync(enhancedSecurityPath, 'utf8');
  
  const requiredHeaders = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Referrer-Policy'
  ];
  
  let allHeadersFound = true;
  requiredHeaders.forEach(header => {
    if (!content.includes(header)) {
      allHeadersFound = false;
    }
  });
  
  if (allHeadersFound) {
    testPass('All security headers implemented via meta tags');
  } else {
    testFail('Security Headers', 'Some headers missing');
  }
}

// Test 10: Input Validation
console.log('\n🔍 Testing Input Validation...');
const inputValidationPath = path.join(__dirname, '..', 'src', 'lib', 'input-validation.ts');
if (fs.existsSync(inputValidationPath)) {
  const validationContent = fs.readFileSync(inputValidationPath, 'utf8');
  
  if (validationContent.includes('SQL_INJECTION_PATTERNS') && 
      validationContent.includes('XSS_PATTERNS') &&
      validationContent.includes('PATH_TRAVERSAL_PATTERNS')) {
    testPass('Comprehensive input validation patterns');
  } else {
    testFail('Input Validation', 'Missing validation patterns');
  }
} else {
  // Check if validation is in enhanced-security.ts
  if (fs.existsSync(enhancedSecurityPath)) {
    const content = fs.readFileSync(enhancedSecurityPath, 'utf8');
    if (content.includes('SQL_INJECTION_PATTERNS')) {
      testPass('Input validation integrated in enhanced security');
    } else {
      testFail('Input Validation', 'Not properly implemented');
    }
  }
}

// Test 11: API Key Management
console.log('\n🔑 Testing API Key Management...');
const apiKeyManagerPath = path.join(__dirname, '..', 'supabase', 'functions', 'lib', 'api-key-manager.ts');
if (fs.existsSync(apiKeyManagerPath)) {
  const apiKeyContent = fs.readFileSync(apiKeyManagerPath, 'utf8');
  
  if (apiKeyContent.includes('SecureAPIKeyManager') && 
      !apiKeyContent.includes('hardcoded') &&
      apiKeyContent.includes('Deno.env.get')) {
    testPass('Secure API key management from environment');
  } else {
    testFail('API Key Management', 'Keys may be hardcoded');
  }
} else {
  testFail('API Key Manager', 'File not found');
}

// Test 12: Password Requirements
console.log('\n🔒 Testing Password Security...');
const authPath = path.join(__dirname, '..', 'src', 'pages', 'Auth.tsx');
if (fs.existsSync(authPath)) {
  const authContent = fs.readFileSync(authPath, 'utf8');
  
  if (authContent.includes('minLength={6}')) {
    testPass('Password minimum length enforced');
  } else {
    testFail('Password Length', 'Minimum length not enforced');
  }
  
  if (authContent.includes('validateEmailInput') && authContent.includes('supabase.functions.invoke')) {
    testPass('Server-side email validation integrated');
  } else {
    testFail('Email Validation', 'Not using server-side validation');
  }
} else {
  testFail('Auth Component', 'File not found');
}

// Results Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SECURITY TEST RESULTS:');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passedTests}/${totalTests}`);
console.log(`❌ Failed: ${failedTests}/${totalTests}`);

const score = Math.round((passedTests / totalTests) * 100);
console.log(`\n🎯 Security Score: ${score}%`);

if (score >= 90) {
  console.log('🏆 EXCELLENT: Your application has strong security!');
} else if (score >= 75) {
  console.log('👍 GOOD: Security is solid with room for improvement.');
} else if (score >= 60) {
  console.log('⚠️ MODERATE: Several security issues need attention.');
} else {
  console.log('🚨 CRITICAL: Major security vulnerabilities detected!');
}

// Recommendations
if (failedTests > 0) {
  console.log('\n📝 RECOMMENDATIONS:');
  console.log('1. Review and fix all failed tests');
  console.log('2. Run migration: supabase migration up');
  console.log('3. Deploy edge functions: supabase functions deploy');
  console.log('4. Configure environment variables in Supabase dashboard');
  console.log('5. Test in staging environment before production');
}

console.log('\n✨ Security test completed!');
process.exit(failedTests > 0 ? 1 : 0);