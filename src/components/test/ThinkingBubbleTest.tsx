/**
 * Test component for AI Thinking Bubble
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AIThinkingBubble } from '@/features/ai-tutor/components/AIThinkingBubble';

export function ThinkingBubbleTest() {
  const [isVisible, setIsVisible] = useState(false);
  const [stage, setStage] = useState<'analyzing' | 'reasoning' | 'responding'>('analyzing');
  const [content, setContent] = useState('Testing the thinking bubble functionality...');

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const cycleStage = () => {
    const stages: Array<'analyzing' | 'reasoning' | 'responding'> = ['analyzing', 'reasoning', 'responding'];
    const currentIndex = stages.indexOf(stage);
    const nextIndex = (currentIndex + 1) % stages.length;
    setStage(stages[nextIndex]);
  };

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold">AI Thinking Bubble Test</h2>
      
      <div className="flex gap-2">
        <Button onClick={toggleVisibility}>
          {isVisible ? 'Hide' : 'Show'} Thinking Bubble
        </Button>
        <Button onClick={cycleStage} variant="outline">
          Stage: {stage}
        </Button>
      </div>

      <div className="border rounded-lg p-4 min-h-[200px]">
        {isVisible && (
          <AIThinkingBubble
            content={content}
            stage={stage}
            isVisible={isVisible}
          />
        )}
      </div>
    </div>
  );
}