/**
 * Example usage of DeepSeek streaming components
 * Demonstrates real-time markdown processing and streaming display
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Play, Square, RotateCcw, Zap } from 'lucide-react';
import { DeepSeekStreamingMessageBubble } from './DeepSeekStreamingMessageBubble';
import { useDeepSeekStreaming } from '@/features/ai-tutor/hooks/useDeepSeekStreaming';
import type { ChatMessage } from '@/features/ai-tutor/types';
import type { StreamingChunk } from '@/services/ai/deepseek-streaming-processor';

// Sample streaming content that simulates a real DeepSeek response
const sampleStreamingContent = `# Understanding React Hooks

React Hooks are **functions** that let you use state and other React features in functional components.

## Key Benefits

### 1. Simplified State Management
\`\`\`javascript
const [count, setCount] = useState(0);

function increment() {
  setCount(prevCount => prevCount + 1);
}
\`\`\`

### 2. Effect Management
\`\`\`javascript
useEffect(() => {
  document.title = \`Count: \${count}\`;
  
  // Cleanup function
  return () => {
    document.title = 'React App';
  };
}, [count]);
\`\`\`

## Advanced Patterns

### Custom Hooks
Custom hooks allow you to **extract component logic** into reusable functions:

\`\`\`javascript
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  
  const increment = useCallback(() => {
    setCount(c => c + 1);
  }, []);
  
  const decrement = useCallback(() => {
    setCount(c => c - 1);
  }, []);
  
  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);
  
  return { count, increment, decrement, reset };
}
\`\`\`

### Performance Optimization

| Hook | Purpose | When to Use |
|------|---------|-------------|
| \`useMemo\` | Memoize expensive calculations | Heavy computations |
| \`useCallback\` | Memoize function references | Prevent unnecessary re-renders |
| \`React.memo\` | Memoize component renders | Pure components |

## Mathematical Concepts

The Fibonacci sequence demonstrates recursive patterns:

F(n) = F(n-1) + F(n-2)

Where F(0) = 0 and F(1) = 1.

This can be implemented efficiently with hooks:

\`\`\`javascript
function useFibonacci(n) {
  return useMemo(() => {
    if (n <= 1) return n;
    
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  }, [n]);
}
\`\`\`

## Best Practices

> **Important**: Always call hooks at the top level of your component!

1. **Use descriptive names** for custom hooks
2. **Extract complex logic** into custom hooks
3. **Optimize with useMemo and useCallback** when needed
4. **Test hooks independently** for better maintainability

Remember: Hooks make React development more **intuitive** and **powerful**! 🚀`;

export function DeepSeekStreamingExample() {
  const [customContent, setCustomContent] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [streamingSpeed, setStreamingSpeed] = useState(50); // ms between chunks

  // Streaming hook
  const [streamingState, streamingActions] = useDeepSeekStreaming({
    processIncrementally: true,
    enableDebouncing: true,
    debounceDelay: 100,
    onComplete: (response) => {
      console.log('Streaming completed:', response);
    },
    onError: (error) => {
      console.error('Streaming error:', error);
    },
    onProgress: (progress) => {
      console.log('Streaming progress:', progress);
    }
  });

  // Create streaming chunks from content
  const createStreamingChunks = useCallback((content: string): StreamingChunk[] => {
    const chunkSize = 15; // Characters per chunk
    const chunks: StreamingChunk[] = [];
    
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunkContent = content.slice(i, i + chunkSize);
      const isComplete = i + chunkSize >= content.length;
      
      chunks.push({
        content: chunkContent,
        isComplete,
        timestamp: Date.now() + (chunks.length * streamingSpeed),
        chunkIndex: chunks.length,
        totalChunks: Math.ceil(content.length / chunkSize)
      });
    }
    
    return chunks;
  }, [streamingSpeed]);

  // Start streaming simulation
  const startStreaming = useCallback(async () => {
    const content = isCustomMode ? customContent : sampleStreamingContent;
    if (!content.trim()) return;

    streamingActions.reset();
    streamingActions.startStreaming();

    const chunks = createStreamingChunks(content);
    
    // Simulate streaming by processing chunks with delays
    for (const chunk of chunks) {
      await new Promise(resolve => setTimeout(resolve, streamingSpeed));
      await streamingActions.processChunk(chunk);
    }
  }, [isCustomMode, customContent, streamingSpeed, streamingActions, createStreamingChunks]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    streamingActions.stopStreaming();
  }, [streamingActions]);

  // Reset streaming
  const resetStreaming = useCallback(() => {
    streamingActions.reset();
  }, [streamingActions]);

  // Create mock message for display
  const mockMessage: ChatMessage = {
    id: 'streaming-demo',
    role: 'assistant',
    content: streamingState.currentContent,
    sessionId: 'demo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            DeepSeek Streaming Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex items-center gap-4">
            <Button
              variant={!isCustomMode ? "default" : "outline"}
              onClick={() => setIsCustomMode(false)}
            >
              Sample Content
            </Button>
            <Button
              variant={isCustomMode ? "default" : "outline"}
              onClick={() => setIsCustomMode(true)}
            >
              Custom Content
            </Button>
          </div>

          {/* Custom Content Input */}
          {isCustomMode && (
            <Textarea
              placeholder="Enter your custom content to stream..."
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              className="min-h-32"
            />
          )}

          {/* Controls */}
          <div className="flex items-center gap-4">
            <Button
              onClick={startStreaming}
              disabled={streamingState.isStreaming || (isCustomMode && !customContent.trim())}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Streaming
            </Button>

            <Button
              variant="outline"
              onClick={stopStreaming}
              disabled={!streamingState.isStreaming}
              className="flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              Stop
            </Button>

            <Button
              variant="outline"
              onClick={resetStreaming}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>

            <div className="flex items-center gap-2">
              <label className="text-sm">Speed:</label>
              <input
                type="range"
                min="10"
                max="200"
                value={streamingSpeed}
                onChange={(e) => setStreamingSpeed(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">{streamingSpeed}ms</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMetrics(!showMetrics)}
            >
              {showMetrics ? 'Hide' : 'Show'} Metrics
            </Button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-4 text-sm">
            <Badge variant={streamingState.isStreaming ? "default" : "secondary"}>
              {streamingState.isStreaming ? 'Streaming' : 'Idle'}
            </Badge>
            
            {streamingState.isProcessing && (
              <Badge variant="outline">Processing</Badge>
            )}
            
            {streamingState.isComplete && (
              <Badge variant="outline" className="text-green-600">Complete</Badge>
            )}

            <span className="text-muted-foreground">
              Chunks: {streamingState.chunkCount}
            </span>

            <span className="text-muted-foreground">
              Length: {streamingState.currentContent.length}
            </span>
          </div>

          {/* Progress */}
          {streamingState.isStreaming && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(streamingState.progress)}%</span>
              </div>
              <Progress value={streamingState.progress} />
            </div>
          )}

          {/* Metrics */}
          {showMetrics && streamingState.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <div className="text-sm font-medium">Processing Time</div>
                <div className="text-lg">{Math.round(streamingState.metrics.processingTime)}ms</div>
              </div>
              <div>
                <div className="text-sm font-medium">Validation Time</div>
                <div className="text-lg">{Math.round(streamingState.metrics.validationTime)}ms</div>
              </div>
              <div>
                <div className="text-sm font-medium">Total Chunks</div>
                <div className="text-lg">{streamingState.metrics.totalChunks}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Error Count</div>
                <div className="text-lg">{streamingState.metrics.errorCount}</div>
              </div>
            </div>
          )}

          {/* Errors */}
          {streamingState.errors.length > 0 && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="font-medium text-destructive">Errors:</div>
              <ul className="text-sm text-destructive/80 mt-1">
                {streamingState.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {streamingState.warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="font-medium text-amber-800">Warnings:</div>
              <ul className="text-sm text-amber-700 mt-1">
                {streamingState.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Streaming Message Display */}
      <Card>
        <CardHeader>
          <CardTitle>Streaming Message Display</CardTitle>
        </CardHeader>
        <CardContent>
          <DeepSeekStreamingMessageBubble
            message={mockMessage}
            isStreaming={streamingState.isStreaming}
            showMetrics={showMetrics}
            showStreamingProgress={true}
            onStreamingComplete={(response) => {
              console.log('Message bubble streaming complete:', response);
            }}
            onStreamingError={(error) => {
              console.error('Message bubble streaming error:', error);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default DeepSeekStreamingExample;