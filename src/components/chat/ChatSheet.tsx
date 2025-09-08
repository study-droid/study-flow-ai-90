import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Bot, User, Loader2, Brain } from "lucide-react";
import { useAITutor } from "@/features/ai-tutor/hooks/useAITutor";
import { MessageBubble } from "@/features/ai-tutor/components/MessageBubble";
import { AIThinkingBubble } from "@/features/ai-tutor/components/AIThinkingBubble";
import { cn } from "@/lib/utils";

export function ChatSheet({ className }: { className?: string }) {
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize session when dialog opens
  useEffect(() => {
    if (isOpen && !currentSession) {
      createNewSession("Chat Session");
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
          data-testid="chat-trigger"
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
            
            {/* Status indicator */}
            <div className="absolute -top-1 -right-1">
              <div className={cn(
                "w-4 h-4 rounded-full",
                "bg-gradient-to-br from-emerald-400 to-emerald-500",
                "ring-2 ring-white dark:ring-slate-800",
                "shadow-lg flex items-center justify-center"
              )}>
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </Button>
      </DialogTrigger>
      
      <DialogContent 
        className="sm:max-w-2xl h-[600px] flex flex-col p-0"
        aria-describedby="ai-chat-description"
      >
        <DialogHeader className="border-b border-border/50 px-6 py-4 bg-card/80 backdrop-blur-sm">
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-semibold">AI Study Assistant</div>
              <div 
                id="ai-chat-description" 
                className="text-sm text-muted-foreground font-normal"
              >
                Powered by DeepSeek AI • Educational Tutor
              </div>
            </div>
            {isThinking && (
              <Badge variant="secondary" className="ml-auto">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Thinking...
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea ref={scrollAreaRef} className="flex-1 px-6">
            <div className="space-y-4 py-4">
              {!currentSession?.messages?.length ? (
                <div className="text-center py-12">
                  <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Brain className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Welcome to your AI Study Assistant!</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    I'm here to help you learn, solve problems, create quizzes, and provide study guidance.
                  </p>
                </div>
              ) : (
                <>
                  {currentSession.messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isLoading={isLoading && message.role === 'assistant' && !message.content}
                      isThinking={isThinking}
                      thinkingState={thinkingState}
                    />
                  ))}
                  
                  {/* Show thinking bubble when AI is processing and no assistant message exists yet */}
                  {(isThinking || (isLoading && !currentSession.messages.some(m => m.role === 'assistant' && !m.content))) && (
                    <div className="flex justify-start">
                      <div className="flex items-start gap-3 max-w-[80%]">
                        <Avatar className="h-8 w-8 border border-border/50">
                          <AvatarImage src="/ai_tutor.png" alt="AI" />
                          <AvatarFallback>
                            <Bot className="h-4 w-4" />
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
                  placeholder="Ask me anything about your studies..."
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
                className="h-[60px] w-[60px] rounded-lg"
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ChatSheet;