import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Brain, MessageCircle, X, Send } from "lucide-react";
import { useAITutor } from '@/hooks/useAITutor';
import { useNavigate } from 'react-router-dom';

export const FloatingAIButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [quickMessage, setQuickMessage] = useState('');
  const { sendMessage, isLoading } = useAITutor();
  const navigate = useNavigate();

  const handleQuickMessage = async () => {
    if (!quickMessage.trim()) return;
    
    await sendMessage(quickMessage);
    setQuickMessage('');
    setIsOpen(false);
    navigate('/tutor');
  };

  const quickPrompts = [
    "Help me create a study plan",
    "Explain this concept",
    "What should I study next?",
    "Give me motivation"
  ];

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Brain className="h-6 w-6" />}
        </Button>
      </div>

      {/* Quick Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-80">
          <Card className="shadow-xl border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Quick Chat with Teddy 🧸
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Quick Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Ask Teddy anything..."
                  value={quickMessage}
                  onChange={(e) => setQuickMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleQuickMessage()}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleQuickMessage}
                  disabled={isLoading || !quickMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick Prompts */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Quick prompts:</p>
                <div className="grid grid-cols-1 gap-1">
                  {quickPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 justify-start"
                      onClick={() => {
                        setQuickMessage(prompt);
                        handleQuickMessage();
                      }}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Open Full Chat */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/tutor');
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Open Full Chat
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};