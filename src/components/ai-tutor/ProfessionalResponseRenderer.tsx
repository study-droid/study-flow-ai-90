/**
 * Simple Professional Response Renderer
 * Simplified version to fix TypeScript errors while maintaining functionality
 */

import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface SimpleProfessionalResponse {
  content: string;
  metadata?: {
    confidence?: number;
    processing_time?: number;
    model_used?: string;
    tokens?: number;
  };
  thinking?: string;
  error?: string;
}

interface ProfessionalResponseRendererProps {
  response: SimpleProfessionalResponse;
  isLoading?: boolean;
  showMetadata?: boolean;
  showThinking?: boolean;
  className?: string;
}

export function ProfessionalResponseRenderer({
  response,
  isLoading = false,
  showMetadata = true,
  showThinking = false,
  className = ''
}: ProfessionalResponseRendererProps) {
  // Handle loading state
  if (isLoading) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse text-primary" />
            <CardTitle className="text-lg">Thinking...</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (response.error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Error:</strong> {response.error}
        </AlertDescription>
      </Alert>
    );
  }

  // Handle empty response
  if (!response.content) {
    return (
      <Alert className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No response generated. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <CardTitle className="text-lg">AI Response</CardTitle>
          </div>
          {response.metadata?.confidence && (
            <Badge variant="secondary" className="text-xs">
              Confidence: {Math.round(response.metadata.confidence * 100)}%
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Thinking Process */}
        {showThinking && response.thinking && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Brain className="h-4 w-4" />
              Thinking Process
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border-l-4 border-primary/30">
              <p className="text-sm text-muted-foreground italic">
                {response.thinking}
              </p>
            </div>
            <Separator className="my-4" />
          </div>
        )}

        {/* Main Content */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            components={{
              // Custom components for better styling
              h1: ({ children }) => (
                <h1 className="text-xl font-bold text-foreground mb-3">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-medium text-foreground mb-2">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-sm leading-relaxed text-foreground mb-3">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-4 space-y-1 text-sm text-foreground">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-4 space-y-1 text-sm text-foreground">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-sm text-foreground">{children}</li>
              ),
              code: ({ children, className }) => {
                const isInline = !className?.includes('language-');
                if (isInline) {
                  return (
                    <code className="px-1.5 py-0.5 bg-muted text-foreground rounded text-xs font-mono">
                      {children}
                    </code>
                  );
                }
                return (
                  <pre className="p-3 bg-muted rounded-lg overflow-x-auto">
                    <code className="text-sm font-mono text-foreground">
                      {children}
                    </code>
                  </pre>
                );
              },
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
                  {children}
                </blockquote>
              ),
            }}
          >
            {response.content}
          </ReactMarkdown>
        </div>

        {/* Metadata */}
        {showMetadata && response.metadata && (
          <>
            <Separator className="my-4" />
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {response.metadata.processing_time && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {response.metadata.processing_time}ms
                </div>
              )}
              
              {response.metadata.model_used && (
                <Badge variant="outline" className="text-xs">
                  {response.metadata.model_used}
                </Badge>
              )}
              
              {response.metadata.tokens && (
                <span className="text-xs">
                  {response.metadata.tokens} tokens
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ProfessionalResponseRenderer;