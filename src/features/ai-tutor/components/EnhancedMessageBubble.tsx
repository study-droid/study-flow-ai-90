/**
 * Enhanced MessageBubble component with optimized rendering and syntax highlighting
 */

import { useState, memo, useCallback, useMemo } from 'react';
import { Bot, User, Copy, Check, ThumbsUp, ThumbsDown, Clock, Zap, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motivationalWordsService } from '../services/motivational-words.service';
import { AIThinkingBubble } from './AIThinkingBubble';
import type { ChatMessage } from '../types';

interface EnhancedMessageBubbleProps {
  message: ChatMessage;
  isLoading?: boolean;
  isThinking?: boolean;
  thinkingState?: {
    isVisible: boolean;
    content: string;
    stage: 'analyzing' | 'reasoning' | 'responding';
  };
  onFeedback?: (messageId: string, type: 'helpful' | 'not_helpful') => void;
  onRetry?: (messageId: string) => void;
  className?: string;
  showMetadata?: boolean;
  isDarkMode?: boolean;
  index?: number;
}

// Memoized code block component for better performance
const CodeBlock = memo(({ language, value, isDarkMode }: { language?: string; value: string; isDarkMode?: boolean }) => {
  const [blockCopied, setBlockCopied] = useState(false);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setBlockCopied(true);
      setTimeout(() => setBlockCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }, [value]);

  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-t-lg border-b border-border/30">
        <span className="text-xs font-medium text-muted-foreground">
          {language || 'text'}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopyCode}
        >
          {blockCopied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={isDarkMode ? oneDark : oneLight}
        customStyle={{
          margin: 0,
          borderRadius: '0 0 0.5rem 0.5rem',
          fontSize: '0.875rem',
          lineHeight: '1.5',
        }}
        showLineNumbers={value.split('\n').length > 5}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
});

CodeBlock.displayName = 'CodeBlock';

