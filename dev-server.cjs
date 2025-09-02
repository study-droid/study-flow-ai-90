/**
 * Local Development Server for Testing AI Functions
 * Run with: node dev-server.js
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.DEV_SERVER_PORT || 3001;

// Middleware - Allow CORS from anywhere for development
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());

// Handle OPTIONS preflight requests explicitly
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.sendStatus(204);
  }
  next();
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Configuration
const API_KEYS = {
  openai: process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  claude: process.env.CLAUDE_API_KEY
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    configured: {
      openai: !!API_KEYS.openai,
      gemini: !!API_KEYS.gemini,
      claude: !!API_KEYS.claude
    }
  });
});

// Test API keys endpoint
app.get('/test-keys', (req, res) => {
  const keysStatus = {
    openai: {
      configured: !!API_KEYS.openai,
      length: API_KEYS.openai ? API_KEYS.openai.length : 0,
      preview: API_KEYS.openai ? `${API_KEYS.openai.substring(0, 10)}...` : 'NOT SET'
    },
    gemini: {
      configured: !!API_KEYS.gemini,
      length: API_KEYS.gemini ? API_KEYS.gemini.length : 0,
      preview: API_KEYS.gemini ? `${API_KEYS.gemini.substring(0, 10)}...` : 'NOT SET'
    },
    claude: {
      configured: !!API_KEYS.claude,
      length: API_KEYS.claude ? API_KEYS.claude.length : 0,
      preview: API_KEYS.claude ? `${API_KEYS.claude.substring(0, 10)}...` : 'NOT SET'
    }
  };
  res.json(keysStatus);
});

// GET handler for ai-proxy-secure (for testing)
app.get('/ai-proxy-secure', (req, res) => {
  res.json({
    message: 'AI Proxy Secure endpoint is working!',
    note: 'This endpoint requires POST requests with JSON data',
    example: {
      method: 'POST',
      body: {
        provider: 'openai',
        prompt: 'Your message here',
        temperature: 0.7,
        max_tokens: 2000
      }
    },
    status: 'ready'
  });
});

// Main AI proxy endpoint (matches production Edge Function)
app.post('/ai-proxy-secure', async (req, res) => {
  // Allow both authenticated and non-authenticated requests in dev
  console.log('Received AI proxy request');
  console.log('Headers:', req.headers);
  
  try {
    const { provider, prompt, model, temperature = 0.7, max_tokens = 2000 } = req.body;
    
    console.log(`Processing ${provider} request with model: ${model}`);
    
    // Check if API key exists
    const apiKey = API_KEYS[provider];
    if (!apiKey) {
      return res.status(400).json({ 
        error: `No API key configured for ${provider}`,
        hint: `Add ${provider.toUpperCase()}_API_KEY to your .env file`
      });
    }

    let response;
    
    switch (provider) {
      case 'openai':
        response = await callOpenAI(apiKey, prompt, model || 'gpt-3.5-turbo', temperature, max_tokens);
        break;
      case 'gemini':
        response = await callGemini(apiKey, prompt, model || 'gemini-1.5-flash', temperature, max_tokens);
        break;
      case 'claude':
        response = await callClaude(apiKey, prompt, model || 'claude-3-haiku-20240307', temperature, max_tokens);
        break;
      default:
        return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error in AI proxy:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: error.response?.data || error.toString()
    });
  }
});

// OpenAI API call (supports both OpenAI and OpenRouter)
async function callOpenAI(apiKey, prompt, model, temperature, maxTokens) {
  console.log('Calling OpenAI API...');
  
  // Check if it's an OpenRouter key
  const isOpenRouter = apiKey.startsWith('sk-or-');
  const apiUrl = isOpenRouter 
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  
  // Use OpenRouter model naming if needed
  const modelName = isOpenRouter ? `openai/${model}` : model;
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  
  // Add OpenRouter specific headers
  if (isOpenRouter) {
    headers['HTTP-Referer'] = 'http://localhost:8080';
    headers['X-Title'] = 'StudyFlow AI';
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelName,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  
  return {
    provider: 'openai',
    model: data.model || model,
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

// Gemini API call
async function callGemini(apiKey, prompt, model, temperature, maxTokens) {
  console.log('Calling Gemini API...');
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        }
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  
  return {
    provider: 'gemini',
    model,
    content: data.candidates[0].content.parts[0].text,
    usage: {
      prompt_tokens: data.usageMetadata?.promptTokenCount,
      completion_tokens: data.usageMetadata?.candidatesTokenCount,
      total_tokens: data.usageMetadata?.totalTokenCount,
    },
  };
}

// Claude API call
async function callClaude(apiKey, prompt, model, temperature, maxTokens) {
  console.log('Calling Claude API...');
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const data = await response.json();
  
  return {
    provider: 'claude',
    model,
    content: data.content[0].text,
    usage: data.usage,
  };
}

// Backward compatibility endpoint
app.post('/ai-proxy', async (req, res) => {
  // Redirect to the secure endpoint
  req.url = '/ai-proxy-secure';
  return app._router.handle(req, res);
});

// Interactive test endpoint
app.post('/test-ai', async (req, res) => {
  const { provider = 'gemini', message = 'Say hello!' } = req.body;
  
  try {
    const response = await fetch(`http://localhost:${PORT}/ai-proxy-secure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        prompt: message,
        temperature: 0.7,
        max_tokens: 100
      })
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║     AI Dev Server Running on Port ${PORT}     ║
╚════════════════════════════════════════════╝

Endpoints:
  GET  http://localhost:${PORT}/health              - Health check
  GET  http://localhost:${PORT}/test-keys           - Check API keys status
  POST http://localhost:${PORT}/ai-proxy-secure     - Main AI proxy endpoint (matches Supabase)
  POST http://localhost:${PORT}/ai-proxy            - Backward compatibility endpoint
  POST http://localhost:${PORT}/test-ai             - Quick test endpoint

Configured Providers:
  OpenAI: ${API_KEYS.openai ? '✅' : '❌'} ${API_KEYS.openai ? '(Key found)' : '(Add OPEN_AI_KEY to .env)'}
  Gemini: ${API_KEYS.gemini ? '✅' : '❌'} ${API_KEYS.gemini ? '(Key found)' : '(Add GEMINI_API_KEY to .env)'}
  Claude: ${API_KEYS.claude ? '✅' : '❌'} ${API_KEYS.claude ? '(Key found)' : '(Add CLAUDE_API_KEY to .env)'}

Press Ctrl+C to stop the server.
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down dev server...');
  process.exit(0);
});