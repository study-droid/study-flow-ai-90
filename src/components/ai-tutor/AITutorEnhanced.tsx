import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Send, 
  Brain, 
  BookOpen, 
  Lightbulb, 
  HelpCircle,
  History,
  Settings,
  Sparkles,
  RefreshCw,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageBubble } from './MessageBubble';
import { ThinkingIndicator } from './ThinkingIndicator';
import { StudyPlanHistory } from './StudyPlanHistory';
import { ConceptHistory } from './ConceptHistory';
import { PracticeHistory } from './PracticeHistory';
import { DeepSeekRecommendation } from './DeepSeekRecommendation';
import { unifiedAIService } from '@/services/unified-ai-service';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
  feedback?: 'helpful' | 'not_helpful' | null;
}

interface AITutorEnhancedProps {
  subject?: string;
  topic?: string;
  className?: string;
}

export const AITutorEnhanced: React.FC<AITutorEnhancedProps> = ({
  subject = '',
  topic = '',
  className
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [sessionId, setSessionId] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showRecommendation, setShowRecommendation] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousScrollTop = useRef(0);
  
  const { toast } = useToast();
  const aiService = unifiedAIService;

  useEffect(() => {
    // Initialize session
    initializeSession();
    
    // Check if should show recommendation
    checkRecommendationStatus();
  }, []);

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  const loadPreviousMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_tutor_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        setMessages(data.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          feedback: msg.feedback
        })));
      }
    } catch (error) {
      console.error('Error loading previous messages:', error);
    }
  };

  const initializeSession = async () => {
    try {
      // Create a new session in the AI service
      const session = await aiService.createSession(subject || 'General');
      setSessionId(session.id);
      
      // Load previous messages if any
      await loadPreviousMessages();
    } catch (error) {
      console.error('Failed to initialize AI session:', error);
      // Fallback to local session ID
      setSessionId(`session_${Date.now()}`);
    }
  };

  const checkRecommendationStatus = async () => {
    // Check if user hasn't seen DeepSeek recommendation in last 7 days
    const lastShown = localStorage.getItem('deepseek_recommendation_shown');
    if (!lastShown || Date.now() - parseInt(lastShown) > 7 * 24 * 60 * 60 * 1000) {
      setShowRecommendation(true);
    }
  };

  const detectResponseType = (input: string): 'explanation' | 'study_plan' | 'practice' | 'concept' => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('study plan') || lowerInput.includes('schedule') || lowerInput.includes('timeline')) {
      return 'study_plan';
    }
    if (lowerInput.includes('practice') || lowerInput.includes('question') || lowerInput.includes('exercise')) {
      return 'practice';
    }
    if (lowerInput.includes('concept') || lowerInput.includes('what is') || lowerInput.includes('define')) {
      return 'concept';
    }
    return 'explanation';
  };

  const getUserLevel = (): 'beginner' | 'intermediate' | 'advanced' => {
    // This can be enhanced to track actual user progress
    // For now, we'll use a simple heuristic based on message count
    const messageCount = messages.filter(m => m.role === 'user').length;
    
    if (messageCount < 5) return 'beginner';
    if (messageCount < 15) return 'intermediate';
    return 'advanced';
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // Check if user scrolled up
    if (scrollTop < previousScrollTop.current) {
      setAutoScroll(false);
    }
    
    // Re-enable auto-scroll if user scrolls to bottom
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setAutoScroll(true);
    }
    
    previousScrollTop.current = scrollTop;
  };

  const sendMessage = async () => {
    if (!input.trim() || isThinking) return;

    // Ensure we have a session
    if (!sessionId) {
      await initializeSession();
      if (!sessionId) {
        toast({
          title: 'Session Error',
          description: 'Failed to initialize chat session. Please refresh the page.',
          variant: 'destructive'
        });
        return;
      }
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    try {
      // Save user message
      await saveMessage(userMessage);

      // Detect response type from input
      const responseType = detectResponseType(input);
      const userLevel = getUserLevel(); // Can be enhanced to track user progress
      
      // Get AI response with optimization context
      const response = await aiService.sendMessage(
        sessionId,
        input,
        subject,
        { 
          topic,
          userLevel,
          responseType,
          context: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
        }
      );

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: response?.content || 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Save assistant message
      await saveMessage(assistantMessage);

      // Check for special responses (study plans, concepts, practice questions)
      if (response?.content) {
        await processSpecialContent(response.content, response?.metadata?.type);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please try again.',
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const saveMessage = async (message: Message) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('ai_tutor_messages')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          role: message.role,
          content: message.content,
          subject,
          topic,
          feedback: message.feedback || null
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const processSpecialContent = async (content: string, type?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if content contains a study plan
      if (type === 'study_plan' || content.includes('Study Plan') || content.includes('Learning Path')) {
        await supabase
          .from('ai_tutor_study_plans')
          .insert({
            user_id: user.id,
            subject,
            topic,
            plan_content: content,
            duration_weeks: extractDuration(content),
            is_active: true
          });
      }

      // Check if content contains concept explanation
      if (type === 'concept' || content.includes('Concept:') || content.includes('Understanding')) {
        const conceptName = extractConceptName(content);
        if (conceptName) {
          await supabase
            .from('ai_tutor_concepts')
            .insert({
              user_id: user.id,
              subject,
              concept_name: conceptName,
              explanation: content,
              difficulty_level: detectDifficulty(content),
              examples: extractExamples(content)
            });
        }
      }

      // Check if content contains practice questions
      if (type === 'practice' || content.includes('Practice Question') || content.includes('Exercise')) {
        const questions = extractQuestions(content);
        if (questions.length > 0) {
          for (const question of questions) {
            await supabase
              .from('ai_tutor_practice_questions')
              .insert({
                user_id: user.id,
                subject,
                topic,
                question_text: question,
                difficulty: detectDifficulty(question)
              });
          }
        }
      }
    } catch (error) {
      console.error('Error processing special content:', error);
    }
  };

  const extractDuration = (content: string): number => {
    const match = content.match(/(\d+)\s*weeks?/i);
    return match ? parseInt(match[1]) : 4;
  };

  const extractConceptName = (content: string): string => {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('Concept:') || line.includes('Topic:')) {
        return line.replace(/^(Concept:|Topic:)\s*/i, '').trim();
      }
    }
    return topic || 'General Concept';
  };

  const detectDifficulty = (content: string): 'easy' | 'medium' | 'hard' => {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('advanced') || lowerContent.includes('complex')) return 'hard';
    if (lowerContent.includes('intermediate') || lowerContent.includes('moderate')) return 'medium';
    return 'easy';
  };

  const extractExamples = (content: string): string[] => {
    const examples: string[] = [];
    const lines = content.split('\n');
    let inExample = false;
    let currentExample = '';

    for (const line of lines) {
      if (line.toLowerCase().includes('example') || line.includes('```')) {
        if (currentExample) {
          examples.push(currentExample.trim());
          currentExample = '';
        }
        inExample = !inExample;
      } else if (inExample) {
        currentExample += line + '\n';
      }
    }

    if (currentExample) {
      examples.push(currentExample.trim());
    }

    return examples;
  };

  const extractQuestions = (content: string): string[] => {
    const questions: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.match(/^\d+\.|^Q\d+:|^Question/i)) {
        questions.push(line);
      }
    }

    return questions;
  };

  const handleFeedback = async (messageId: string, feedback: 'helpful' | 'not_helpful') => {
    try {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, feedback } : msg
        )
      );

      // Update in database
      const { error } = await supabase
        .from('ai_tutor_message_feedback')
        .insert({
          message_id: messageId,
          feedback,
          session_id: sessionId
        });

      if (error) throw error;

      toast({
        title: 'Thank you for your feedback!',
        description: 'Your feedback helps us improve the AI tutor.',
      });
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(`session_${Date.now()}`);
    toast({
      title: 'Chat cleared',
      description: 'Starting a new conversation.',
    });
  };

  const quickActions = [
    { icon: BookOpen, label: 'Create Study Plan', prompt: 'Create a study plan for this topic' },
    { icon: Lightbulb, label: 'Explain Concept', prompt: 'Explain this concept in simple terms' },
    { icon: HelpCircle, label: 'Practice Questions', prompt: 'Give me practice questions on this topic' },
    { icon: Brain, label: 'Test My Knowledge', prompt: 'Test my understanding with questions' },
  ];

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Tutor
            {subject && <span className="text-sm font-normal text-muted-foreground">• {subject}</span>}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              title="Clear chat"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveTab('settings')}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mb-3">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="study-plans">
              <History className="h-4 w-4 mr-2" />
              Study Plans
            </TabsTrigger>
            <TabsTrigger value="concepts">
              <Brain className="h-4 w-4 mr-2" />
              Concepts
            </TabsTrigger>
            <TabsTrigger value="practice">
              <HelpCircle className="h-4 w-4 mr-2" />
              Practice
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col mt-0 px-4">
            {showRecommendation && (
              <DeepSeekRecommendation
                currentProvider={'deepseek'}
                onSetupClick={() => {
                  setShowRecommendation(false);
                  localStorage.setItem('deepseek_recommendation_shown', Date.now().toString());
                  setActiveTab('settings');
                }}
                className="mb-3"
              />
            )}

            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Start Learning with AI</h3>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Ask questions, get explanations, and practice with your personal AI tutor
                </p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start"
                      onClick={async () => {
                        setInput(action.prompt);
                        // Don't call sendMessage immediately, let user click Send
                        // This prevents session errors
                      }}
                    >
                      <action.icon className="h-4 w-4 mr-2" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <ScrollArea 
                className="flex-1 pr-4 chat-scrollbar"
                onScroll={handleScroll}
                ref={scrollAreaRef}
              >
                <div className="space-y-4 pb-4">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      role={message.role}
                      content={message.content}
                      timestamp={message.timestamp}
                      onFeedback={(type) => handleFeedback(message.id, type)}
                    />
                  ))}
                  {isThinking && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <ThinkingIndicator variant="dots" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            )}

            <div className="mt-4 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask me anything about your studies..."
                disabled={isThinking}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage} 
                disabled={!input.trim() || isThinking}
                className="min-w-[100px]"
              >
                {isThinking ? (
                  <ThinkingIndicator size="sm" label="" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>

            {!autoScroll && (
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-20 right-8"
                onClick={() => {
                  setAutoScroll(true);
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Jump to latest
              </Button>
            )}
          </TabsContent>

          <TabsContent value="study-plans" className="flex-1 px-4">
            <StudyPlanHistory />
          </TabsContent>

          <TabsContent value="concepts" className="flex-1 px-4">
            <ConceptHistory />
          </TabsContent>

          <TabsContent value="practice" className="flex-1 px-4">
            <PracticeHistory />
          </TabsContent>

          <TabsContent value="settings" className="px-4">
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                Configure your AI provider in Settings → AI Connections
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};