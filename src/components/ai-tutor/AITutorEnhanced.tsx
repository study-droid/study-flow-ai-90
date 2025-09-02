import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Zap,
  Database,
  CheckCircle,
  Activity,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageBubble } from './MessageBubble';
import { ThinkingIndicator } from './ThinkingIndicator';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import { DeepSeekRecommendation } from './DeepSeekRecommendation';
import { AIHistoryModal } from './AIHistoryModal';
import { TimeoutPopup } from './TimeoutPopup';
import { unifiedAIService } from '@/services/unified-ai-service';
import { responseAnalytics } from '@/services/response-analytics';
import { responseCache } from '@/services/response-cache';
import './AITutorEnhanced.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
  feedback?: 'helpful' | 'not_helpful' | null;
  cached?: boolean;
  optimized?: boolean;
  qualityScore?: number;
  processingResult?: any; // Will contain ProcessingResult from post-processing pipeline
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeChatSession, setActiveChatSession] = useState<any>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ hits: number; hitRate: number }>({ hits: 0, hitRate: 0 });
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showTimeoutPopup, setShowTimeoutPopup] = useState(false);
  const [timeoutDuration, setTimeoutDuration] = useState(0);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousScrollTop = useRef(0);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  const aiService = unifiedAIService;

  useEffect(() => {
    // Initialize session
    initializeSession();
    
    // Check if should show recommendation
    checkRecommendationStatus();
    
    // Update cache stats periodically
    const statsInterval = setInterval(() => {
      const stats = responseCache.getStats();
      setCacheStats({ hits: stats.hits, hitRate: stats.hitRate });
    }, 5000);
    
    return () => {
      clearInterval(statsInterval);
      clearTimeoutTimers(true); // Immediate clear on component unmount
    };
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

  // Timeout popup management
  const startTimeoutTimer = () => {
    clearTimeoutTimers();
    setTimeoutDuration(0);
    
    // Start duration counter
    durationTimerRef.current = setInterval(() => {
      setTimeoutDuration(prev => prev + 1);
    }, 1000);
    
    // Show popup after 15 seconds
    timeoutTimerRef.current = setTimeout(() => {
      setShowTimeoutPopup(true);
    }, 15000);
  };

  const clearTimeoutTimers = (immediate = false) => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    
    // If popup is visible and not immediate clear, wait 6 seconds before hiding
    if (showTimeoutPopup && !immediate) {
      setTimeout(() => {
        setShowTimeoutPopup(false);
        setTimeoutDuration(0);
      }, 6000); // 6 seconds delay
    } else {
      setShowTimeoutPopup(false);
      setTimeoutDuration(0);
    }
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
    startTimeoutTimer();

    try {
      // Save user message
      await saveMessage(userMessage);

      // Detect response type from input
      const responseType = detectResponseType(input);
      const userLevel = getUserLevel();
      
      // Show optimization indicator
      setIsOptimizing(true);
      
      // Generate cache key for tracking
      const cacheKey = await responseCache.generateCacheKey(input, {
        subject,
        topic,
        userLevel,
        responseType
      });
      
      // Check if response will be cached
      const cachedResponse = await responseCache.get(cacheKey);
      const isCached = !!cachedResponse;
      
      // Get AI response with optimization context
      const startTime = Date.now();
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
      ) as any; // Type assertion to access processingResult
      const responseTime = Date.now() - startTime;
      
      // Track analytics
      responseAnalytics.trackResponseGeneration(sessionId, responseType, {
        subject,
        topic,
        userLevel,
        qualityScore: response?.metadata?.qualityScore || 85,
        optimizationTime: responseTime,
        responseLength: response?.content?.length || 0,
        enhancementsApplied: response?.metadata?.enhancementsApplied || []
      });
      
      if (isCached) {
        responseAnalytics.trackCacheHit(sessionId, responseType, true);
      }

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: response?.content || 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
        cached: isCached,
        optimized: true,
        qualityScore: response?.processingResult?.qualityAssessment?.overallScore || response?.metadata?.qualityScore || 85,
        processingResult: response?.processingResult
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsOptimizing(false);
      
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
      clearTimeoutTimers();
    }
  };

  const saveMessage = async (message: Message) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Prepare message data with safe fallbacks
      const messageData: any = {
        user_id: user.id,
        session_id: sessionId,
        role: message.role,
        content: message.content,
        subject,
        topic
      };

      // Add optional fields only if they exist in schema
      try {
        // Try inserting with all fields first
        messageData.feedback = message.feedback || null;
        messageData.quality_score = message.qualityScore;
        messageData.cached = message.cached;
        messageData.optimized = message.optimized;
        
        if (message.processingResult) {
          messageData.processing_result = message.processingResult;
          messageData.response_type = message.processingResult.formattedResponse?.metadata?.responseType;
        }

        const { error } = await supabase
          .from('ai_tutor_messages')
          .insert(messageData);

        if (error) {
          // If error due to missing columns, retry with basic data
          if (error.code === 'PGRST204') {
            const basicMessageData = {
              user_id: user.id,
              session_id: sessionId,
              role: message.role,
              content: message.content,
              subject,
              topic
            };
            
            const { error: retryError } = await supabase
              .from('ai_tutor_messages')
              .insert(basicMessageData);
              
            if (retryError) throw retryError;
          } else {
            throw error;
          }
        }
      } catch (insertError) {
        throw insertError;
      }
    } catch (error) {
      console.error('Error saving message:', error);
      // Don't rethrow to avoid breaking user experience
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

      // Track in analytics
      responseAnalytics.trackUserFeedback(sessionId, feedback);

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
    <>
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Tutor
              {subject && <span className="text-sm font-normal text-muted-foreground">• {subject}</span>}
            </CardTitle>
            <div className="flex items-center gap-2 ml-4">
              <div className="px-2 py-1 bg-primary/10 rounded-full text-xs font-medium flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Powered by AI
              </div>
              {cacheStats.hitRate > 0 && (
                <div className="px-2 py-1 bg-green-500/10 rounded-full text-xs font-medium text-green-600 flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  {Math.round(cacheStats.hitRate)}% cached
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistoryModal(true)}
              title="View history"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              title="Clear chat"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 relative overflow-hidden">
        {/* Mobile Menu Toggle */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        >
          {isMobileSidebarOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
        </button>
        
        {/* Overlay for mobile */}
        <div 
          className={cn('sidebar-overlay', isMobileSidebarOpen && 'active')}
          onClick={() => setIsMobileSidebarOpen(false)}
        />
        
        <div className="ai-tutor-container">
        {/* Sidebar */}
        <ChatHistoryPanel
          className={cn('chat-history-sidebar', isMobileSidebarOpen && 'mobile-open')}
          sessions={[]}
          activeSession={activeChatSession}
          onSessionSelect={(session) => {
            setActiveChatSession(session);
            // Load session messages here when implemented
          }}
          onSessionDelete={(sessionId) => {
            // Handle session deletion when implemented
            console.log('Delete session:', sessionId);
          }}
          onNewSession={() => {
            clearChat();
            setActiveChatSession(null);
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        
        {/* Main Chat Area */}
        <div className="chat-content-area px-4">
            {showRecommendation && (
              <DeepSeekRecommendation
                currentProvider={'deepseek'}
                onSetupClick={() => {
                  setShowRecommendation(false);
                  localStorage.setItem('deepseek_recommendation_shown', Date.now().toString());
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
                className="flex-1 pr-4 chat-scrollbar overflow-y-auto"
                onScroll={handleScroll}
                ref={scrollAreaRef}
                style={{
                  height: 'calc(100vh - 300px)',
                  maxHeight: '600px'
                }}
              >
                <div className="space-y-4 pb-4">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      role={message.role}
                      content={message.content}
                      timestamp={message.timestamp}
                      onFeedback={(type) => handleFeedback(message.id, type)}
                      cached={message.cached}
                      optimized={message.optimized}
                      qualityScore={message.qualityScore}
                      processingResult={message.processingResult}
                      onProgressUpdate={(taskId, completed) => {
                        // Handle progress tracking for study plans
                        console.log('Task progress:', taskId, completed);
                      }}
                    />
                  ))}
                  {isThinking && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <ThinkingIndicator variant="dots" />
                          {isOptimizing && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 animate-pulse" />
                              Optimizing response...
                            </span>
                          )}
                        </div>
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
        </div>
        </div>
      </CardContent>
    </Card>
      
      {/* History Modal */}
      <AIHistoryModal 
        open={showHistoryModal} 
        onOpenChange={setShowHistoryModal}
      />

      {/* Timeout Popup */}
      <TimeoutPopup 
        isVisible={showTimeoutPopup}
        duration={timeoutDuration}
      />
    </>
  );
};