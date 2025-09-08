/**
 * DeepSeek Streaming Message Bubble Component
 * Enhanced message bubble with real-time streaming support and markdown processing
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Bot, User, Copy, Check, ThumbsUp, ThumbsDown, Loader2, Brain, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ProfessionalResponseRenderer } from '@/components/ai-tutor/ProfessionalResponseRenderer';
import { AIThinkingBubble } from '@/features/ai-tutor/components/AIThinkingBubble';
import { 
  DeepSeekStreamingProcessor,
  createDeepSeekStreamingProcessor,
  type StreamingChunk,
  type StreamingState,
  type StreamingOptions,
  type StreamingCallbacks
} from '@/services/ai/deepseek-streaming-processor';
import { motivationalWordsService } from '@/features/ai-tutor/services/motivational-words.service';
import type { ChatMessage, ThinkingState } from '@/features/ai-tutor/types';
import type { ProcessedResponse } from '@/services/markdown-response-processor';
import type { DeepSeekValidationResult } from '@/services/ai/deepseek-validator';

interface DeepSeekStreamingMessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  streamingChunks?: StreamingChunk[];
  isLoading?: boolean;
  isThinking?: boolean;
  thinkingState?: ThinkingState;
  onFeedback?: (messageId: string, type: 'helpful' | 'not_helpful') => void;
  className?: string;
  showMetrics?: boolean;
  showStreamingProgress?: boolean;
  streamingOptions?: StreamingOptions;
  onStreamingComplete?: (finalResponse: any) => void;
  onStreamingError?: (error: Error) => void;
}

interface StreamingDisplayState {
  currentContent: string;
  processedContent?: ProcessedResponse;
  validationResult?: DeepSeekValidationResult;
  isProcessing: boolean;
  progress: number;
  chunkCount: number;
  errors: string[];
  warnings: string[];
}

export function DeepSeekStreamingMessageBubble({
  message,
  isStreaming = false,
  streamingChunks = [],
  isLoading = false,
  isThinking = false,
  thinkingState,
  onFeedback,
  className,
  showMetrics = false,
  showStreamingProgress = true,
  streamingOptions,
  onStreamingComplete,
  onStreamingError
}: DeepSeekStreamingMessageBubbleProps) {
  // State management
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'not_helpful' | null>(null);
  const [showRawContent, setShowRawContent] = useState(false);
  const [streamingState, setStreamingState] = useState<StreamingDisplayState>({
    currentContent: message.content || '',
    isProcessing: false,
    progress: 0,
    chunkCount: 0,
    errors: [],
    warnings: []
  });

  // Refs
  const processorRef = useRef<DeepSeekStreamingProcessor | null>(null);
  const isInitializedRef = useRef(false);

  // Get motivational word
  const motivationalWord = useMemo(() => 
    motivationalWordsService.getWordForMessageRole(message.role),
    [message.role]
  );

  // Initialize streaming processor
  useEffect(() => {
    if (isStreaming && message.role === 'assistant' && !isInitializedRef.current) {
      isInitializedRef.current = true;

      const callbacks: StreamingCallbacks = {
        onChunk: (chunk, state) => {
          setStreamingState(prev => ({
            ...prev,
            currentContent: state.accumulatedContent,
            chunkCount: state.chunkCount,
            progress: chunk.isComplete ? 100 : Math.min(95, (state.chunkCount / 10) * 100)
          }));
        },
        
        onProcessed: (processed, state) => {
          setStreamingState(prev => ({
            ...prev,
            processedContent: processed,
            isProcessing: false
          }));
        },
        
        onValidated: (validation, state) => {
          setStreamingState(prev => ({
            ...prev,
            validationResult: validation,
            warnings: [...prev.warnings, ...validation.warnings]
          }));
        },
        
        onError: (error, state) => {
          setStreamingState(prev => ({
            ...prev,
            errors: [...prev.errors, error.message],
            isProcessing: false
          }));
          onStreamingError?.(error);
        },
        
        onComplete: (finalState) => {
          setStreamingState(prev => ({
            ...prev,
            progress: 100,
            isProcessing: false
          }));
          
          const finalResponse = processorRef.current?.getFinalResponse();
          if (finalResponse) {
            onStreamingComplete?.(finalResponse);
          }
        },
        
        onStateChange: (state) => {
          setStreamingState(prev => ({
            ...prev,
            isProcessing: state.isProcessing,
            warnings: state.warnings,
            errors: state.errors
          }));
        }
      };

      processorRef.current = createDeepSeekStreamingProcessor(streamingOptions, callbacks);
    }

    return () => {
      if (processorRef.current) {
        processorRef.current.dispose();
        processorRef.current = null;
      }
    };
  }, [isStreaming, message.role, streamingOptions, onStreamingComplete, onStreamingError]);

  // Process streaming chunks
  useEffect(() => {
    if (isStreaming && processorRef.current && streamingChunks.length > 0) {
      const processChunks = async () => {
        for (const chunk of streamingChunks) {
          if (processorRef.current) {
            await processorRef.current.processChunk(chunk);
          }
        }
      };

      processChunks().catch(error => {
        console.error('Error processing streaming chunks:', error);
        onStreamingError?.(error);
      });
    }
  }, [streamingChunks, isStreaming, onStreamingError]);

  // Determine content to display
  const displayContent = isStreaming ? streamingState.currentContent : message.content;
  const displayProcessed = isStreaming ? streamingState.processedContent : null;
  const displayValidation = isStreaming ? streamingState.validationResult : null;

  // Determine if we should show thinking bubble
  const shouldShowThinking = (
    (isLoading || isThinking || thinkingState?.isVisible) && 
    message.role === 'assistant' && 
    !displayContent
  );

  // Handle copy functionality
  const handleCopy = async () => {
    if (!displayContent) return;
    
    try {
      await navigator.clipboard.writeText(displayContent);
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
        {/* Streaming Progress */}
        {isStreaming && showStreamingProgress && message.role === 'assistant' && (
          <div className="w-full mb-2 space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="w-3 h-3 animate-pulse" />
              <span>Streaming response...</span>
              <Badge variant="secondary" className="text-xs">
                {streamingState.chunkCount} chunks
              </Badge>
            </div>
            <Progress 
              value={streamingState.progress} 
              className="h-1"
            />
          </div>
        )}

        {/* Message Bubble */}
        <div className={cn(
          'rounded-2xl px-4 py-3 shadow-sm border',
          message.role === 'user' 
            ? 'bg-primary text-primary-foreground border-primary/20' 
            : 'bg-card border-border/50',
          message.type === 'error' && 'bg-destructive/10 border-destructive/20',
          isStreaming && 'animate-pulse'
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
              <p className="text-sm opacity-90">{displayContent}</p>
            </div>
          ) : message.role === 'assistant' && displayContent ? (
            <div className="space-y-3">
              {/* Professional Response Renderer for processed content */}
              {displayProcessed && displayValidation?.processedResponse && !showRawContent ? (
                <ProfessionalResponseRenderer
                  result={displayValidation.processedResponse}
                  color="purple" // DeepSeek brand color
                  fallbackContent={displayContent}
                  showMetrics={showMetrics}
                  className="deepseek-streaming-response"
                />
              ) : (
                /* Streaming markdown display */
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap">
                    {displayContent}
                    {isStreaming && streamingState.isProcessing && (
                      <span className="inline-flex items-center ml-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Streaming Status */}
              {isStreaming && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {streamingState.isProcessing && (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Processing...</span>
                    </>
                  )}
                  
                  {displayValidation && (
                    <Badge 
                      variant={displayValidation.isValid ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {displayValidation.isValid ? 'Validated' : 'Processing'}
                    </Badge>
                  )}
                  
                  {streamingState.warnings.length > 0 && (
                    <span className="text-amber-600">
                      {streamingState.warnings.length} warning(s)
                    </span>
                  )}
                  
                  {displayValidation && (
                    <span>
                      {Math.round(displayValidation.validationMetrics.processingTime)}ms
                    </span>
                  )}
                </div>
              )}

              {/* Error Display */}
              {streamingState.errors.length > 0 && (
                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                  Streaming errors: {streamingState.errors.join(', ')}
                </div>
              )}
            </div>
          ) : (
            /* User messages - simple text display */
            <p className="whitespace-pre-wrap">{displayContent}</p>
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
              DeepSeek AI {isStreaming ? '⚡' : ''}
            </Badge>
          )}

          {/* Quality Score */}
          {displayValidation && showMetrics && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                displayValidation.qualityAssessment.overallScore >= 80 
                  ? "text-green-600" 
                  : displayValidation.qualityAssessment.overallScore >= 60 
                    ? "text-yellow-600" 
                    : "text-red-600"
              )}
            >
              {displayValidation.qualityAssessment.overallScore}%
            </Badge>
          )}

          {/* Streaming Metrics */}
          {isStreaming && showMetrics && (
            <Badge variant="outline" className="text-xs">
              {streamingState.chunkCount} chunks
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
            disabled={!displayContent}
          >
            {copied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>

          {/* View Toggle (Assistant only) */}
          {message.role === 'assistant' && displayProcessed && displayValidation?.processedResponse && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={handleToggleView}
            >
              {showRawContent ? 'Enhanced' : 'Raw'}
            </Button>
          )}

          {/* Feedback Buttons (Assistant only, not while streaming) */}
          {message.role === 'assistant' && onFeedback && displayContent && !isStreaming && (
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

export default DeepSeekStreamingMessageBubble;