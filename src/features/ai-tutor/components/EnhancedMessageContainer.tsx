/**
 * Enhanced Message Container - Integrates all message rendering components
 */

import { useState, useCallback, useMemo } from 'react';
import { Settings, Eye, EyeOff, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { VirtualizedMessageList, SimpleMessageList } from './VirtualizedMessageList';
import { MessageInteractionPanel } from './MessageInteractionPanel';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '../types';

interface EnhancedMessageContainerProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  isThinking?: boolean;
  thinkingState?: {
    isVisible: boolean;
    content: string;
    stage: 'analyzing' | 'reasoning' | 'responding';
  };
  onFeedback?: (messageId: string, type: 'helpful' | 'not_helpful') => void;
  onRetry?: (messageId: string) => void;
  onBookmark?: (messageId: string) => void;
  onShare?: (messageId: string) => void;
  onExport?: (messageId: string, format: 'txt' | 'md' | 'json') => void;
  bookmarkedMessages?: Set<string>;
  className?: string;
  isDarkMode?: boolean;
}

// Settings panel for message display options
const MessageDisplaySettings = ({
  showMetadata,
  onShowMetadataChange,
  useVirtualization,
  onUseVirtualizationChange,
  autoScroll,
  onAutoScrollChange,
}: {
  showMetadata: boolean;
  onShowMetadataChange: (value: boolean) => void;
  useVirtualization: boolean;
  onUseVirtualizationChange: (value: boolean) => void;
  autoScroll: boolean;
  onAutoScrollChange: (value: boolean) => void;
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Label htmlFor="show-metadata" className="text-sm font-medium">
        Show Message Metadata
      </Label>
      <Switch
        id="show-metadata"
        checked={showMetadata}
        onCheckedChange={onShowMetadataChange}
      />
    </div>
    
    <div className="flex items-center justify-between">
      <Label htmlFor="use-virtualization" className="text-sm font-medium">
        Use Virtualization
      </Label>
      <Switch
        id="use-virtualization"
        checked={useVirtualization}
        onCheckedChange={onUseVirtualizationChange}
      />
    </div>
    
    <div className="flex items-center justify-between">
      <Label htmlFor="auto-scroll" className="text-sm font-medium">
        Auto-scroll to Bottom
      </Label>
      <Switch
        id="auto-scroll"
        checked={autoScroll}
        onCheckedChange={onAutoScrollChange}
      />
    </div>
    
    <Separator />
    
    <div className="text-xs text-muted-foreground space-y-1">
      <p><strong>Metadata:</strong> Shows processing time, tokens, and quality metrics</p>
      <p><strong>Virtualization:</strong> Improves performance for large chat histories (100+ messages)</p>
      <p><strong>Auto-scroll:</strong> Automatically scrolls to new messages</p>
    </div>
  </div>
);

// Message statistics component
const MessageStatistics = ({ messages }: { messages: ChatMessage[] }) => {
  const stats = useMemo(() => {
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    const errorMessages = messages.filter(m => m.type === 'error').length;
    
    const totalTokens = messages.reduce((sum, m) => sum + (m.metadata?.tokens || 0), 0);
    const avgProcessingTime = messages
      .filter(m => m.metadata?.processingTime)
      .reduce((sum, m, _, arr) => sum + (m.metadata!.processingTime! / arr.length), 0);
    
    const totalRetries = messages.reduce((sum, m) => sum + (m.metadata?.retryCount || 0), 0);
    const fallbackUsage = messages.filter(m => m.metadata?.fallback).length;
    
    return {
      userMessages,
      assistantMessages,
      errorMessages,
      totalTokens,
      avgProcessingTime,
      totalRetries,
      fallbackUsage,
    };
  }, [messages]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.userMessages}</div>
          <div className="text-xs text-muted-foreground">User Messages</div>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.assistantMessages}</div>
          <div className="text-xs text-muted-foreground">AI Responses</div>
        </div>
      </div>
      
      {stats.totalTokens > 0 && (
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-xl font-bold text-purple-600">{stats.totalTokens.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Total Tokens Used</div>
        </div>
      )}
      
      {stats.avgProcessingTime > 0 && (
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-xl font-bold text-orange-600">
            {stats.avgProcessingTime < 1000 
              ? `${Math.round(stats.avgProcessingTime)}ms`
              : `${(stats.avgProcessingTime / 1000).toFixed(1)}s`
            }
          </div>
          <div className="text-xs text-muted-foreground">Avg Response Time</div>
        </div>
      )}
      
      {(stats.errorMessages > 0 || stats.totalRetries > 0 || stats.fallbackUsage > 0) && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Reliability Metrics</h4>
            {stats.errorMessages > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Errors:</span>
                <span className="text-red-600">{stats.errorMessages}</span>
              </div>
            )}
            {stats.totalRetries > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Retries:</span>
                <span className="text-yellow-600">{stats.totalRetries}</span>
              </div>
            )}
            {stats.fallbackUsage > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fallback Usage:</span>
                <span className="text-orange-600">{stats.fallbackUsage}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export function EnhancedMessageContainer({
  messages,
  isLoading = false,
  isThinking = false,
  thinkingState,
  onFeedback,
  onRetry,
  onBookmark,
  onShare,
  onExport,
  bookmarkedMessages = new Set(),
  className,
  isDarkMode = false,
}: EnhancedMessageContainerProps) {
  // Display settings state
  const [showMetadata, setShowMetadata] = useState(false);
  const [useVirtualization, setUseVirtualization] = useState(messages.length > 50);
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);

  // Handle message interaction panel
  const handleViewSource = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setSelectedMessage(message);
    }
  }, [messages]);

  // Handle export functionality
  const handleExport = useCallback((messageId: string, format: 'txt' | 'md' | 'json') => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    let content = '';
    const timestamp = new Date(message.createdAt as string | Date).toLocaleString();
    
    switch (format) {
      case 'txt':
        content = `Message from ${message.role} (${timestamp})\n\n${message.content}`;
        break;
      case 'md':
        content = `# Message from ${message.role}\n\n**Timestamp:** ${timestamp}\n\n${message.content}`;
        break;
      case 'json':
        content = JSON.stringify(message, null, 2);
        break;
    }

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message-${message.id.slice(0, 8)}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onExport?.(messageId, format);
  }, [messages, onExport]);

  // Handle share functionality
  const handleShare = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Message from ${message.role}`,
          text: message.content,
        });
      } catch (error) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(message.content);
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(message.content);
    }

    onShare?.(messageId);
  }, [messages, onShare]);

  // Determine which component to use based on settings and message count
  const MessageListComponent = useVirtualization && messages.length > 20 
    ? VirtualizedMessageList 
    : SimpleMessageList;

  return (
    <div className={cn("relative h-full flex flex-col", className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
          {showMetadata && (
            <span className="text-xs text-muted-foreground">
              • Metadata visible
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Statistics Sheet */}
          {messages.length > 0 && (
            <Sheet>
              <SheetTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                  <BarChart3 className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Chat Statistics</SheetTitle>
                  <SheetDescription>
                    Performance and usage metrics for this conversation
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <MessageStatistics messages={messages} />
                </div>
              </SheetContent>
            </Sheet>
          )}

          {/* Settings Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                <Settings className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Display Settings</SheetTitle>
                <SheetDescription>
                  Customize how messages are displayed and rendered
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <MessageDisplaySettings
                  showMetadata={showMetadata}
                  onShowMetadataChange={setShowMetadata}
                  useVirtualization={useVirtualization}
                  onUseVirtualizationChange={setUseVirtualization}
                  autoScroll={autoScroll}
                  onAutoScrollChange={setAutoScroll}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Metadata Toggle */}
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-7 w-7 p-0",
              showMetadata && "bg-accent text-accent-foreground"
            )}
            onClick={() => setShowMetadata(!showMetadata)}
          >
            {showMetadata ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 min-h-0">
        <MessageListComponent
          messages={messages}
          isLoading={isLoading}
          isThinking={isThinking}
          thinkingState={thinkingState}
          onFeedback={onFeedback}
          onRetry={onRetry}
          showMetadata={showMetadata}
          isDarkMode={isDarkMode}
          autoScroll={autoScroll}
        />
      </div>

      {/* Message Interaction Panel */}
      {selectedMessage && (
        <Sheet open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
          <SheetContent side="right" className="w-96">
            <SheetHeader>
              <SheetTitle>Message Details</SheetTitle>
              <SheetDescription>
                Detailed information and actions for this message
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <MessageInteractionPanel
                message={selectedMessage}
                onBookmark={onBookmark}
                onShare={handleShare}
                onExport={handleExport}
                onViewSource={handleViewSource}
                isBookmarked={bookmarkedMessages.has(selectedMessage.id)}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}