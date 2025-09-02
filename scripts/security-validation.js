#!/usr/bin/env node

/**
 * Security Validation Script
 * Validates that all security measures are properly implemented
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🛡️  Running Security Validation...\n');

const validations = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description}`);
    validations.passed++;
    return true;
  } else {
    console.log(`❌ ${description} - File not found: ${filePath}`);
    validations.failed++;
    return false;
  }
}

function checkFileContent(filePath, pattern, description) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (pattern.test(content)) {
      console.log(`✅ ${description}`);
      validations.passed++;
      return true;
    } else {
      console.log(`❌ ${description} - Pattern not found in ${filePath}`);
      validations.failed++;
      return false;
    }
  } else {
    console.log(`❌ ${description} - File not found: ${filePath}`);
    validations.failed++;
    return false;
  }
}

function warning(message) {
  console.log(`⚠️  ${message}`);
  validations.warnings++;
}

// 1. Database Security Files
console.log('📊 Database Security:');
checkFile('supabase/migrations/security_fixes.sql', 'Security fixes migration exists');
checkFileContent('supabase/migrations/security_fixes.sql', /CREATE POLICY.*DELETE/i, 'DELETE policies implemented');
checkFileContent('supabase/migrations/security_fixes.sql', /security_audit_log/i, 'Audit logging table created');
checkFileContent('supabase/migrations/security_fixes.sql', /SET search_path = public, pg_catalog/i, 'Secure search_path configured');

// 2. Authentication Security
console.log('\n🔐 Authentication Security:');
checkFile('supabase/config.auth.toml', 'Enhanced auth configuration exists');
checkFileContent('supabase/config.auth.toml', /leaked_password_protection = true/i, 'Password leak protection enabled');
checkFileContent('supabase/config.auth.toml', /min_length = 12/i, 'Strong password requirements set');
checkFileContent('supabase/config.auth.toml', /otp_expiry = 300/i, 'OTP expiry time reduced');

// 3. Security Headers & CSP
console.log('\n🛡️  Security Headers:');
checkFile('src/lib/enhanced-security.ts', 'Enhanced security module exists');
checkFileContent('src/lib/enhanced-security.ts', /generateStrictCSP/i, 'Strict CSP generation implemented');
checkFileContent('src/lib/enhanced-security.ts', /nonce-/i, 'Nonce-based CSP implemented');
checkFileContent('src/main.tsx', /initializeSecurity/i, 'Security initialization in main.tsx');

// 4. Edge Functions
console.log('\n🌐 Edge Functions:');
checkFile('supabase/functions/security-headers/index.ts', 'Security headers edge function exists');
checkFile('supabase/functions/security-monitor/index.ts', 'Security monitoring edge function exists');

// 5. Security Middleware
console.log('\n🔒 Security Middleware:');
checkFile('src/lib/security-middleware.ts', 'Security middleware exists');
checkFileContent('src/lib/security-middleware.ts', /rateLimiter/i, 'Rate limiting implemented');
checkFileContent('src/lib/security-middleware.ts', /sanitize/i, 'Input sanitization implemented');
checkFileContent('src/lib/security-middleware.ts', /CSRF/i, 'CSRF protection implemented');

// 6. Security Documentation
console.log('\n📚 Documentation:');
checkFile('SECURITY.md', 'Security documentation exists');
checkFileContent('SECURITY.md', /Security Fixes Implemented/i, 'Security fixes documented');

// 7. Package Security
console.log('\n📦 Package Security:');
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (packageJson.scripts && packageJson.scripts.audit) {
    console.log('✅ NPM audit script configured');
    validations.passed++;
  } else {
    warning('Consider adding "audit": "npm audit" to package.json scripts');
  }
} else {
  console.log('❌ package.json not found');
  validations.failed++;
}

// 8. Environment Security
console.log('\n🌍 Environment Security:');
if (fs.existsSync('.env.example')) {
  console.log('✅ Environment example file exists');
  validations.passed++;
  
  const envExample = fs.readFileSync('.env.example', 'utf8');
  if (envExample.includes('SUPABASE_URL') && envExample.includes('SUPABASE_ANON_KEY')) {
    console.log('✅ Required environment variables documented');
    validations.passed++;
  } else {
    warning('Ensure all required environment variables are in .env.example');
  }
} else {
  warning('.env.example file not found');
}

// 9. Check for common security anti-patterns
console.log('\n🔍 Security Anti-patterns Check:');
const jsFiles = findJSFiles('src');
let antiPatterns = 0;

jsFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Check for unsafe-inline
  if (content.includes("'unsafe-inline'")) {
    console.log(`❌ Found 'unsafe-inline' in ${file}`);
    antiPatterns++;
  }
  
  // Check for hardcoded secrets
  const secretPatterns = [
    /api[_-]?key\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i,
    /secret\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i,
    /password\s*=\s*['"][^'"]{8,}['"]/i
  ];
  
  secretPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      console.log(`❌ Potential hardcoded secret in ${file}`);
      antiPatterns++;
    }
  });
});

if (antiPatterns === 0) {
  console.log('✅ No security anti-patterns detected');
  validations.passed++;
} else {
  console.log(`❌ Found ${antiPatterns} potential security issues`);
  validations.failed++;
}

// Helper function to find JS/TS files
function findJSFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...findJSFiles(fullPath));
    } else if (item.match(/\.(js|ts|tsx)$/)) {
      files.push(fullPath);
    }
  });
  
  return files;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 SECURITY VALIDATION SUMMARY');
console.log('='.repeat(50));
console.log(`✅ Passed: ${validations.passed}`);
console.log(`❌ Failed: ${validations.failed}`);
console.log(`⚠️  Warnings: ${validations.warnings}`);

const score = Math.round((validations.passed / (validations.passed + validations.failed)) * 100);
console.log(`\n🏆 Security Score: ${score}%`);

if (score >= 90) {
  console.log('🎉 Excellent security implementation!');
} else if (score >= 75) {
  console.log('👍 Good security implementation, minor improvements needed.');
} else {
  console.log('⚠️  Security implementation needs attention.');
}

console.log('\n💡 Next Steps:');
console.log('1. Run database migration: npx supabase migration up');
console.log('2. Deploy edge functions: npx supabase functions deploy');
console.log('3. Configure auth settings in Supabase dashboard');
console.log('4. Test CSP implementation in production');
console.log('5. Set up security monitoring alerts');

process.exit(validations.failed > 0 ? 1 : 0);