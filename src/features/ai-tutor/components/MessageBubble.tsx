/**
 * Streamlined MessageBubble component for AI Tutor
 */

import { useState } from 'react';
import { Bot, User, Copy, Check, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ChatMessage } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
  isLoading?: boolean;
  onFeedback?: (messageId: string, type: 'helpful' | 'not_helpful') => void;
  className?: string;
}

export function MessageBubble({ 
  message, 
  isLoading = false, 
  onFeedback, 
  className 
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'not_helpful' | null>(null);

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

  const handleFeedback = (type: 'helpful' | 'not_helpful') => {
    setFeedbackGiven(type);
    onFeedback?.(message.id, type);
  };

  const CodeBlock = ({ language, value }: { language?: string; value: string }) => {
    const [blockCopied, setBlockCopied] = useState(false);

    const handleCopyCode = async () => {
      try {
        await navigator.clipboard.writeText(value);
        setBlockCopied(true);
        setTimeout(() => setBlockCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy code:', error);
      }
    };

    return (
      <div className="relative group my-2">
        <Button
          size="sm"
          variant="ghost"
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={handleCopyCode}
        >
          {blockCopied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
        <SyntaxHighlighter
          language={language || 'text'}
          style={oneDark}
          customStyle={{
            borderRadius: '0.5rem',
            padding: '1rem',
            fontSize: '0.875rem'
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    );
  };

  return (
    <div className={cn(
      'message-bubble group',
      `message-bubble-${message.role}`,
      className
    )}>
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
            {isLoading && !message.content ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Preparing response...</span>
              </div>
            ) : message.type === 'error' ? (
              <div className="text-destructive">
                <p className="font-medium">Error occurred</p>
                <p className="text-sm opacity-90">{message.content}</p>
              </div>
            ) : message.role === 'assistant' ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    code: ({ node, inline, className, children, ...props }) => {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <CodeBlock
                          language={match[1]}
                          value={String(children).replace(/\n$/, '')}
                        />
                      ) : (
                        <code 
                          className="bg-muted/30 text-primary px-1.5 py-0.5 rounded text-sm font-mono" 
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>

          {/* Metadata */}
          <div className="message-metadata">
            <span className="message-timestamp">
              {new Date((message.createdAt as unknown) as string | Date).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>

            {message.metadata?.tokens && (
              <Badge variant="secondary" className="message-tokens">
                {message.metadata.tokens} tokens
              </Badge>
            )}

            {message.metadata?.model && (
              <Badge variant="outline" className="message-model">
                AI Tutor
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="message-actions">
            {/* Copy Button */}
            <Button
              size="sm"
              variant="ghost"
              className="action-btn"
              onClick={handleCopy}
              disabled={!message.content}
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>

            {/* Feedback Buttons (Assistant only) */}
            {message.role === 'assistant' && onFeedback && message.content && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    'action-btn',
                    feedbackGiven === 'helpful' && 'text-green-600'
                  )}
                  onClick={() => handleFeedback('helpful')}
                  disabled={feedbackGiven !== null}
                >
                  <ThumbsUp className="w-4 h-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    'action-btn',
                    feedbackGiven === 'not_helpful' && 'text-red-600'
                  )}
                  onClick={() => handleFeedback('not_helpful')}
                  disabled={feedbackGiven !== null}
                >
                  <ThumbsDown className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
