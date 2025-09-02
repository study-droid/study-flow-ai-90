import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const apiKey = envVars.VITE_GEMINI_API_KEY;

console.log('🧪 Testing Gemini API Connection');
console.log('='.repeat(50));
console.log(`API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT FOUND'}`);

if (!apiKey || apiKey === 'your_gemini_api_key_here') {
  console.error('❌ Gemini API key not configured properly');
  console.log('Please set VITE_GEMINI_API_KEY in your .env file');
  process.exit(1);
}

async function testGeminiAPI() {
  try {
    console.log('\n📡 Initializing Gemini AI...');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try different models to see which one works
    const models = [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
      'gemini-1.0-pro'
    ];
    
    let workingModel = null;
    
    for (const modelName of models) {
      console.log(`\n🔄 Testing model: ${modelName}`);
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say "Hello, I am working!" in exactly 5 words.');
        const response = await result.response;
        const text = response.text();
        console.log(`✅ Model ${modelName} works!`);
        console.log(`   Response: ${text}`);
        workingModel = modelName;
        break;
      } catch (error) {
        console.log(`❌ Model ${modelName} failed: ${error.message}`);
      }
    }
    
    if (workingModel) {
      console.log('\n' + '='.repeat(50));
      console.log('🎉 SUCCESS! Gemini API is working');
      console.log(`✅ Working model: ${workingModel}`);
      console.log('\nRecommendation: Update your code to use:', workingModel);
    } else {
      console.log('\n' + '='.repeat(50));
      console.log('❌ No working models found');
      console.log('\nPossible issues:');
      console.log('1. API key might be invalid');
      console.log('2. API key might not have Gemini API enabled');
      console.log('3. Network/firewall blocking the connection');
      console.log('\nTo fix:');
      console.log('1. Go to https://makersuite.google.com/app/apikey');
      console.log('2. Create a new API key or verify your existing one');
      console.log('3. Make sure the Gemini API is enabled for your project');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('\nFull error:', error);
    
    if (error.message.includes('Failed to fetch')) {
      console.log('\n💡 Network Issue Detected');
      console.log('This could be due to:');
      console.log('- Internet connection problems');
      console.log('- Firewall blocking the API');
      console.log('- Proxy configuration issues');
    }
  }
}

// Run the test
testGeminiAPI().catch(console.error);