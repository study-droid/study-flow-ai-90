import { useState } from "react";
import { BrandCard } from "@/components/brand/BrandCard";
import { TeddyLogo } from "@/components/brand/TeddyLogo";
import { EnhancedButton } from "@/components/enhanced/EnhancedButton";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, 
  Send, 
  Sparkles, 
  Brain,
  Heart,
  Star,
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface EnhancedAITutorProps {
  className?: string;
}

export const EnhancedAITutor = ({ className }: EnhancedAITutorProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm Teddy, your friendly AI study companion! 🧸 I'm here to help you learn, understand complex topics, and make studying more enjoyable. What would you like to explore today?",
      role: "assistant",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const quickPrompts = [
    "Explain photosynthesis in simple terms",
    "Help me with algebra problems", 
    "What are the key events in WWII?",
    "How does machine learning work?",
    "Give me study tips for exams"
  ];

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "That's a great question! Let me help you understand this concept step by step. I'll break it down in a way that makes it easy to remember! 🎯",
        role: "assistant",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputMessage(prompt);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <BrandCard variant="premium" className="p-6">
        <div className="flex items-center gap-4">
          <TeddyLogo size="lg" animated />
          <div className="flex-1">
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              AI Tutor Session
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            </h1>
            <p className="text-muted-foreground">
              Your personal study companion is ready to help! 🎓
            </p>
          </div>
          <Badge variant="secondary" className="bg-gradient-to-r from-primary to-primary-glow text-white">
            Online
          </Badge>
        </div>
      </BrandCard>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Area */}
        <div className="lg:col-span-3">
          <BrandCard variant="glass" className="h-[500px] flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="h-5 w-5" />
                Chat with Teddy
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col gap-4">
              {/* Messages */}
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white text-sm">
                          🧸
                        </div>
                      )}
                      
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-3 text-sm",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground ml-12"
                            : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        <p>{message.content}</p>
                        <p className={cn(
                          "text-xs mt-1 opacity-70",
                          message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      
                      {message.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-sm">
                          😊
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white text-sm">
                        🧸
                      </div>
                      <div className="bg-secondary rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {/* Input Area */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Ask Teddy anything about your studies..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 min-h-[60px] resize-none"
                  />
                  <EnhancedButton
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isTyping}
                    variant="teddy"
                    size="icon"
                    className="self-end mb-2"
                  >
                    <Send className="h-4 w-4" />
                  </EnhancedButton>
                </div>
              </div>
            </CardContent>
          </BrandCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Prompts */}
          <BrandCard variant="warm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Quick Prompts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickPrompts.map((prompt, index) => (
                <EnhancedButton
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="w-full text-left justify-start h-auto py-2 px-3 text-xs"
                  onClick={() => handleQuickPrompt(prompt)}
                >
                  {prompt}
                </EnhancedButton>
              ))}
            </CardContent>
          </BrandCard>

          {/* Study Stats */}
          <BrandCard variant="default">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Session Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Questions Asked</span>
                <Badge variant="secondary">5</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Concepts Learned</span>
                <Badge variant="secondary">3</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Session Duration</span>
                <Badge variant="secondary">15m</Badge>
              </div>
            </CardContent>
          </BrandCard>

          {/* Study Tips */}
          <BrandCard variant="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4" />
                Today's Tip
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl text-center">💡</div>
                <p className="text-xs text-center">
                  Break down complex topics into smaller, manageable chunks for better understanding!
                </p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Heart className="h-3 w-3 text-primary" />
                  <span className="text-xs text-muted-foreground">From Teddy</span>
                </div>
              </div>
            </CardContent>
          </BrandCard>
        </div>
      </div>
    </div>
  );
};