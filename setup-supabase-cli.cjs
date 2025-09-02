/**
 * Supabase CLI Setup and Fix Script
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const PROJECT_REF = 'uuebhjidsaswvuexdcbb';
const SUPABASE_URL = 'https://uuebhjidsaswvuexdcbb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1ZWJoamlkc2Fzd3Z1ZXhkY2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODUxMzcsImV4cCI6MjA3MDE2MTEzN30.f9fhzG5xNbzXNch13tMMzwcTQStP67PA6wUl0vAFym0';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1ZWJoamlkc2Fzd3Z1ZXhkY2JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDU4NTEzNywiZXhwIjoyMDcwMTYxMTM3fQ.NN1zCTjF45_9wj_8SoOTQybABWjYTtARr8YnWsVt9bc';
const DEEPSEEK_API_KEY = 'sk-e4f1da719783415d84e3eee0e669b829';
const JWT_TOKEN = 'vuhdgo9g9gCs0uQXd1MNWvX1MiJMpBifZnXCDGt33rzljG5hEskCosI46mYWlG9pVqtxHqI/K/vKcyoXGKaKZw==';

async function runCommand(command, description) {
  console.log(`\n📌 ${description}...`);
  console.log(`   Command: ${command}`);
  try {
    const { stdout, stderr } = await execPromise(command);
    if (stdout) console.log('   ✅', stdout.trim());
    if (stderr && !stderr.includes('warning')) console.log('   ⚠️', stderr.trim());
    return true;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

async function checkSupabaseCLI() {
  console.log('🔍 Checking Supabase CLI installation...');
  try {
    const { stdout } = await execPromise('npx supabase --version');
    console.log('   ✅ Supabase CLI found:', stdout.trim());
    return true;
  } catch (error) {
    console.log('   ⚠️ Supabase CLI not found, will use npx');
    return false;
  }
}

async function createSupabaseConfig() {
  console.log('\n📝 Creating Supabase configuration...');
  
  // Create supabase directory if it doesn't exist
  const supabaseDir = path.join(process.cwd(), 'supabase');
  if (!fs.existsSync(supabaseDir)) {
    fs.mkdirSync(supabaseDir, { recursive: true });
    console.log('   ✅ Created supabase directory');
  }

  // Create config.toml
  const configContent = `# Supabase Project Configuration
project_id = "${PROJECT_REF}"

[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]

[auth]
enabled = true
site_url = "http://localhost:8080"
additional_redirect_urls = ["https://localhost:8080"]

[studio]
enabled = true
port = 54323

[functions]
enabled = true
`;

  fs.writeFileSync(path.join(supabaseDir, 'config.toml'), configContent);
  console.log('   ✅ Created config.toml');

  // Create .env.local for Supabase CLI
  const envContent = `SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
SUPABASE_ACCESS_TOKEN=${JWT_TOKEN}
`;

  fs.writeFileSync(path.join(supabaseDir, '.env.local'), envContent);
  console.log('   ✅ Created .env.local with JWT token');
}

async function createEdgeFunction() {
  console.log('\n📂 Creating Edge Function locally...');
  
  const functionsDir = path.join(process.cwd(), 'supabase', 'functions');
  const functionDir = path.join(functionsDir, 'deepseek-ai');
  
  // Create directories
  if (!fs.existsSync(functionDir)) {
    fs.mkdirSync(functionDir, { recursive: true });
  }

  // Create the standalone function
  const functionCode = `import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    // Get API key from environment or use default
    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY') || 'sk-e4f1da719783415d84e3eee0e669b829';
    
    // Parse request body
    const { prompt, messages, temperature = 0.7, max_tokens = 2000 } = await req.json();
    
    // Prepare messages for DeepSeek
    const chatMessages = messages || [{ role: 'user', content: prompt || 'Hello' }];
    
    console.log('Calling DeepSeek API...');
    
    // Call DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${DEEPSEEK_API_KEY}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: chatMessages,
        temperature: temperature,
        max_tokens: max_tokens,
        stream: false
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('DeepSeek API error:', error);
      
      return new Response(
        JSON.stringify({ 
          error: 'DeepSeek API error', 
          details: error 
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const data = await response.json();
    
    // Return successful response
    return new Response(
      JSON.stringify({
        provider: 'deepseek',
        model: 'deepseek-chat',
        content: data.choices[0].message.content,
        usage: data.usage
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Error in function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});`;

  fs.writeFileSync(path.join(functionDir, 'index.ts'), functionCode);
  console.log('   ✅ Created deepseek-ai function');
}

async function deployWithJWT() {
  console.log('\n🔐 Deploying with JWT token...');
  
  // Set environment variable for Supabase access
  process.env.SUPABASE_ACCESS_TOKEN = JWT_TOKEN;
  
  // Commands to run
  const commands = [
    {
      cmd: `npx supabase link --project-ref ${PROJECT_REF}`,
      desc: 'Linking to project'
    },
    {
      cmd: `npx supabase secrets set DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY} --project-ref ${PROJECT_REF}`,
      desc: 'Setting DeepSeek API key'
    },
    {
      cmd: `npx supabase secrets set VITE_DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY} --project-ref ${PROJECT_REF}`,
      desc: 'Setting VITE_DEEPSEEK_API_KEY'
    },
    {
      cmd: `npx supabase functions deploy deepseek-ai --project-ref ${PROJECT_REF} --no-verify-jwt`,
      desc: 'Deploying Edge Function'
    }
  ];
  
  for (const command of commands) {
    await runCommand(command.cmd, command.desc);
  }
}

async function main() {
  console.log('🚀 Supabase CLI Setup with JWT Authentication');
  console.log('==============================================\n');
  console.log('JWT Token:', JWT_TOKEN.substring(0, 20) + '...');
  console.log('Project:', PROJECT_REF);
  console.log('');
  
  // Check CLI installation
  await checkSupabaseCLI();
  
  // Create configuration
  await createSupabaseConfig();
  
  // Create Edge Function locally
  await createEdgeFunction();
  
  // Deploy with JWT
  await deployWithJWT();
  
  // Test URL
  console.log('\n🧪 Test the deployed function:');
  console.log('=====================================');
  console.log(`curl -X POST ${SUPABASE_URL}/functions/v1/deepseek-ai \\`);
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"prompt":"Hello, are you working?"}\'');
  
  console.log('\n✅ Setup complete!');
  console.log('\nThe function should now be available at:');
  console.log(`${SUPABASE_URL}/functions/v1/deepseek-ai`);
}

// Run the setup
main().catch(console.error);