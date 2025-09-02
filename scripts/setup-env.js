#!/usr/bin/env node

/**
 * Environment Setup Script
 * Helps users configure their .env file with required variables
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const REQUIRED_VARS = {
  VITE_SUPABASE_URL: {
    description: 'Supabase Project URL',
    example: 'https://your-project.supabase.co',
    required: true
  },
  VITE_SUPABASE_ANON_KEY: {
    description: 'Supabase Anonymous Key',
    example: 'eyJhbGc...',
    required: true
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    description: 'Supabase Service Role Key (for admin scripts only)',
    example: 'eyJhbGc...',
    required: false,
    secure: true
  },
  VITE_GEMINI_API_KEY: {
    description: 'Google Gemini API Key (for AI Tutor)',
    example: 'AIza...',
    required: false
  },
  VITE_CLAUDE_API_KEY: {
    description: 'Anthropic Claude API Key (optional)',
    example: 'sk-ant-...',
    required: false
  },
  OPENAI_API_KEY: {
    description: 'OpenAI API Key (for Edge Functions)',
    example: 'sk-...',
    required: false
  }
};

async function setupEnv() {
  console.log('🚀 StudyFlow AI - Environment Setup\n');
  console.log('This script will help you configure your environment variables.\n');
  
  const envPath = join(dirname(__dirname), '.env');
  const envExamplePath = join(dirname(__dirname), '.env.example');
  
  // Check if .env already exists
  let existingEnv = {};
  try {
    const envContent = await fs.readFile(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        existingEnv[key.trim()] = valueParts.join('=').trim();
      }
    });
    console.log('📄 Found existing .env file. Will update with new values.\n');
  } catch {
    console.log('📝 Creating new .env file.\n');
  }
  
  // Collect values
  const newEnv = { ...existingEnv };
  
  console.log('='.repeat(60));
  console.log('REQUIRED CONFIGURATION');
  console.log('='.repeat(60) + '\n');
  
  // Required vars
  for (const [key, config] of Object.entries(REQUIRED_VARS)) {
    if (!config.required) continue;
    
    console.log(`\n${config.description}`);
    if (existingEnv[key] && existingEnv[key] !== `your_${key.toLowerCase()}`) {
      console.log(`Current value: ${config.secure ? '[HIDDEN]' : existingEnv[key].substring(0, 20) + '...'}`);
      const keepExisting = await question('Keep existing value? (y/n): ');
      if (keepExisting.toLowerCase() === 'y') {
        continue;
      }
    }
    
    console.log(`Example: ${config.example}`);
    let value = await question(`Enter ${key}: `);
    
    while (!value || value.trim() === '') {
      console.log('❌ This field is required!');
      value = await question(`Enter ${key}: `);
    }
    
    newEnv[key] = value.trim();
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('OPTIONAL CONFIGURATION (Press Enter to skip)');
  console.log('='.repeat(60) + '\n');
  
  // Optional vars
  for (const [key, config] of Object.entries(REQUIRED_VARS)) {
    if (config.required) continue;
    
    console.log(`\n${config.description}`);
    if (existingEnv[key] && existingEnv[key] !== `your_${key.toLowerCase()}`) {
      console.log(`Current value: ${config.secure ? '[HIDDEN]' : existingEnv[key].substring(0, 20) + '...'}`);
      const keepExisting = await question('Keep existing value? (y/n): ');
      if (keepExisting.toLowerCase() === 'y') {
        continue;
      }
    }
    
    console.log(`Example: ${config.example}`);
    const value = await question(`Enter ${key} (optional): `);
    
    if (value && value.trim() !== '') {
      newEnv[key] = value.trim();
    }
  }
  
  // Add other default values from .env.example
  const defaultValues = {
    VITE_APP_URL: 'http://localhost:5173',
    VITE_APP_NAME: 'StudyFlow AI',
    VITE_APP_VERSION: '1.0.0',
    VITE_RATE_LIMIT_REQUESTS_PER_MINUTE: '60',
    VITE_MAX_FILE_UPLOAD_SIZE: '10485760',
    VITE_ENCRYPTION_PASSWORD: 'change_this_in_production_' + Math.random().toString(36).substring(7),
    VITE_APP_SALT: 'change_this_in_production_' + Math.random().toString(36).substring(7),
    VITE_ANALYTICS_ENABLED: 'true',
    VITE_FEATURE_AI_RECOMMENDATIONS: 'true',
    VITE_FEATURE_ADVANCED_ANALYTICS: 'true',
    VITE_FEATURE_GAMIFICATION: 'true',
    VITE_DEV_MODE: 'false',
    VITE_LOG_LEVEL: 'error'
  };
  
  // Add defaults if not present
  for (const [key, value] of Object.entries(defaultValues)) {
    if (!newEnv[key]) {
      newEnv[key] = value;
    }
  }
  
  // Generate .env content
  let envContent = '# StudyFlow AI Environment Configuration\n';
  envContent += '# Generated by setup-env.js\n\n';
  
  envContent += '# Supabase Configuration\n';
  envContent += `VITE_SUPABASE_URL=${newEnv.VITE_SUPABASE_URL || ''}\n`;
  envContent += `VITE_SUPABASE_ANON_KEY=${newEnv.VITE_SUPABASE_ANON_KEY || ''}\n`;
  if (newEnv.SUPABASE_SERVICE_ROLE_KEY) {
    envContent += `SUPABASE_SERVICE_ROLE_KEY=${newEnv.SUPABASE_SERVICE_ROLE_KEY}\n`;
  }
  envContent += '\n';
  
  if (newEnv.OPENAI_API_KEY) {
    envContent += '# OpenAI Configuration (for Edge Functions)\n';
    envContent += `OPENAI_API_KEY=${newEnv.OPENAI_API_KEY}\n\n`;
  }
  
  if (newEnv.VITE_CLAUDE_API_KEY) {
    envContent += '# Claude AI Configuration (for AI Tutor)\n';
    envContent += `VITE_CLAUDE_API_KEY=${newEnv.VITE_CLAUDE_API_KEY}\n\n`;
  }
  
  if (newEnv.VITE_GEMINI_API_KEY) {
    envContent += '# Gemini AI Configuration (Default AI Tutor)\n';
    envContent += `VITE_GEMINI_API_KEY=${newEnv.VITE_GEMINI_API_KEY}\n\n`;
  }
  
  envContent += '# App Configuration\n';
  for (const [key, value] of Object.entries(defaultValues)) {
    if (key.startsWith('VITE_APP_')) {
      envContent += `${key}=${newEnv[key] || value}\n`;
    }
  }
  envContent += '\n';
  
  envContent += '# Security Configuration\n';
  envContent += `VITE_RATE_LIMIT_REQUESTS_PER_MINUTE=${newEnv.VITE_RATE_LIMIT_REQUESTS_PER_MINUTE || '60'}\n`;
  envContent += `VITE_MAX_FILE_UPLOAD_SIZE=${newEnv.VITE_MAX_FILE_UPLOAD_SIZE || '10485760'}\n`;
  envContent += `VITE_ENCRYPTION_PASSWORD=${newEnv.VITE_ENCRYPTION_PASSWORD || defaultValues.VITE_ENCRYPTION_PASSWORD}\n`;
  envContent += `VITE_APP_SALT=${newEnv.VITE_APP_SALT || defaultValues.VITE_APP_SALT}\n`;
  envContent += '\n';
  
  envContent += '# Analytics Configuration\n';
  envContent += `VITE_ANALYTICS_ENABLED=${newEnv.VITE_ANALYTICS_ENABLED || 'true'}\n\n`;
  
  envContent += '# Feature Flags\n';
  envContent += `VITE_FEATURE_AI_RECOMMENDATIONS=${newEnv.VITE_FEATURE_AI_RECOMMENDATIONS || 'true'}\n`;
  envContent += `VITE_FEATURE_ADVANCED_ANALYTICS=${newEnv.VITE_FEATURE_ADVANCED_ANALYTICS || 'true'}\n`;
  envContent += `VITE_FEATURE_GAMIFICATION=${newEnv.VITE_FEATURE_GAMIFICATION || 'true'}\n\n`;
  
  envContent += '# Development Configuration\n';
  envContent += `VITE_DEV_MODE=${newEnv.VITE_DEV_MODE || 'false'}\n`;
  envContent += `VITE_LOG_LEVEL=${newEnv.VITE_LOG_LEVEL || 'error'}\n`;
  
  // Write .env file
  await fs.writeFile(envPath, envContent);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Environment configuration complete!');
  console.log('='.repeat(60) + '\n');
  
  console.log('📄 Created: .env');
  console.log('\n🔒 Security Tips:');
  console.log('   • Never commit .env to version control');
  console.log('   • Keep your API keys secret');
  console.log('   • Rotate keys regularly');
  console.log('   • Use different keys for production\n');
  
  console.log('📚 Next Steps:');
  console.log('   1. Run: npm run dev');
  console.log('   2. Visit: http://localhost:5173');
  console.log('   3. Sign up and start studying!\n');
  
  if (!newEnv.VITE_GEMINI_API_KEY && !newEnv.VITE_CLAUDE_API_KEY && !newEnv.OPENAI_API_KEY) {
    console.log('⚠️  Warning: No AI API keys configured');
    console.log('   The AI Tutor feature will not work without at least one API key.');
    console.log('   Get a free Gemini API key at: https://makersuite.google.com/app/apikey\n');
  }
  
  rl.close();
}

setupEnv().catch(error => {
  console.error('❌ Error:', error);
  rl.close();
  process.exit(1);
});