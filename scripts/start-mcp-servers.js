#!/usr/bin/env node

/**
 * MCP Server Startup Script
 * Starts MCP servers for all configured AI providers
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const MCP_SERVERS = {
  claude: {
    port: process.env.VITE_MCP_CLAUDE_PORT || 3001,
    apiKey: process.env.VITE_CLAUDE_API_KEY,
    package: '@modelcontextprotocol/server-claude'
  },
  openai: {
    port: process.env.VITE_MCP_OPENAI_PORT || 3002,
    apiKey: process.env.VITE_OPENAI_API_KEY,
    package: '@modelcontextprotocol/server-openai'
  },
  gemini: {
    port: process.env.VITE_MCP_GEMINI_PORT || 3003,
    apiKey: process.env.VITE_GEMINI_API_KEY,
    package: '@modelcontextprotocol/server-gemini'
  },
  perplexity: {
    port: process.env.VITE_MCP_PERPLEXITY_PORT || 3004,
    apiKey: process.env.VITE_PERPLEXITY_API_KEY,
    package: '@modelcontextprotocol/server-perplexity'
  }
};

const servers = [];

function startMCPServer(name, config) {
  if (!config.apiKey || config.apiKey === `your_${name}_api_key_here`) {
    console.log(`⏭️  Skipping ${name.toUpperCase()} MCP server - API key not configured`);
    return null;
  }

  console.log(`🚀 Starting ${name.toUpperCase()} MCP server on port ${config.port}...`);
  
  const server = spawn('npx', [
    '-y', 
    config.package, 
    '--port', 
    config.port.toString(),
    '--api-key', 
    config.apiKey
  ], {
    stdio: 'pipe',
    env: {
      ...process.env,
      [`${name.toUpperCase()}_API_KEY`]: config.apiKey
    }
  });

  server.stdout.on('data', (data) => {
    console.log(`[${name.toUpperCase()}] ${data.toString().trim()}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`[${name.toUpperCase()} ERROR] ${data.toString().trim()}`);
  });

  server.on('close', (code) => {
    console.log(`⛔ ${name.toUpperCase()} MCP server exited with code ${code}`);
  });

  server.on('error', (error) => {
    console.error(`❌ Failed to start ${name.toUpperCase()} MCP server:`, error.message);
  });

  return server;
}

function startAllServers() {
  console.log('🔧 Starting MCP servers for StudyFlow AI...\n');

  for (const [name, config] of Object.entries(MCP_SERVERS)) {
    const server = startMCPServer(name, config);
    if (server) {
      servers.push({ name, server });
    }
  }

  if (servers.length === 0) {
    console.log('❗ No MCP servers started. Please configure your API keys in the .env file.');
    process.exit(1);
  }

  console.log(`\n✅ Started ${servers.length} MCP server(s)`);
  console.log('📡 MCP servers are ready for connections from the StudyFlow AI application');
  console.log('\nPress Ctrl+C to stop all servers\n');
}

function stopAllServers() {
  console.log('\n🛑 Stopping all MCP servers...');
  servers.forEach(({ name, server }) => {
    server.kill('SIGTERM');
    console.log(`   Stopped ${name.toUpperCase()} server`);
  });
  console.log('👋 All MCP servers stopped');
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', stopAllServers);
process.on('SIGTERM', stopAllServers);

// Start the servers
startAllServers();