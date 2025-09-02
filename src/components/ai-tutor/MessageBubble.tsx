import React, { useState } from 'react';
import { Bot, User, Copy, Check, ThumbsUp, ThumbsDown, Bookmark, BookmarkCheck, Database, Sparkles, Award, Expand, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ProfessionalResponseRenderer } from '@/components/deepseek/ProfessionalResponseRenderer';
import { ProcessingResult } from '@/services/deepseek/post-processing-pipeline';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isBookmarked?: boolean;
  onBookmark?: () => void;
  onFeedback?: (type: 'helpful' | 'not_helpful') => void;
  className?: string;
  cached?: boolean;
  optimized?: boolean;
  qualityScore?: number;
  processingResult?: ProcessingResult;
  onProgressUpdate?: (taskId: string, completed: boolean) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  role,
  content,
  timestamp,
  isBookmarked = false,
  onBookmark,
  onFeedback,
  className,
  cached = false,
  optimized = false,
  qualityScore,
  processingResult,
  onProgressUpdate
}) => {
  // Ensure timestamp is a valid Date object
  const validTimestamp = timestamp instanceof Date && !isNaN(timestamp.getTime()) 
    ? timestamp 
    : new Date();
    
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'not_helpful' | null>(null);
  const [showProfessionalView, setShowProfessionalView] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  
  // Check if this is a professional response that should use enhanced rendering
  const isProfessionalResponse = role === 'assistant' && processingResult && 
    processingResult.qualityAssessment.overallScore >= 70;

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: 'helpful' | 'not_helpful') => {
    setFeedbackGiven(type);
    onFeedback?.(type);
  };

  const CodeBlock = ({ language, value }: { language?: string; value: string }) => {
    const [blockCopied, setBlockCopied] = useState(false);

    const handleCopyCode = async () => {
      await navigator.clipboard.writeText(value);
      setBlockCopied(true);
      setTimeout(() => setBlockCopied(false), 2000);
    };

    return (
      <div className="relative group my-2">
        <Button
          size="sm"
          variant="ghost"
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
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
    <div
      className={cn(
        'flex gap-3 animate-message-fade-in message-container',
        role === 'assistant' ? '' : 'justify-end',
        className
      )}
    >
      {role === 'assistant' && (
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      
      <div className={cn(
        "flex flex-col gap-1",
        role === 'assistant' ? 'max-w-[85%]' : 'max-w-[70%] ml-auto'
      )}>
        <div
          className={cn(
            'group relative overflow-hidden message-content',
            role === 'assistant'
              ? 'bg-muted p-5'
              : 'bg-primary text-primary-foreground p-4'
          )}
          style={{
            overflowWrap: 'break-word',
            wordWrap: 'break-word',
            wordBreak: 'break-word',
            borderRadius: role === 'assistant' ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
            marginBottom: '16px'
          }}
        >
          {/* Message Content */}
          {isProfessionalResponse && showProfessionalView && processingResult ? (
            <ProfessionalResponseRenderer
              result={processingResult}
              onProgressUpdate={onProgressUpdate}
              showMetadata={showMetadata}
              showQualityMetrics={true}
              className="-mx-4 -my-2" 
            />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none" style={{
              overflowWrap: 'break-word',
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {role === 'assistant' ? (
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
                        <code className="bg-muted-foreground/10 px-1 py-0.5 rounded text-sm" {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {content}
                </ReactMarkdown>
              ) : (
                <p className="whitespace-pre-wrap">{content}</p>
              )}
            </div>
          )}

          {/* Professional View Toggle (Assistant only) */}
          {isProfessionalResponse && (
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
              <Button
                size="sm"
                variant={showProfessionalView ? "default" : "outline"}
                onClick={() => setShowProfessionalView(!showProfessionalView)}
                className="h-7 text-xs"
              >
                {showProfessionalView ? (
                  <>
                    <Minimize className="h-3 w-3 mr-1" />
                    Simple View
                  </>
                ) : (
                  <>
                    <Expand className="h-3 w-3 mr-1" />
                    Professional View
                  </>
                )}
              </Button>
              {processingResult && (
                <Button
                  size="sm"
                  variant={showMetadata ? "default" : "ghost"}
                  onClick={() => setShowMetadata(!showMetadata)}
                  className="h-7 text-xs"
                >
                  Quality: {processingResult.qualityAssessment.overallScore}%
                </Button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Copy Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => handleCopy(content)}
                  >
                    {copied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? 'Copied!' : 'Copy message'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Bookmark Button */}
            {onBookmark && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={onBookmark}
                    >
                      {isBookmarked ? (
                        <BookmarkCheck className="h-3 w-3 text-primary" />
                      ) : (
                        <Bookmark className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isBookmarked ? 'Remove bookmark' : 'Bookmark message'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Feedback Buttons (Assistant only) */}
            {role === 'assistant' && onFeedback && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          'h-6 w-6 p-0',
                          feedbackGiven === 'helpful' && 'text-green-600'
                        )}
                        onClick={() => handleFeedback('helpful')}
                        disabled={feedbackGiven !== null}
                      >
                        <ThumbsUp className="h-3 w-3" />
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
                          'h-6 w-6 p-0',
                          feedbackGiven === 'not_helpful' && 'text-red-600'
                        )}
                        onClick={() => handleFeedback('not_helpful')}
                        disabled={feedbackGiven !== null}
                      >
                        <ThumbsDown className="h-3 w-3" />
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

        {/* Timestamp and Indicators */}
        <div className={cn(
          'flex items-center gap-2 px-2',
          role === 'user' && 'justify-end'
        )}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(validTimestamp, { addSuffix: true })}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{validTimestamp.toLocaleString()}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Status Indicators for Assistant Messages */}
          {role === 'assistant' && (
            <div className="flex items-center gap-1">
              {cached && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-green-600">
                        <Database className="h-3 w-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Response served from cache</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {optimized && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-primary">
                        <Sparkles className="h-3 w-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Response optimized by AI</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {qualityScore && qualityScore >= 85 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-yellow-600">
                        <Award className="h-3 w-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>High quality response (Score: {qualityScore})</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
      </div>

      {role === 'user' && (
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
};