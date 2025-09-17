import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Send, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAITutor } from '@/hooks/useAITutor';

export const AITutorWidget: React.FC = () => {
  const navigate = useNavigate();
  const { sendMessage, isLoading } = useAITutor();
  const [quickQuestion, setQuickQuestion] = useState('');

  const handleQuickQuestion = async () => {
    if (!quickQuestion.trim()) return;
    await sendMessage(quickQuestion);
    setQuickQuestion('');
    navigate('/tutor');
  };

  const quickQuestions = [
    "Explain this concept",
    "Create a study plan",
    "Help with homework"
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Brain className="h-4 w-4" />
          AI Tutor - Teddy
        </CardTitle>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => navigate('/tutor')}
          className="h-6 w-6 p-0"
        >
          <MessageCircle className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1">
          <Input
            placeholder="Ask Teddy a quick question..."
            value={quickQuestion}
            onChange={(e) => setQuickQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleQuickQuestion()}
            className="text-xs h-8"
          />
          <Button 
            size="sm" 
            onClick={handleQuickQuestion}
            disabled={isLoading || !quickQuestion.trim()}
            className="h-8 w-8 p-0"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Quick actions:</p>
          {quickQuestions.map((question, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="text-xs h-6 w-full justify-start"
              onClick={() => {
                setQuickQuestion(question);
                handleQuickQuestion();
              }}
            >
              {question}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};