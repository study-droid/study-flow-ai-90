import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { deepSeekHandler } from "@/lib/unified-deepseek-handler";
import { AIMessage } from "@/types/ai-tutor";

/**
 * ChatSheet - AI Study Assistant Chat Interface
 * Integrated with AI Tutor for real AI responses
 * Uses ai_tutor.png as the default AI avatar
 */

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

export type ChatSheetProps = {
  /** Custom class name for styling */
  className?: string;
};

export function ChatSheet({ className }: ChatSheetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hi! I'm your AI study assistant. How can I help you today?",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: text,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Convert to AI message format for AI handler
      const aiMessages: AIMessage[] = [
        ...messages.map(msg => ({
          role: msg.sender === "user" ? "user" as const : "assistant" as const,
          content: msg.content
        })),
        { role: "user" as const, content: text }
      ];

      // Call AI API
      const response = await deepSeekHandler.complete({
        messages: aiMessages,
        modelConfig: {
          model: "chat",
          temperature: 0.7,
          maxTokens: 1000,
          topP: 1.0,
          jsonMode: false
        },
        requestId: `chat_${Date.now()}`
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.content || "I apologize, but I'm having trouble processing your request right now. Please try again.",
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      
      // Fallback response for errors
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I'm having trouble connecting right now. Please check your connection and try again.",
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
          data-testid="chat-trigger"
          className={`fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105 ${className || ''}`}
          size="icon"
        >
          <img 
            src="/ai_tutor.png" 
            alt="AI Assistant" 
            className="h-8 w-8 rounded-full object-cover"
            onError={(e) => {
              // Fallback to Bot icon if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const fallbackIcon = document.createElement('div');
                fallbackIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>';
                parent.appendChild(fallbackIcon);
              }
            }}
          />
        </Button>
      </DialogTrigger>

      {/* Chat Dialog */}
      <DialogContent className="p-0 w-screen h-[100dvh] sm:h-[90vh] sm:max-w-[400px] sm:ml-auto flex flex-col border border-border/50 shadow-2xl">
        <DialogHeader className="border-b border-border/50 px-4 py-3 bg-card/80 backdrop-blur-sm">
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <img 
                src="/ai_tutor.png" 
                alt="AI Study Assistant" 
                className="h-6 w-6 rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>';
                  }
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">AI Study Assistant</span>
              <span className="text-xs text-muted-foreground">Always here to help you learn</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4" data-testid="messages-scroll" ref={scrollAreaRef}>
          <div className="space-y-4 py-4" data-testid="messages-list">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === "user" ? "flex-row-reverse" : ""}`}
                aria-label="message"
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  {message.sender === "ai" ? (
                    <>
                      <AvatarImage 
                        src="/ai_tutor.png" 
                        alt="AI Assistant"
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback className="bg-secondary">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div
                  className={`flex-1 max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground ml-4"
                      : "bg-muted mr-4"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  <p className={`mt-2 text-xs opacity-70 ${
                    message.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3" aria-label="loading">
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src="/ai_tutor.png" 
                    alt="AI Assistant"
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-2xl bg-muted px-4 py-3 mr-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <form
          className="border-t border-border/50 p-4 bg-card/50 backdrop-blur-sm"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <div className="flex gap-2">
            <Input
              data-testid="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me anything about your studies..."
              disabled={isLoading}
              className="flex-1 rounded-full border-border/50 bg-background/50 backdrop-blur-sm focus:bg-background transition-colors"
              maxLength={1000}
            />
            <Button
              data-testid="send-button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              type="submit"
              className="rounded-full h-10 w-10 flex-shrink-0 hover:scale-105 transition-transform"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2 px-2">
            <span className="text-xs text-muted-foreground">
              {input.length}/1000 characters
            </span>
            <span className="text-xs text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </span>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ChatSheet;