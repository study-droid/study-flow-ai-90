/**
 * Enhanced Thinking Indicator Integration Example
 * Demonstrates how to use the enhanced thinking system in the AI tutor
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EnhancedThinkingIndicator } from '../components/EnhancedThinkingIndicator';
import { useEnhancedThinking } from '../hooks/useEnhancedThinking';
import { thinkingStateService } from '../services/thinking-state.service';

export function EnhancedThinkingExample() {
  const [message, setMessage] = useState('');
  const [currentStage, setCurrentStage] = useState<'analyzing' | 'reasoning' | 'responding'>('analyzing');
  const [messageHistory, setMessageHistory] = useState<Array<{ role: string; content: string }>>([]);

  const {
    thinkingState,
    isThinking,
    progress,
    startThinking,
    updateStage,
    updateProgress,
    stopThinking,
    analyzeMessage,
    getEstimatedDuration,
  } = useEnhancedThinking({
    autoProgress: true,
    onStageChange: (stage) => {
      console.log('Stage changed to:', stage);
      setCurrentStage(stage);
    },
    onProgressUpdate: (progress) => {
      console.log('Progress updated:', progress);
    },
    onComplete: () => {
      console.log('Thinking complete');
    }
  });

  const handleStartThinking = () => {
    if (!message.trim()) return;
    
    setMessageHistory(prev => [...prev, { role: 'user', content: message }]);
    startThinking(message, messageHistory);
    setMessage('');
  };

  const handleStageChange = (stage: 'analyzing' | 'reasoning' | 'responding') => {
    updateStage(stage);
    setCurrentStage(stage);
  };

  const handleProgressUpdate = (newProgress: number) => {
    updateProgress(newProgress);
  };

  const handleStopThinking = () => {
    stopThinking();
  };

  const messageContext = message ? analyzeMessage(message) : null;
  const estimatedDuration = getEstimatedDuration();

  // Example messages for testing different types and complexities
  const exampleMessages = [
    { text: 'What is AI?', type: 'Simple Question', complexity: 'Simple' },
    { text: 'How do neural networks learn from data?', type: 'Explanation', complexity: 'Moderate' },
    { text: 'Solve this calculus problem: ∫(2x³ + 5x² - 3x + 1)dx', type: 'Problem Solving', complexity: 'Complex' },
    { text: 'Derive the mathematical proof for backpropagation in deep neural networks and explain its computational complexity', type: 'Advanced Question', complexity: 'Advanced' },
    { text: 'Create a creative story about a robot learning emotions', type: 'Creative', complexity: 'Moderate' },
    { text: 'Define machine learning', type: 'Factual', complexity: 'Simple' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Thinking Indicator Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Message Input */}
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter a message to analyze..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleStartThinking()}
            />
            <Button onClick={handleStartThinking} disabled={!message.trim() || isThinking}>
              Start Thinking
            </Button>
          </div>

          {/* Example Messages */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Example Messages:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {exampleMessages.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage(example.text)}
                  className="text-left justify-start h-auto p-3"
                  disabled={isThinking}
                >
                  <div className="space-y-1">
                    <div className="text-sm">{example.text}</div>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {example.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {example.complexity}
                      </Badge>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Message Analysis */}
          {messageContext && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <h3 className="text-sm font-medium mb-2">Message Analysis:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Type:</span>
                    <Badge variant="secondary" className="ml-2">
                      {messageContext.messageType}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Complexity:</span>
                    <Badge variant="outline" className="ml-2">
                      {messageContext.complexity}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Subject:</span>
                    <Badge variant="outline" className="ml-2">
                      {messageContext.subject || 'General'}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span>
                    <span className="ml-2 text-muted-foreground">
                      ~{Math.ceil(estimatedDuration / 1000)}s
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Controls */}
          {isThinking && (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStageChange('analyzing')}
                disabled={currentStage === 'analyzing'}
              >
                Analyzing
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStageChange('reasoning')}
                disabled={currentStage === 'reasoning'}
              >
                Reasoning
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStageChange('responding')}
                disabled={currentStage === 'responding'}
              >
                Responding
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleProgressUpdate(Math.min(100, progress + 10))}
              >
                +10% Progress
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStopThinking}
              >
                Stop Thinking
              </Button>
            </div>
          )}

          {/* Status */}
          {isThinking && (
            <div className="text-sm text-muted-foreground">
              Status: {currentStage} • Progress: {Math.round(progress)}% • 
              Estimated: {Math.ceil(estimatedDuration / 1000)}s
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Thinking Indicator */}
      <div className="min-h-[200px] flex items-center justify-center border-2 border-dashed border-border rounded-lg">
        {isThinking && messageContext ? (
          <EnhancedThinkingIndicator
            isVisible={isThinking}
            stage={currentStage}
            messageContext={messageContext}
            progress={progress}
            onVisibilityChange={(visible) => {
              console.log('Visibility changed:', visible);
            }}
          />
        ) : (
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">Enhanced Thinking Indicator</p>
            <p className="text-sm">Enter a message and click "Start Thinking" to see the indicator in action</p>
          </div>
        )}
      </div>

      {/* Message History */}
      {messageHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Message History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {messageHistory.map((msg, index) => (
                <div key={index} className="flex gap-2 text-sm">
                  <Badge variant={msg.role === 'user' ? 'default' : 'secondary'}>
                    {msg.role}
                  </Badge>
                  <span>{msg.content}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Thinking State Debug */}
      {thinkingState && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Thinking State Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto">
              {JSON.stringify(thinkingState, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}