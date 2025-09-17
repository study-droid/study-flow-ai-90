/**
 * Enhanced Chat Sheet Component - Simplified to remove errors
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Send, 
  Bot, 
  Settings, 
  MessageSquare, 
  Zap, 
  History, 
  Trash2, 
  Plus,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle,
  Brain,
  Sparkles,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { SmartMessageBubble } from './SmartMessageBubble';
import type { ChatMessage } from '@/features/ai-tutor/types';

interface EnhancedChatSheetProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function EnhancedChatSheet({
  isOpen = false,
  onOpenChange,
  className
}: EnhancedChatSheetProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      sessionId: 'default'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsThinking(true);

    try {
      // Simulate AI response
      setTimeout(() => {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I understand you're asking about: "${userMessage.content}". Here's a helpful response with some insights and recommendations.`,
          createdAt: new Date(),
          updatedAt: new Date(),
          sessionId: 'default'
        };

        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
        setIsThinking(false);
      }, 2000);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      setIsLoading(false);
      setIsThinking(false);
    }
  };

  const handleFeedback = (messageId: string, type: 'helpful' | 'not_helpful') => {
    toast({
      title: "Feedback Received",
      description: `Thank you for marking this response as ${type}`,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">AI Study Assistant</h3>
            <p className="text-sm text-muted-foreground">Get personalized help</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange?.(false)}
        >
          ✕
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Start a conversation</h3>
            <p className="text-sm text-muted-foreground">
              Ask me anything about your studies!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <SmartMessageBubble
              key={message.id}
              message={message}
              isLoading={isLoading && message.role === 'assistant' && !message.content}
              isThinking={isThinking && message.role === 'assistant' && !message.content}
              onFeedback={handleFeedback}
              showMetrics={false}
              className="mb-4"
            />
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your studies..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}