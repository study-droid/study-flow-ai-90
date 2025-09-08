/**
 * Enhanced Chat Sheet with DeepSeek Integration
 * Supports provider-specific message rendering and streaming
 */

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Brain, 
  Settings, 
  Zap,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { useAITutor } from "@/features/ai-tutor/hooks/useAITutor";
import { SmartMessageBubble } from "./SmartMessageBubble";
import { AIThinkingBubble } from "@/features/ai-tutor/components/AIThinkingBubble";
import { cn } from "@/lib/utils";

interface EnhancedChatSheetProps {
  className?: string;
  defaultProvider?: 'deepseek' | 'openai' | 'anthropic' | 'gemini' | 'auto';
  enableStreaming?: boolean;
  showMetrics?: boolean;
}

export function EnhancedChatSheet({ 
  className,
  defaultProvider = 'auto',
  enableStreaming = true,
  showMetrics = false
}: EnhancedChatSheetProps) {
  const {
    currentSession,
    isLoading,
    isThinking,
    error,
    thinkingState,
    createNewSession,
    sendMessage,
    canSendMessage,
  } = useAITutor();

  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(defaultProvider);
  const [streamingEnabled, setStreamingEnabled] = useState(enableStreaming);
  const [metricsEnabled, setMetricsEnabled] = useState(showMetrics);
  const [showSettings, setShowSettings] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize session when dialog opens
  useEffect(() => {
    if (isOpen && !currentSession) {
      createNewSession("Enhanced Chat Session");
    }
  }, [isOpen, currentSession, createNewSession]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [currentSession?.messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !canSendMessage) return;

    setInput("");
    
    try {
      await sendMessage(text);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFeedback = (messageId: string, type: 'helpful' | 'not_helpful') => {
    console.log(`Feedback for message ${messageId}: ${type}`);
    // TODO: Implement feedback storage
  };

  const handleStreamingComplete = (finalResponse: any) => {
    console.log('Streaming completed:', finalResponse);
    // TODO: Handle streaming completion
  };

  const handleStreamingError = (error: Error) => {
    console.error('Streaming error:', error);
    // TODO: Handle streaming errors
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'deepseek': return <Brain className="w-4 h-4" />;
      case 'openai': return <Bot className="w-4 h-4" />;
      case 'anthropic': return <Bot className="w-4 h-4" />;
      case 'gemini': return <Bot className="w-4 h-4" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'deepseek': return 'from-purple-500 to-blue-600';
      case 'openai': return 'from-green-500 to-teal-600';
      case 'anthropic': return 'from-orange-500 to-red-600';
      case 'gemini': return 'from-blue-500 to-indigo-600';
      default: return 'from-slate-500 to-gray-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className={cn(
            "fixed bottom-6 right-6 h-16 w-16 rounded-2xl",
            "bg-gradient-to-br from-slate-100 via-gray-50 to-slate-200",
            "hover:from-slate-200 hover:via-gray-100 hover:to-slate-300",
            "dark:from-slate-800 dark:via-gray-800 dark:to-slate-700",
            "dark:hover:from-slate-700 dark:hover:via-gray-700 dark:hover:to-slate-600",
            "shadow-xl hover:shadow-2xl",
            "border-2 border-slate-300/40 hover:border-slate-400/50",
            "dark:border-slate-600/40 dark:hover:border-slate-500/50",
            "transition-colors duration-200 ease-out",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "backdrop-blur-sm",
            className
          )}
          data-testid="enhanced-chat-trigger"
        >
          <div className="relative flex items-center justify-center">
            <div className={cn(
              "relative p-3 rounded-xl",
              "bg-gradient-to-br from-white/60 via-slate-50/40 to-gray-100/60",
              "dark:from-slate-700/60 dark:via-gray-700/40 dark:to-slate-600/60",
              "ring-1 ring-slate-200/50 dark:ring-slate-600/50",
              "shadow-inner"
            )}>
              <img 
                src="/ai_tutor.png" 
                alt="AI Assistant" 
                className={cn(
                  "h-8 w-8 rounded-lg object-cover",
                  "ring-1 ring-slate-300/30 dark:ring-slate-500/30",
                  "shadow-sm"
                )}
              />
            </div>
            
            {/* Enhanced status indicator */}
            <div className="absolute -top-1 -right-1">
              <div className={cn(
                "w-4 h-4 rounded-full",
                `bg-gradient-to-br ${getProviderColor(selectedProvider)}`,
                "ring-2 ring-white dark:ring-slate-800",
                "shadow-lg flex items-center justify-center"
              )}>
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>

            {/* Streaming indicator */}
            {streamingEnabled && (
              <div className="absolute -bottom-1 -left-1">
                <Zap className="w-3 h-3 text-yellow-500" />
              </div>
            )}
          </div>
        </Button>
      </DialogTrigger>
      
      <DialogContent 
        className="sm:max-w-2xl h-[600px] flex flex-col p-0"
        aria-describedby="enhanced-ai-chat-description"
      >
        <DialogHeader className="border-b border-border/50 px-6 py-4 bg-card/80 backdrop-blur-sm">
          <DialogTitle className="flex items-center gap-3">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              `bg-gradient-to-br ${getProviderColor(selectedProvider)}`
            )}>
              {getProviderIcon(selectedProvider)}
            </div>
            <div className="flex-1">
              <div className="font-semibold">Enhanced AI Study Assistant</div>
              <div 
                id="enhanced-ai-chat-description" 
                className="text-sm text-muted-foreground font-normal"
              >
                {selectedProvider === 'deepseek' ? 'Powered by DeepSeek AI' : 
                 selectedProvider === 'auto' ? 'Smart Provider Detection' :
                 `Powered by ${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} AI`} • Educational Tutor
              </div>
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-2">
              {isThinking && (
                <Badge variant="secondary">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Thinking...
                </Badge>
              )}
              
              {streamingEnabled && (
                <Badge variant="outline">
                  <Zap className="w-3 h-3 mr-1" />
                  Streaming
                </Badge>
              )}

              {metricsEnabled && (
                <Badge variant="outline">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Metrics
                </Badge>
              )}

              {/* Settings dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Chat Settings</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    AI Provider
                  </DropdownMenuLabel>
                  {['auto', 'deepseek', 'openai', 'anthropic', 'gemini'].map((provider) => (
                    <DropdownMenuItem
                      key={provider}
                      onClick={() => setSelectedProvider(provider as any)}
                      className={selectedProvider === provider ? 'bg-accent' : ''}
                    >
                      {getProviderIcon(provider)}
                      <span className="ml-2 capitalize">{provider}</span>
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  
                  <div className="px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="streaming-toggle" className="text-sm">Streaming</Label>
                      <Switch
                        id="streaming-toggle"
                        checked={streamingEnabled}
                        onCheckedChange={setStreamingEnabled}
                      />
                    </div>
                  </div>
                  
                  <div className="px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="metrics-toggle" className="text-sm">Show Metrics</Label>
                      <Switch
                        id="metrics-toggle"
                        checked={metricsEnabled}
                        onCheckedChange={setMetricsEnabled}
                      />
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea ref={scrollAreaRef} className="flex-1 px-6">
            <div className="space-y-4 py-4">
              {!currentSession?.messages?.length ? (
                <div className="text-center py-12">
                  <div className="flex justify-center mb-4">
                    <div className={cn(
                      "h-16 w-16 rounded-full flex items-center justify-center",
                      `bg-gradient-to-br ${getProviderColor(selectedProvider)}/10`
                    )}>
                      {getProviderIcon(selectedProvider)}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Welcome to your Enhanced AI Study Assistant!</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    I'm here to help you learn with advanced markdown rendering, streaming responses, and provider-specific optimizations.
                  </p>
                  
                  {selectedProvider === 'deepseek' && (
                    <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        🧠 DeepSeek AI provides enhanced mathematical reasoning and code analysis with real-time markdown processing.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {currentSession.messages.map((message) => (
                    <SmartMessageBubble
                      key={message.id}
                      message={message}
                      isLoading={isLoading && message.role === 'assistant' && !message.content}
                      isThinking={isThinking}
                      thinkingState={thinkingState}
                      onFeedback={handleFeedback}
                      aiProvider={selectedProvider}
                      isStreaming={streamingEnabled && isLoading}
                      showMetrics={metricsEnabled}
                      enableFallback={true}
                      showStreamingProgress={streamingEnabled}
                      onStreamingComplete={handleStreamingComplete}
                      onStreamingError={handleStreamingError}
                    />
                  ))}
                  
                  {/* Enhanced thinking bubble */}
                  {(isThinking || (isLoading && !currentSession.messages.some(m => m.role === 'assistant' && !m.content))) && (
                    <div className="flex justify-start">
                      <div className="flex items-start gap-3 max-w-[80%]">
                        <Avatar className="h-8 w-8 border border-border/50">
                          <AvatarImage src="/ai_tutor.png" alt="AI" />
                          <AvatarFallback className={cn(
                            `bg-gradient-to-br ${getProviderColor(selectedProvider)} text-white`
                          )}>
                            {getProviderIcon(selectedProvider)}
                          </AvatarFallback>
                        </Avatar>
                        <AIThinkingBubble
                          content={thinkingState?.content || 'Processing your request...'}
                          stage={thinkingState?.stage || 'analyzing'}
                          isVisible={true}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-border/50 p-4 bg-card/50 backdrop-blur-sm">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  placeholder={`Ask me anything about your studies... ${
                    selectedProvider === 'deepseek' ? '(Enhanced with DeepSeek AI)' : ''
                  }`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="min-h-[60px] max-h-32 resize-none pr-12"
                  disabled={!canSendMessage}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || !canSendMessage}
                size="lg"
                className={cn(
                  "h-[60px] w-[60px] rounded-lg",
                  `bg-gradient-to-br ${getProviderColor(selectedProvider)}`
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>

            {error && (
              <div className="mt-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}

            {/* Provider info */}
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Provider: {selectedProvider === 'auto' ? 'Auto-detect' : selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)}
              </span>
              <div className="flex items-center gap-2">
                {streamingEnabled && <span>Streaming enabled</span>}
                {metricsEnabled && <span>Metrics enabled</span>}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EnhancedChatSheet;