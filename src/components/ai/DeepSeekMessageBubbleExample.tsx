/**
 * Example usage of DeepSeekMessageBubble component
 * This demonstrates how to integrate the component into chat interfaces
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeepSeekMessageBubble } from './DeepSeekMessageBubble';
import type { ChatMessage } from '@/features/ai-tutor/types';

const sampleMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'Can you explain how React hooks work?',
    sessionId: 'demo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    role: 'assistant',
    content: `# React Hooks Explained

React Hooks are **functions** that let you use state and other React features in functional components.

## Key Hooks

### useState
\`\`\`javascript
const [count, setCount] = useState(0);

function increment() {
  setCount(count + 1);
}
\`\`\`

### useEffect
\`\`\`javascript
useEffect(() => {
  document.title = \`Count: \${count}\`;
}, [count]);
\`\`\`

## Benefits

- **Simpler code**: No need for class components
- **Better reusability**: Custom hooks can be shared
- **Easier testing**: Functions are easier to test than classes

> **Note**: Hooks must be called at the top level of your component!

## Mathematical Example

The Fibonacci sequence can be calculated using hooks:

F(n) = F(n-1) + F(n-2)

Where F(0) = 0 and F(1) = 1.

This demonstrates how hooks can manage complex state calculations efficiently.`,
    sessionId: 'demo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    role: 'user',
    content: 'What about error handling in hooks?',
    sessionId: 'demo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    role: 'assistant',
    content: `# Error Handling in React Hooks

Error handling in hooks requires careful consideration of different scenarios.

## Error Boundaries

Error boundaries **cannot** catch errors in:
- Event handlers
- Asynchronous code (setTimeout, promises)
- Hooks themselves

## useErrorBoundary Pattern

\`\`\`javascript
function useErrorHandler() {
  const [error, setError] = useState(null);
  
  const resetError = () => setError(null);
  
  const captureError = (error) => {
    console.error('Captured error:', error);
    setError(error);
  };
  
  return { error, resetError, captureError };
}
\`\`\`

## Async Error Handling

\`\`\`javascript
function useAsyncOperation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const execute = async (operation) => {
    try {
      setLoading(true);
      setError(null);
      const result = await operation();
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { execute, loading, error };
}
\`\`\`

## Best Practices

1. **Always handle promise rejections**
2. **Use error boundaries for component errors**
3. **Implement retry mechanisms**
4. **Log errors for debugging**

| Error Type | Handling Method | Example |
|------------|----------------|---------|
| Sync errors | try/catch | Component rendering |
| Async errors | Promise.catch() | API calls |
| Event errors | Event handlers | User interactions |

Remember: **Prevention is better than cure!** 🛡️`,
    sessionId: 'demo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export function DeepSeekMessageBubbleExample() {
  const [showMetrics, setShowMetrics] = useState(false);
  const [enableFallback, setEnableFallback] = useState(true);

  const handleFeedback = (messageId: string, type: 'helpful' | 'not_helpful') => {
    console.log(`Feedback for message ${messageId}: ${type}`);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>DeepSeek Message Bubble Demo</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMetrics(!showMetrics)}
          >
            {showMetrics ? 'Hide' : 'Show'} Metrics
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEnableFallback(!enableFallback)}
          >
            Fallback: {enableFallback ? 'On' : 'Off'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 max-h-96 overflow-y-auto">
          {sampleMessages.map((message) => (
            <DeepSeekMessageBubble
              key={message.id}
              message={message}
              onFeedback={handleFeedback}
              showMetrics={showMetrics}
              enableFallback={enableFallback}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default DeepSeekMessageBubbleExample;