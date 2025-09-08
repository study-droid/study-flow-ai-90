/**
 * DeepSeek Message Bubble Component
 * Specialized message bubble for DeepSeek responses using ProfessionalResponseRenderer
 */

import React, { useState, useMemo } from 'react';
import { Bot, User, Copy, Check, ThumbsUp, ThumbsDown, Loader2, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ProfessionalResponseRenderer } from '@/components/ai-tutor/ProfessionalResponseRenderer';
import { AIThinkingBubble } from '@/features/ai-tutor/components/AIThinkingBubble';
import { validateDeepSeekResponse } from '@/services/ai/deepseek-validator';
import { MarkdownResponseProcessor } from '@/services/markdown-response-processor';
import { motivationalWordsService } from '@/features/ai-tutor/services/motivational-words.service';
import type { ChatMessage, ThinkingState } from '@/features/ai-tutor/types';
import type { DeepSeekValidationResult } from '@/services/ai/deepseek-validator';

interface DeepSeekMessageBubbleProps {
  message: ChatMessage;
  isLoading?: boolean;
  isThinking?: boolean;
  thinkingState?: ThinkingState;
  onFeedback?: (messageId: string, type: 'helpful' | 'not_helpful') => void;
  className?: string;
  showMetrics?: boolean;
  enableFallback?: boolean;
}

export function DeepSeekMessageBubble({
  message,
  isLoading = false,
  isThinking = false,
  thinkingState,
  onFeedback,
  className,
  showMetrics = false,
  enableFallback = true
}: DeepSeekMessageBubbleProps) {
  // State management
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'not_helpful' | null>(null);
  const [showRawContent, setShowRawContent] = useState(false);
  const [validationResult, setValidationResult] = useState<DeepSeekValidationResult | null>(null);

  // Get motivational word for the message
  const motivationalWord = useMemo(() => 
    motivationalWordsService.getWordForMessageRole(message.role),
    [message.role]
  );

  // Process DeepSeek response with validation and markdown processing
  const processedResponse = useMemo(() => {
    if (message.role !== 'assistant' || !message.content) {
      return null;
    }

    try {
      // First, process the markdown content
      const markdownProcessed = MarkdownResponseProcessor.processResponse(message.content);
      
      // Then validate the DeepSeek response
      const validation = validateDeepSeekResponse(
        message.content,
        markdownProcessed,
        {
          strictMode: false,
          requireEducationalContent: true,
          allowFallbacks: enableFallback
        }
      );

      // Store validation result for debugging/metrics
      setValidationResult(validation);

      return {
        structured: validation.processedResponse,
        validation,
        markdownProcessed
      };
    } catch (error) {
      console.error('DeepSeek response processing failed:', error);
      
      // Return fallback structure if processing fails
      if (enableFallback) {
        return {
          structured: null,
          validation: null,
          markdownProcessed: null,
          error: error instanceof Error ? error.message : 'Processing failed'
        };
      }
      
      return null;
    }
  }, [message.content, message.role, enableFallback]);

  // Determine if we should show thinking bubble
  const shouldShowThinking = (
    (isLoading || isThinking || thinkingState?.isVisible) && 
    message.role === 'assistant' && 
    !message.content
  );

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

  // Handle view toggle
  const handleToggleView = () => {
    setShowRawContent(!showRawContent);
  };

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
          {shouldShowThinking ? (
            <AIThinkingBubble
              content={thinkingState?.content || 'Processing your request with DeepSeek AI...'}
              stage={thinkingState?.stage || 'analyzing'}
              isVisible={true}
            />
          ) : message.type === 'error' ? (
            <div className="text-destructive">
              <p className="font-medium">DeepSeek Error</p>
              <p className="text-sm opacity-90">{message.content}</p>
            </div>
          ) : message.role === 'assistant' && processedResponse ? (
            <div className="space-y-3">
              {/* Professional Response Renderer for DeepSeek content */}
              {processedResponse.structured && !showRawContent ? (
                <ProfessionalResponseRenderer
                  result={processedResponse.structured}
                  color="purple" // DeepSeek brand color
                  fallbackContent={message.content}
                  showMetrics={showMetrics}
                  className="deepseek-response"
                />
              ) : (
                /* Fallback to simple markdown rendering */
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap font-mono text-sm bg-muted/30 p-3 rounded-lg">
                    {message.content}
                  </div>
                </div>
              )}

              {/* Processing Status */}
              {processedResponse.validation && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge 
                    variant={processedResponse.validation.isValid ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {processedResponse.validation.isValid ? 'Validated' : 'Fallback'}
                  </Badge>
                  
                  {processedResponse.validation.warnings.length > 0 && (
                    <span className="text-amber-600">
                      {processedResponse.validation.warnings.length} warning(s)
                    </span>
                  )}
                  
                  <span>
                    {Math.round(processedResponse.validation.validationMetrics.processingTime)}ms
                  </span>
                </div>
              )}

              {/* Error Display */}
              {processedResponse.error && (
                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                  Processing error: {processedResponse.error}
                </div>
              )}
            </div>
          ) : (
            /* User messages - simple text display */
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* Message Metadata */}
        <div className="flex items-center gap-2 mt-1 px-2">
          <span className="text-xs text-muted-foreground">
            {new Date((message.createdAt as unknown) as string | Date).toLocaleTimeString([], {
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

          {/* Quality Score */}
          {processedResponse?.validation && showMetrics && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                processedResponse.validation.qualityAssessment.overallScore >= 80 
                  ? "text-green-600" 
                  : processedResponse.validation.qualityAssessment.overallScore >= 60 
                    ? "text-yellow-600" 
                    : "text-red-600"
              )}
            >
              {processedResponse.validation.qualityAssessment.overallScore}%
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

          {/* View Toggle (Assistant only) */}
          {message.role === 'assistant' && processedResponse?.structured && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={handleToggleView}
            >
              {showRawContent ? 'Enhanced' : 'Raw'}
            </Button>
          )}

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