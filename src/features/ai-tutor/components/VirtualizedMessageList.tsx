/**
 * Virtualized Message List component for handling large chat histories efficiently
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { List, ListChildComponentProps } from 'react-window';
import { EnhancedMessageBubble } from './EnhancedMessageBubble';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '../types';

interface VirtualizedMessageListProps {
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
  showMetadata?: boolean;
  isDarkMode?: boolean;
  className?: string;
  autoScroll?: boolean;
  itemHeight?: number;
  overscan?: number;
}

// Estimated heights for different message types
const MESSAGE_HEIGHTS = {
  user: 120,
  assistant: 200,
  error: 150,
  thinking: 180,
} as const;

// Message item component for virtualization
const MessageItem = ({ index, style, data }: ListChildComponentProps) => {
  const {
    messages,
    isLoading,
    isThinking,
    thinkingState,
    onFeedback,
    onRetry,
    showMetadata,
    isDarkMode,
  } = data;

  const message = messages[index];
  if (!message) return null;

  return (
    <div style={style} className="px-4 py-2">
      <EnhancedMessageBubble
        message={message}
        isLoading={isLoading && index === messages.length - 1}
        isThinking={isThinking && index === messages.length - 1}
        thinkingState={thinkingState}
        onFeedback={onFeedback}
        onRetry={onRetry}
        showMetadata={showMetadata}
        isDarkMode={isDarkMode}
        index={index}
      />
    </div>
  );
};

// Hook for managing scroll behavior
const useScrollBehavior = (
  listRef: React.RefObject<List>,
  messages: ChatMessage[],
  autoScroll: boolean
) => {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const lastMessageCountRef = useRef(messages.length);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
      setIsAtBottom(true);
      setShowScrollToBottom(false);
    }
  }, [listRef, messages.length]);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0, 'start');
      setIsAtBottom(false);
      setShowScrollToTop(false);
    }
  }, [listRef]);

  // Handle scroll events
  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }: any) => {
    if (!listRef.current) return;

    const list = listRef.current;
    const containerHeight = list.props.height as number;
    const totalHeight = messages.length * (list.props.itemSize as number);
    const scrollBottom = scrollOffset + containerHeight;
    const threshold = 100; // pixels from bottom

    const atBottom = scrollBottom >= totalHeight - threshold;
    const atTop = scrollOffset <= threshold;

    setIsAtBottom(atBottom);
    setShowScrollToBottom(!atBottom && messages.length > 5);
    setShowScrollToTop(!atTop && messages.length > 5);
  }, [messages.length]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (autoScroll && messages.length > lastMessageCountRef.current && isAtBottom) {
      scrollToBottom();
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, autoScroll, isAtBottom, scrollToBottom]);

  return {
    isAtBottom,
    showScrollToBottom,
    showScrollToTop,
    scrollToBottom,
    scrollToTop,
    handleScroll,
  };
};

// Dynamic height calculation based on message content
const useMessageHeights = (messages: ChatMessage[]) => {
  return useMemo(() => {
    return messages.map((message) => {
      let baseHeight = MESSAGE_HEIGHTS[message.role] || MESSAGE_HEIGHTS.assistant;
      
      // Adjust height based on content length
      if (message.content) {
        const lines = message.content.split('\n').length;
        const codeBlocks = (message.content.match(/```/g) || []).length / 2;
        
        // Add height for long content
        if (lines > 5) {
          baseHeight += (lines - 5) * 20;
        }
        
        // Add height for code blocks
        if (codeBlocks > 0) {
          baseHeight += codeBlocks * 100;
        }
        
        // Add height for metadata if visible
        if (message.metadata && Object.keys(message.metadata).length > 0) {
          baseHeight += 40;
        }
      }
      
      return Math.min(baseHeight, 800); // Cap maximum height
    });
  }, [messages]);
};

export function VirtualizedMessageList({
  messages,
  isLoading = false,
  isThinking = false,
  thinkingState,
  onFeedback,
  onRetry,
  showMetadata = false,
  isDarkMode = false,
  className,
  autoScroll = true,
  itemHeight = 200,
  overscan = 5,
}: VirtualizedMessageListProps) {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);

  // Calculate dynamic heights for better virtualization
  const messageHeights = useMessageHeights(messages);
  const averageHeight = useMemo(() => {
    if (messageHeights.length === 0) return itemHeight;
    return messageHeights.reduce((sum, height) => sum + height, 0) / messageHeights.length;
  }, [messageHeights, itemHeight]);

  // Scroll behavior management
  const {
    isAtBottom,
    showScrollToBottom,
    showScrollToTop,
    scrollToBottom,
    scrollToTop,
    handleScroll,
  } = useScrollBehavior(listRef, messages, autoScroll);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(rect.height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Data for virtualized list
  const itemData = useMemo(() => ({
    messages,
    isLoading,
    isThinking,
    thinkingState,
    onFeedback,
    onRetry,
    showMetadata,
    isDarkMode,
  }), [
    messages,
    isLoading,
    isThinking,
    thinkingState,
    onFeedback,
    onRetry,
    showMetadata,
    isDarkMode,
  ]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Home') {
      event.preventDefault();
      scrollToTop();
    } else if (event.key === 'End') {
      event.preventDefault();
      scrollToBottom();
    }
  }, [scrollToTop, scrollToBottom]);

  if (messages.length === 0) {
    return (
      <div className={cn(
        "flex items-center justify-center h-full text-muted-foreground",
        className
      )}>
        <p>No messages yet. Start a conversation!</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn("relative h-full w-full", className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="log"
      aria-label="Chat messages"
    >
      {/* Virtualized List */}
      <List
        ref={listRef}
        height={containerHeight}
        itemCount={messages.length}
        itemSize={averageHeight}
        itemData={itemData}
        onScroll={handleScroll}
        overscanCount={overscan}
        className="scrollbar-thin scrollbar-thumb-border/60 scrollbar-track-transparent"
      >
        {MessageItem}
      </List>

      {/* Scroll Controls */}
      <div className="absolute right-4 bottom-4 flex flex-col gap-2">
        {/* Scroll to Top Button */}
        {showScrollToTop && (
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 rounded-full shadow-lg opacity-80 hover:opacity-100 transition-opacity"
            onClick={scrollToTop}
            aria-label="Scroll to top"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}

        {/* Scroll to Bottom Button */}
        {showScrollToBottom && (
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 rounded-full shadow-lg opacity-80 hover:opacity-100 transition-opacity"
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-1 text-xs text-muted-foreground">
            AI is thinking...
          </div>
        </div>
      )}

      {/* Message Count Indicator */}
      {messages.length > 10 && (
        <div className="absolute top-2 right-2">
          <div className="bg-background/90 backdrop-blur-sm border border-border rounded-full px-2 py-1 text-xs text-muted-foreground">
            {messages.length} messages
          </div>
        </div>
      )}
    </div>
  );
}

// Export a non-virtualized fallback for small message lists
export function SimpleMessageList({
  messages,
  isLoading,
  isThinking,
  thinkingState,
  onFeedback,
  onRetry,
  showMetadata,
  isDarkMode,
  className,
}: Omit<VirtualizedMessageListProps, 'autoScroll' | 'itemHeight' | 'overscan'>) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom for simple list
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className={cn("flex flex-col gap-4 p-4", className)}>
      {messages.map((message, index) => (
        <EnhancedMessageBubble
          key={message.id}
          message={message}
          isLoading={isLoading && index === messages.length - 1}
          isThinking={isThinking && index === messages.length - 1}
          thinkingState={thinkingState}
          onFeedback={onFeedback}
          onRetry={onRetry}
          showMetadata={showMetadata}
          isDarkMode={isDarkMode}
          index={index}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}