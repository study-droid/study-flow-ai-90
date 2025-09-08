/**
 * Message Interaction Panel - Enhanced metadata display and interaction features
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  MoreHorizontal, 
  Download, 
  Share2, 
  Bookmark, 
  BookmarkCheck,
  MessageSquare,
  Clock,
  Zap,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  TrendingUp,
  Eye,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ChatMessage, MessageMetadata } from '../types';

interface MessageInteractionPanelProps {
  message: ChatMessage;
  onBookmark?: (messageId: string) => void;
  onShare?: (messageId: string) => void;
  onExport?: (messageId: string, format: 'txt' | 'md' | 'json') => void;
  onViewSource?: (messageId: string) => void;
  isBookmarked?: boolean;
  className?: string;
}

// Performance metrics component
const PerformanceMetrics = ({ metadata }: { metadata: MessageMetadata }) => {
  const metrics = useMemo(() => {
    const items = [];
    
    if (metadata.processingTime) {
      const time = metadata.processingTime;
      const isGood = time < 2000;
      items.push({
        label: 'Response Time',
        value: time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(1)}s`,
        icon: Clock,
        color: isGood ? 'text-green-600' : time < 5000 ? 'text-yellow-600' : 'text-red-600',
        bgColor: isGood ? 'bg-green-50' : time < 5000 ? 'bg-yellow-50' : 'bg-red-50',
      });
    }
    
    if (metadata.tokens) {
      const tokens = metadata.tokens;
      const efficiency = tokens < 1000 ? 'high' : tokens < 2000 ? 'medium' : 'low';
      items.push({
        label: 'Tokens Used',
        value: tokens.toLocaleString(),
        icon: MessageSquare,
        color: efficiency === 'high' ? 'text-green-600' : efficiency === 'medium' ? 'text-yellow-600' : 'text-red-600',
        bgColor: efficiency === 'high' ? 'bg-green-50' : efficiency === 'medium' ? 'bg-yellow-50' : 'bg-red-50',
      });
    }
    
    if (metadata.retryCount && metadata.retryCount > 0) {
      items.push({
        label: 'Retry Attempts',
        value: metadata.retryCount.toString(),
        icon: RefreshCw,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
      });
    }
    
    return items;
  }, [metadata]);

  if (metrics.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        Performance Metrics
      </h4>
      <div className="grid grid-cols-1 gap-2">
        {metrics.map((metric, index) => (
          <div key={index} className={cn("flex items-center justify-between p-2 rounded-lg", metric.bgColor)}>
            <div className="flex items-center gap-2">
              <metric.icon className={cn("w-4 h-4", metric.color)} />
              <span className="text-sm font-medium">{metric.label}</span>
            </div>
            <Badge variant="outline" className={metric.color}>
              {metric.value}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};

// Quality indicators component
const QualityIndicators = ({ metadata }: { metadata: MessageMetadata }) => {
  const qualityScore = useMemo(() => {
    let score = 100;
    
    // Deduct points for fallback usage
    if (metadata.fallback) score -= 20;
    
    // Deduct points for retries
    if (metadata.retryCount && metadata.retryCount > 0) {
      score -= metadata.retryCount * 10;
    }
    
    // Deduct points for slow response
    if (metadata.processingTime && metadata.processingTime > 5000) {
      score -= 15;
    }
    
    // Deduct points for errors
    if (metadata.originalError) score -= 30;
    
    return Math.max(0, score);
  }, [metadata]);

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <CheckCircle className="w-4 h-4" />
        Response Quality
      </h4>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">Quality Score</span>
          <span className={cn("text-sm font-medium", getQualityColor(qualityScore))}>
            {qualityScore}% ({getQualityLabel(qualityScore)})
          </span>
        </div>
        <Progress value={qualityScore} className="h-2" />
        
        {/* Quality factors */}
        <div className="space-y-1 text-xs text-muted-foreground">
          {metadata.fallback && (
            <div className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-orange-500" />
              Used fallback service
            </div>
          )}
          {metadata.retryCount && metadata.retryCount > 0 && (
            <div className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3 text-yellow-500" />
              Required {metadata.retryCount} retry{metadata.retryCount > 1 ? 's' : ''}
            </div>
          )}
          {metadata.originalError && (
            <div className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-red-500" />
              Recovered from error
            </div>
          )}
          {!metadata.fallback && !metadata.retryCount && !metadata.originalError && (
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              Smooth processing
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Technical details component
const TechnicalDetails = ({ metadata }: { metadata: MessageMetadata }) => {
  const [showReasoning, setShowReasoning] = useState(false);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Info className="w-4 h-4" />
        Technical Details
      </h4>
      <div className="space-y-2 text-sm">
        {metadata.model && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Model:</span>
            <Badge variant="outline">{metadata.model}</Badge>
          </div>
        )}
        
        {metadata.temperature !== undefined && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Temperature:</span>
            <span>{metadata.temperature}</span>
          </div>
        )}
        
        {metadata.queuePosition && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Queue Position:</span>
            <span>#{metadata.queuePosition}</span>
          </div>
        )}
        
        {metadata.sources && metadata.sources.length > 0 && (
          <div>
            <span className="text-muted-foreground">Sources:</span>
            <div className="mt-1 space-y-1">
              {metadata.sources.map((source, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <ExternalLink className="w-3 h-3" />
                  <span className="truncate">{source}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {metadata.reasoning && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setShowReasoning(!showReasoning)}
            >
              <Eye className="w-3 h-3 mr-1" />
              {showReasoning ? 'Hide' : 'Show'} Reasoning
            </Button>
            {showReasoning && (
              <div className="mt-2 p-2 bg-muted/30 rounded text-xs max-h-32 overflow-y-auto">
                {metadata.reasoning}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export function MessageInteractionPanel({
  message,
  onBookmark,
  onShare,
  onExport,
  onViewSource,
  isBookmarked = false,
  className,
}: MessageInteractionPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message ID:', error);
    }
  }, [message.id]);

  const handleBookmark = useCallback(() => {
    onBookmark?.(message.id);
  }, [message.id, onBookmark]);

  const handleShare = useCallback(() => {
    onShare?.(message.id);
  }, [message.id, onShare]);

  const handleExport = useCallback((format: 'txt' | 'md' | 'json') => {
    onExport?.(message.id, format);
  }, [message.id, onExport]);

  const handleViewSource = useCallback(() => {
    onViewSource?.(message.id);
  }, [message.id, onViewSource]);

  const hasMetadata = message.metadata && Object.keys(message.metadata).length > 0;
  const hasPerformanceData = message.metadata && (
    message.metadata.processingTime || 
    message.metadata.tokens || 
    message.metadata.retryCount
  );

  return (
    <Card className={cn("w-80", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Message Details</CardTitle>
          <div className="flex items-center gap-1">
            {/* Bookmark Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={handleBookmark}
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isBookmarked ? 'Remove bookmark' : 'Bookmark message'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* More Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleViewSource}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Source
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('txt')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export as Text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('md')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCopyId}>
                  <Copy className="w-4 h-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy Message ID'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Role:</span>
            <Badge variant={message.role === 'user' ? 'default' : 'secondary'}>
              {message.role}
            </Badge>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Type:</span>
            <Badge variant="outline">
              {message.type || 'text'}
            </Badge>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Created:</span>
            <span className="text-xs">
              {new Date(message.createdAt as string | Date).toLocaleString()}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Length:</span>
            <span>{message.content.length} chars</span>
          </div>
        </div>

        {hasMetadata && (
          <>
            <Separator />
            
            {/* Performance Metrics */}
            {hasPerformanceData && message.metadata && (
              <>
                <PerformanceMetrics metadata={message.metadata} />
                <Separator />
              </>
            )}
            
            {/* Quality Indicators */}
            {message.role === 'assistant' && message.metadata && (
              <>
                <QualityIndicators metadata={message.metadata} />
                <Separator />
              </>
            )}
            
            {/* Technical Details */}
            <TechnicalDetails metadata={message.metadata} />
          </>
        )}

        {!hasMetadata && (
          <div className="text-center text-sm text-muted-foreground py-4">
            No additional metadata available
          </div>
        )}
      </CardContent>
    </Card>
  );
}