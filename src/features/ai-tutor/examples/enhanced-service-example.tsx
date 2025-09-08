/**
 * Enhanced AI Tutor Service Example
 * Demonstrates the new multi-provider AI service with intelligent routing
 */

import React, { useState, useCallback } from 'react';
import { aiTutorService } from '../services/ai-tutor.service';
import type { ChatEvent, ChatSession } from '../types';

export function EnhancedServiceExample() {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinking, setThinking] = useState('');
  const [serviceHealth, setServiceHealth] = useState(aiTutorService.getServiceHealth());
  const [availableProviders, setAvailableProviders] = useState(aiTutorService.getAvailableProviders());

  // Initialize session
  React.useEffect(() => {
    const newSession = aiTutorService.createSession('Enhanced Service Demo');
    setSession(newSession);
  }, []);

  // Refresh service status
  const refreshStatus = useCallback(() => {
    setServiceHealth(aiTutorService.getServiceHealth());
    setAvailableProviders(aiTutorService.getAvailableProviders());
  }, []);

  // Send message with enhanced service
  const sendMessage = useCallback(async () => {
    if (!session || !message.trim()) return;

    setIsLoading(true);
    setThinking('');

    const handleEvent = (event: ChatEvent) => {
      switch (event.type) {
        case 'thinking_start':
        case 'thinking_delta':
          setThinking(event.data.reasoning || 'Processing...');
          break;
        case 'thinking_stop':
          setThinking('');
          break;
        case 'message_delta':
          // Update UI with streaming content
          console.log('Streaming:', event.data.fullContent);
          break;
        case 'message_stop':
          console.log('Final response:', event.data.content);
          setIsLoading(false);
          break;
        case 'error':
          console.error('Error:', event.data.error);
          setIsLoading(false);
          break;
        case 'provider_switch':
          console.log('Provider switched:', event.data);
          refreshStatus();
          break;
      }
    };

    try {
      await aiTutorService.sendMessage(message, session.id, {
        model: 'deepseek-chat',
        temperature: 0.7,
        maxTokens: 1000,
        mode: 'chat',
        onEvent: handleEvent,
        priority: 0,
        useQueue: true
      });

      setMessage('');
      refreshStatus();
    } catch (error) {
      console.error('Send message error:', error);
      setIsLoading(false);
    }
  }, [session, message, refreshStatus]);

  // Switch provider
  const switchProvider = useCallback((providerId: string) => {
    const success = aiTutorService.switchProvider(providerId);
    if (success) {
      refreshStatus();
      console.log(`Switched to provider: ${providerId}`);
    } else {
      console.error(`Failed to switch to provider: ${providerId}`);
    }
  }, [refreshStatus]);

  // Reset services
  const resetServices = useCallback(() => {
    aiTutorService.resetServices();
    refreshStatus();
    console.log('Services reset');
  }, [refreshStatus]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Enhanced AI Tutor Service Demo</h1>
      
      {/* Service Health Status */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Service Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><strong>Overall Status:</strong> 
              <span className={`ml-2 px-2 py-1 rounded text-sm ${
                serviceHealth.overall === 'healthy' ? 'bg-green-100 text-green-800' :
                serviceHealth.overall === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {serviceHealth.overall}
              </span>
            </p>
            <p><strong>Total Requests:</strong> {serviceHealth.metrics.totalRequests}</p>
            <p><strong>Success Rate:</strong> {
              serviceHealth.metrics.totalRequests > 0 
                ? Math.round((serviceHealth.metrics.successfulRequests / serviceHealth.metrics.totalRequests) * 100)
                : 0
            }%</p>
          </div>
          <div>
            <p><strong>Avg Response Time:</strong> {Math.round(serviceHealth.metrics.averageResponseTime)}ms</p>
            <p><strong>Last Check:</strong> {serviceHealth.lastCheck.toLocaleTimeString()}</p>
            <button 
              onClick={refreshStatus}
              className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>

      {/* Available Providers */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Available Providers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableProviders.map((provider) => (
            <div key={provider.id} className="p-3 border rounded">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium">{provider.name}</h3>
                <span className={`px-2 py-1 rounded text-xs ${
                  provider.status === 'online' ? 'bg-green-100 text-green-800' :
                  provider.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {provider.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">Type: {provider.type}</p>
              <p className="text-sm text-gray-600 mb-2">Priority: {provider.priority}</p>
              <div className="mb-2">
                <p className="text-xs text-gray-500">Capabilities:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {provider.capabilities.map((cap) => (
                    <span key={cap} className="px-1 py-0.5 bg-gray-100 text-xs rounded">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => switchProvider(provider.id)}
                disabled={provider.status === 'offline'}
                className="w-full px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:bg-gray-300"
              >
                Switch to This Provider
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Message Interface */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Send Message</h2>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask the AI tutor a question..."
            className="flex-1 px-3 py-2 border rounded"
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !message.trim()}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
        
        {thinking && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded mb-3">
            <p className="text-sm text-blue-800">
              <span className="animate-pulse">🤔</span> {thinking}
            </p>
          </div>
        )}
      </div>

      {/* Session Info */}
      {session && (
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Current Session</h2>
          <p><strong>Title:</strong> {session.title}</p>
          <p><strong>Messages:</strong> {session.messages.length}</p>
          <p><strong>Created:</strong> {new Date(session.createdAt).toLocaleString()}</p>
          
          {session.messages.length > 0 && (
            <div className="mt-3">
              <h3 className="font-medium mb-2">Recent Messages:</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {session.messages.slice(-5).map((msg) => (
                  <div key={msg.id} className="p-2 bg-gray-50 rounded text-sm">
                    <strong>{msg.role}:</strong> {msg.content.substring(0, 100)}
                    {msg.content.length > 100 && '...'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Service Controls */}
      <div className="p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Service Controls</h2>
        <div className="flex gap-2">
          <button
            onClick={resetServices}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Reset All Services
          </button>
          <button
            onClick={() => {
              const stats = session ? aiTutorService.getSessionStats(session) : null;
              console.log('Session Stats:', stats);
              alert(stats ? JSON.stringify(stats, null, 2) : 'No session available');
            }}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Show Session Stats
          </button>
          <button
            onClick={() => {
              if (session) {
                const exported = aiTutorService.exportSession(session, 'json');
                console.log('Exported Session:', exported);
                // Create download
                const blob = new Blob([exported], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `session-${session.id}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
            disabled={!session}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:bg-gray-300"
          >
            Export Session
          </button>
        </div>
      </div>
    </div>
  );
}

export default EnhancedServiceExample;