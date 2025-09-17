/**
 * DeepSeek Message Bubble Component
 * Simplified message bubble for DeepSeek responses
 */

import { useState, useMemo } from 'react';
import { User, Copy, Check, ThumbsUp, ThumbsDown, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ProfessionalResponseRenderer } from '@/components/ai-tutor/ProfessionalResponseRenderer';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'thinking' | 'error';
  createdAt: Date;
  sessionId: string;
}

interface DeepSeekMessageBubbleProps {
  message: ChatMessage;
  isLoading?: boolean;
  isThinking?: boolean;
  onFeedback?: (messageId: string, type: 'helpful' | 'not_helpful') => void;
  className?: string;
  showMetrics?: boolean;
}

export function DeepSeekMessageBubble({
  message,
  isLoading = false,
  isThinking = false,
  onFeedback,
  className,
  showMetrics = false
}: DeepSeekMessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'not_helpful' | null>(null);

  // Get motivational word for the message
  const motivationalWord = useMemo(() => {
    const words = {
      user: ['Curious', 'Thoughtful', 'Engaged', 'Smart'],
      assistant: ['Helpful', 'Insightful', 'Clear', 'Detailed']
    };
    const roleWords = words[message.role as 'user' | 'assistant'] || words.assistant;
    return roleWords[Math.floor(Math.random() * roleWords.length)];
  }, [message.role]);

  // Handle copy functionality
  const handleCopy = async () => {
    if (!message.content) return;
    
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  // Handle feedback
  const handleFeedback = (type: 'helpful' | 'not_helpful') => {
    setFeedbackGiven(type);
    onFeedback?.(message.id, type);
  };

  // Show thinking state
  if ((isLoading || isThinking) && message.role === 'assistant' && !message.content) {
    return (
      <div className={cn('flex gap-3 group justify-start', className)}>
        <Avatar className="h-8 w-8 border border-border/50 flex-shrink-0">
          <AvatarImage src="/ai_tutor.png" alt="DeepSeek AI" />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-white">
            <Brain className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col max-w-[85%] min-w-0 items-start">
          <div className="rounded-2xl px-4 py-3 shadow-sm border bg-card border-border/50">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full w-4 h-4 border-2 border-primary border-t-transparent"></div>
              <span className="text-sm text-muted-foreground">
                Processing your request with DeepSeek AI...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex gap-3 group',
      message.role === 'user' ? 'justify-end' : 'justify-start',
      className
    )}>
      {/* Avatar for assistant messages */}
      {message.role === 'assistant' && (
        <Avatar className="h-8 w-8 border border-border/50 flex-shrink-0">
          <AvatarImage src="/ai_tutor.png" alt="DeepSeek AI" />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-600 text-white">
            <Brain className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Content */}
      <div className={cn(
        'flex flex-col max-w-[85%] min-w-0',
        message.role === 'user' ? 'items-end' : 'items-start'
      )}>
        {/* Message Bubble */}
        <div className={cn(
          'rounded-2xl px-4 py-3 shadow-sm border',
          message.role === 'user' 
            ? 'bg-primary text-primary-foreground border-primary/20' 
            : 'bg-card border-border/50',
          message.type === 'error' && 'bg-destructive/10 border-destructive/20'
        )}>
          {/* Content Rendering */}
          {message.type === 'error' ? (
            <div className="text-destructive">
              <p className="font-medium">DeepSeek Error</p>
              <p className="text-sm opacity-90">{message.content}</p>
            </div>
          ) : message.role === 'assistant' ? (
            <div className="space-y-3">
              {/* Use ProfessionalResponseRenderer for AI responses */}
              <ProfessionalResponseRenderer
                response={{
                  content: message.content,
                  metadata: {
                    model_used: 'DeepSeek AI',
                    processing_time: 1500
                  }
                }}
                showMetadata={showMetrics}
                className="deepseek-response"
              />
            </div>
          ) : (
            /* User messages - simple text display */
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Message Metadata */}
        <div className="flex items-center gap-2 mt-1 px-2">
          <span className="text-xs text-muted-foreground">
            {message.createdAt.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          <Badge variant="secondary" className="text-xs">
            {motivationalWord}
          </Badge>

          {message.role === 'assistant' && (
            <Badge variant="outline" className="text-xs">
              DeepSeek AI
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Copy Button */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={handleCopy}
            disabled={!message.content}
          >
            {copied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>

          {/* Feedback Buttons (Assistant only) */}
          {message.role === 'assistant' && onFeedback && message.content && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  'h-8 w-8 p-0',
                  feedbackGiven === 'helpful' && 'text-green-600'
                )}
                onClick={() => handleFeedback('helpful')}
                disabled={feedbackGiven !== null}
              >
                <ThumbsUp className="w-3 h-3" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  'h-8 w-8 p-0',
                  feedbackGiven === 'not_helpful' && 'text-red-600'
                )}
                onClick={() => handleFeedback('not_helpful')}
                disabled={feedbackGiven !== null}
              >
                <ThumbsDown className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Avatar for user messages */}
      {message.role === 'user' && (
        <Avatar className="h-8 w-8 border border-border/50 flex-shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

export default DeepSeekMessageBubble;