// Memoized metadata display component
const MessageMetadata = memo(({ 
  message, 
  showMetadata, 
  motivationalWord 
}: { 
  message: ChatMessage; 
  showMetadata: boolean; 
  motivationalWord: string;
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const formatTimestamp = useCallback((timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const formatProcessingTime = useCallback((time?: number) => {
    if (!time) return null;
    return time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(1)}s`;
  }, []);

  return (
    <div className="message-metadata">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="message-timestamp">
          {formatTimestamp(message.createdAt as string | Date)}
        </span>

        <Badge variant="secondary" className="message-tokens">
          {motivationalWord}
        </Badge>

        {message.metadata?.model && (
          <Badge variant="outline" className="message-model">
            {message.metadata.model}
          </Badge>
        )}

        {message.metadata?.processingTime && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatProcessingTime(message.metadata.processingTime)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Processing time</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {message.metadata?.retryCount && message.metadata.retryCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="flex items-center gap-1 text-yellow-600">
                  <RefreshCw className="w-3 h-3" />
                  {message.metadata.retryCount}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Retry attempts</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {message.metadata?.fallback && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="flex items-center gap-1 text-orange-600">
                  <Zap className="w-3 h-3" />
                  Fallback
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Used fallback service</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {showMetadata && message.metadata && (
          <Button
            size="sm"
            variant="ghost"
            className="h-5 w-5 p-0"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </Button>
        )}
      </div>

      {showDetails && showMetadata && message.metadata && (
        <div className="mt-2 p-2 bg-muted/30 rounded text-xs space-y-1">
          {message.metadata.tokens && (
            <div>Tokens: {message.metadata.tokens}</div>
          )}
          {message.metadata.temperature && (
            <div>Temperature: {message.metadata.temperature}</div>
          )}
          {message.metadata.queuePosition && (
            <div>Queue Position: {message.metadata.queuePosition}</div>
          )}
          {message.metadata.reasoning && (
            <div className="max-w-xs truncate">
              Reasoning: {message.metadata.reasoning}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

MessageMetadata.displayName = 'MessageMetadata';

export const EnhancedMessageBubble = memo<EnhancedMessageBubbleProps>(({ 
  message, 
  isLoading = false, 
  isThinking = false,
  thinkingState,
  onFeedback, 
  onRetry,
  className,
  showMetadata = false,
  isDarkMode = false,
  index = 0
}) => {
  // Enhanced thinking bubble visibility logic
  const shouldShowThinking = useMemo(() => (
    (isLoading || isThinking || thinkingState?.isVisible) && 
    message.role === 'assistant' && 
    !message.content
  ), [isLoading, isThinking, thinkingState?.isVisible, message.role, message.content]);

  // State hooks
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'not_helpful' | null>(null);
  
  // Memoized motivational word
  const motivationalWord = useMemo(() => 
    motivationalWordsService.getWordForMessageRole(message.role),
    [message.role]
  );

  // Optimized copy handler
  const handleCopy = useCallback(async () => {
    if (!message.content) return;
    
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }, [message.content]);

  // Optimized feedback handler
  const handleFeedback = useCallback((type: 'helpful' | 'not_helpful') => {
    setFeedbackGiven(type);
    onFeedback?.(message.id, type);
  }, [message.id, onFeedback]);

  // Optimized retry handler
  const handleRetry = useCallback(() => {
    onRetry?.(message.id);
  }, [message.id, onRetry]);

  // Memoized markdown components for better performance
  const markdownComponents = useMemo(() => ({
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <CodeBlock
          language={match[1]}
          value={String(children).replace(/\n$/, '')}
          isDarkMode={isDarkMode}
        />
      ) : (
        <code 
          className="bg-muted/30 text-primary px-1.5 py-0.5 rounded text-sm font-mono border border-border/30" 
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }: any) => children, // Let CodeBlock handle pre styling
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-3 bg-muted/20 py-2 rounded-r">
        {children}
      </blockquote>
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-3">
        <table className="min-w-full border border-border rounded-lg">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className="border border-border px-3 py-2 bg-muted/50 font-semibold text-left">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="border border-border px-3 py-2">
        {children}
      </td>
    ),
  }), [isDarkMode]);

  return (
    <div 
      className={cn(
        'message-bubble group',
        `message-bubble-${message.role}`,
        className
      )}
      style={{ 
        animationDelay: `${index * 50}ms` // Staggered animation for better UX
      }}
    >
      <div className="message-content">
        {/* Avatar */}
        <div className={cn(
          "message-avatar",
          message.role === 'user' 
            ? "message-avatar-user" 
            : "message-avatar-assistant"
        )}>
          {message.role === 'user' ? (
            <User className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </div>

        {/* Message Body */}
        <div className={cn(
          "message-body",
          `message-body-${message.role}`,
          message.type === 'error' && "message-body-error"
        )}>
          {/* Content */}
          <div className="message-text">
            {shouldShowThinking ? (
              <AIThinkingBubble
                content={thinkingState?.content || 'Working on your request...'}
                stage={thinkingState?.stage || 'analyzing'}
                isVisible={true}
              />
            ) : message.type === 'error' ? (
              <div className="text-destructive">
                <p className="font-medium">Error occurred</p>
                <p className="text-sm opacity-90">{message.content}</p>
              </div>
            ) : message.role === 'assistant' ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown components={markdownComponents}>
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            )}
          </div>

          {/* Enhanced Metadata */}
          <MessageMetadata 
            message={message}
            showMetadata={showMetadata}
            motivationalWord={motivationalWord}
          />

          {/* Enhanced Actions */}
          <div className="message-actions">
            {/* Copy Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="action-btn"
                    onClick={handleCopy}
                    disabled={!message.content}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? 'Copied!' : 'Copy message'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Retry Button (Assistant messages with errors) */}
            {message.role === 'assistant' && message.type === 'error' && onRetry && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="action-btn text-orange-600 hover:text-orange-700"
                      onClick={handleRetry}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Retry message</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Feedback Buttons (Assistant only) */}
            {message.role === 'assistant' && onFeedback && message.content && message.type !== 'error' && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          'action-btn',
                          feedbackGiven === 'helpful' && 'text-green-600 bg-green-50'
                        )}
                        onClick={() => handleFeedback('helpful')}
                        disabled={feedbackGiven !== null}
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Helpful</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          'action-btn',
                          feedbackGiven === 'not_helpful' && 'text-red-600 bg-red-50'
                        )}
                        onClick={() => handleFeedback('not_helpful')}
                        disabled={feedbackGiven !== null}
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Not helpful</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

EnhancedMessageBubble.displayName = 'EnhancedMessageBubble';