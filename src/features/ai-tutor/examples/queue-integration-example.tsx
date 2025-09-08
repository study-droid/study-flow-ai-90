/**
 * Request Queue Integration Example
 * Demonstrates how to use the request queue system in the AI tutor
 */

import React, { useState } from 'react';
import { useRequestQueue } from '../hooks/useRequestQueue';
import { QueueStatusIndicator } from '../components/QueueStatusIndicator';

export const QueueIntegrationExample: React.FC = () => {
  const [message, setMessage] = useState('');
  const [sessionId] = useState('example-session');
  const [responses, setResponses] = useState<string[]>([]);

  const {
    queueRequest,
    status,
    activeRequests,
    isQueueActive,
    isRateLimited,
    estimatedWaitTime,
    clearQueue,
    pauseQueue,
    resumeQueue,
    getQueueStats
  } = useRequestQueue({
    priority: 1,
    maxRetries: 3,
    onStatusChange: (newStatus) => {
      console.log('Queue status changed:', newStatus);
    }
  });

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      const response = await queueRequest(
        message,
        sessionId,
        {
          onEvent: (event) => {
            console.log('Queue event:', event);
          }
        },
        1 // priority
      );

      setResponses(prev => [...prev, `User: ${message}`, `AI: ${response.content}`]);
      setMessage('');
    } catch (error) {
      console.error('Request failed:', error);
      setResponses(prev => [...prev, `Error: ${error.message}`]);
    }
  };

  const stats = getQueueStats();

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold">Request Queue Integration Example</h2>
      
      {/* Queue Status Indicator */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Queue Status</h3>
        <QueueStatusIndicator showDetails={true} />
        
        {status && (
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>Queue Length: {status.queueLength}</div>
            <div>Processing: {status.processingCount}</div>
            <div>Rate Limited: {status.rateLimitActive ? 'Yes' : 'No'}</div>
            <div>Requests/Min: {status.requestsInLastMinute}</div>
          </div>
        )}
      </div>

      {/* Queue Statistics */}
      {stats && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Queue Statistics</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Total Queued: {stats.totalQueued}</div>
            <div>Processing: {stats.processing}</div>
            <div>Rate Limited: {stats.rateLimited ? 'Yes' : 'No'}</div>
            <div>Avg Wait Time: {Math.round(stats.averageWaitTime / 1000)}s</div>
          </div>
        </div>
      )}

      {/* Active Requests */}
      {activeRequests.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Active Requests</h3>
          {activeRequests.map((request, index) => (
            <div key={index} className="text-sm mb-2">
              <div>Session: {request.sessionId}</div>
              <div>Status: {request.isQueued ? 'Queued' : request.isLoading ? 'Processing' : 'Complete'}</div>
              {request.queuePosition > 0 && <div>Position: {request.queuePosition}</div>}
              {request.retryCount > 0 && <div>Retries: {request.retryCount}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Queue Controls */}
      <div className="flex space-x-2">
        <button
          onClick={clearQueue}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          disabled={!isQueueActive}
        >
          Clear Queue
        </button>
        <button
          onClick={pauseQueue}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Pause Queue
        </button>
        <button
          onClick={resumeQueue}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Resume Queue
        </button>
      </div>

      {/* Message Input */}
      <div className="space-y-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isRateLimited}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            Send
          </button>
        </div>

        {isRateLimited && (
          <div className="text-yellow-600 text-sm">
            Rate limited - estimated wait: {Math.round(estimatedWaitTime / 1000)}s
          </div>
        )}
      </div>

      {/* Response History */}
      <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-2">Conversation</h3>
        {responses.length === 0 ? (
          <p className="text-gray-500">No messages yet...</p>
        ) : (
          <div className="space-y-2">
            {responses.map((response, index) => (
              <div
                key={index}
                className={`p-2 rounded ${
                  response.startsWith('User:')
                    ? 'bg-blue-100 text-blue-800'
                    : response.startsWith('Error:')
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {response}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-100 p-4 rounded-lg text-sm">
        <h3 className="font-semibold mb-2">How to Use:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Type a message and click Send to queue a request</li>
          <li>Watch the queue status indicator for real-time updates</li>
          <li>Send multiple messages quickly to see rate limiting in action</li>
          <li>Use queue controls to manage the processing flow</li>
          <li>Observe retry behavior by temporarily disconnecting network</li>
        </ul>
      </div>
    </div>
  );
};

export default QueueIntegrationExample;