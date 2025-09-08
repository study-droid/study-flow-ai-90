/**
 * Enhanced Thinking Indicator Demo Page
 */

import { EnhancedThinkingExample } from '@/features/ai-tutor/examples/enhanced-thinking-example';

export function ThinkingDemo() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Enhanced Thinking Indicator Demo
          </h1>
          <p className="text-muted-foreground">
            Test the new intelligent thinking states with contextual messages and smooth animations
          </p>
        </div>
        
        <EnhancedThinkingExample />
      </div>
    </div>
  );
}