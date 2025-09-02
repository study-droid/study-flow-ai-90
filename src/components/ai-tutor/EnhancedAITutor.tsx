import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Bot, User, Trash2, Plus, BookOpen, Brain, Target, 
  HelpCircle, Loader2, CheckCircle, Calendar, ListTodo, 
  FileText, Sparkles, Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { enhancedAIService, type Message, type AISession, type AIProvider } from '@/services/enhanced-ai-service';
import { getAvailableProviders, setLLMProvider, getCurrentProvider } from '@/lib/llm';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { useSubjects } from '@/hooks/useSubjects';
import { cn } from '@/lib/utils';
import { TimeoutPopup } from './TimeoutPopup';

interface StreamingMessage {
  role: 'assistant';
  content: string;
  isStreaming: boolean;
  toolCalls?: any[];
}

export function EnhancedAITutor() {
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [currentSession, setCurrentSession] = useState<AISession | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [enableTools, setEnableTools] = useState(true);
  const [currentProvider, setCurrentProvider] = useState<AIProvider>('gemini');
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [showTimeoutPopup, setShowTimeoutPopup] = useState(false);
  const [timeoutDuration, setTimeoutDuration] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { subjects } = useSubjects();

  useEffect(() => {
    loadSessions();
    loadProviders();
    
    return () => {
      clearTimeoutTimers();
    };
  }, []);

  const loadSessions = async () => {
    const allSessions = await enhancedAIService.loadSessions();
    setSessions(allSessions);
    if (allSessions.length > 0 && !currentSession) {
      setCurrentSession(allSessions[0]);
    }
  };

  const loadProviders = async () => {
    const providers = await getAvailableProviders();
    setAvailableProviders(providers);
    const current = getCurrentProvider();
    setCurrentProvider(current as AIProvider);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const clearTimeoutTimers = () => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    setShowTimeoutPopup(false);
    setTimeoutDuration(0);
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, streamingMessage]);

  const handleCreateSession = async () => {
    if (!selectedSubject) {
      toast({
        title: 'Subject Required',
        description: 'Please select a subject for your tutoring session.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const session = await enhancedAIService.createSession(selectedSubject, currentProvider);
      setSessions([...sessions, session]);
      setCurrentSession(session);
      setSelectedSubject('');
      toast({
        title: 'Session Created',
        description: `New ${selectedSubject} tutoring session started.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create session. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentSession || isLoading) return;

    setIsLoading(true);
    startTimeoutTimer();
    const message = inputMessage;
    setInputMessage('');

    // Initialize streaming message
    setStreamingMessage({
      role: 'assistant',
      content: '',
      isStreaming: true,
      toolCalls: []
    });

    try {
      const stream = enhancedAIService.sendMessageStream(
        currentSession.id, 
        message,
        {
          provider: currentProvider === 'auto' ? undefined : currentProvider,
          includeTools: enableTools,
          temperature: 0.7,
          maxTokens: 2000
        }
      );

      let accumulatedContent = '';
      const toolCalls: any[] = [];

      for await (const chunk of stream) {
        if (chunk.type === 'text' && chunk.delta) {
          accumulatedContent += chunk.delta;
          setStreamingMessage({
            role: 'assistant',
            content: accumulatedContent,
            isStreaming: true,
            toolCalls
          });
        } else if (chunk.type === 'tool_call' && chunk.tool) {
          toolCalls.push(chunk.tool);
          setStreamingMessage({
            role: 'assistant',
            content: accumulatedContent,
            isStreaming: true,
            toolCalls
          });
          
          // Execute tool call
          const result = await enhancedAIService.executeToolCall(chunk.tool);
          console.log('Tool execution result:', result);
        } else if (chunk.type === 'done') {
          setStreamingMessage(null);
          // Reload session to get updated messages
          const updatedSession = enhancedAIService.getSession(currentSession.id);
          if (updatedSession) {
            setCurrentSession(updatedSession);
            setSessions(sessions.map(s => s.id === updatedSession.id ? updatedSession : s));
          }
        } else if (chunk.type === 'error') {
          toast({
            title: 'Error',
            description: chunk.error || 'An error occurred',
            variant: 'destructive'
          });
          setStreamingMessage(null);
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive'
      });
      setStreamingMessage(null);
    } finally {
      setIsLoading(false);
      clearTimeoutTimers();
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      setDeletingSessionId(sessionId);
      const success = await enhancedAIService.deleteSession(sessionId);
      
      if (success) {
        setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
        
        if (currentSession?.id === sessionId) {
          const remainingSessions = sessions.filter(s => s.id !== sessionId);
          setCurrentSession(remainingSessions.length > 0 ? remainingSessions[0] : null);
        }
        
        toast({
          title: 'Session Deleted',
          description: 'The tutoring session has been removed successfully.'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete session. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleProviderChange = (provider: string) => {
    setCurrentProvider(provider as AIProvider);
    if (provider !== 'auto') {
      setLLMProvider(provider);
    }
    toast({
      title: 'Provider Changed',
      description: `Now using ${provider === 'auto' ? 'automatic provider selection' : provider}`
    });
  };

  const renderToolCall = (toolCall: any) => {
    const iconMap: Record<string, any> = {
      create_tasks: ListTodo,
      plan_week: Calendar,
      make_quiz: HelpCircle,
      grade_answer: CheckCircle,
      summarize_notes: FileText,
      schedule_session: Calendar
    };

    const Icon = iconMap[toolCall.name] || Sparkles;

    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-sm">
        <Icon className="h-4 w-4" />
        <span className="font-medium">{toolCall.name.replace(/_/g, ' ')}</span>
      </div>
    );
  };

  const renderMessage = (message: Message | StreamingMessage, index?: number) => {
    const isAssistant = message.role === 'assistant';
    const isStreaming = 'isStreaming' in message && message.isStreaming;

    return (
      <div
        key={index}
        className={cn(
          "flex gap-3",
          isAssistant ? '' : 'justify-end'
        )}
      >
        {isAssistant && (
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4" />
          </div>
        )}
        <div
          className={cn(
            "max-w-[80%] rounded-lg p-3 space-y-2",
            isAssistant ? 'bg-muted' : 'bg-primary text-primary-foreground'
          )}
        >
          {message.content && (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
          
          {'tool_calls' in message && message.tool_calls && message.tool_calls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.tool_calls.map((toolCall, i) => (
                <div key={i}>{renderToolCall(toolCall)}</div>
              ))}
            </div>
          )}

          {'toolCalls' in message && message.toolCalls && message.toolCalls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.toolCalls.map((toolCall, i) => (
                <div key={i}>{renderToolCall(toolCall)}</div>
              ))}
            </div>
          )}

          {isStreaming && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}

          {'timestamp' in message && !isStreaming && (
            <p className="text-xs opacity-70 mt-1">
              {formatDistanceToNow(message.timestamp, { addSuffix: true })}
            </p>
          )}
        </div>
        {!isAssistant && (
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-6 w-6" />
                Enhanced AI Tutor Assistant
              </CardTitle>
              <CardDescription>
                Get personalized tutoring with advanced AI capabilities
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="enable-tools">Tools</Label>
                <Switch
                  id="enable-tools"
                  checked={enableTools}
                  onCheckedChange={setEnableTools}
                />
              </div>
              <Select value={currentProvider} onValueChange={handleProviderChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="AI Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  {availableProviders.map(provider => (
                    <SelectItem 
                      key={provider.value} 
                      value={provider.value}
                      disabled={!provider.available}
                    >
                      <div className="flex items-center gap-2">
                        {provider.name}
                        {provider.available ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <span className="text-xs text-muted-foreground">(Not configured)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Sessions</CardTitle>
            <CardDescription>Your tutoring sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.name}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleCreateSession} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {sessions.map(session => (
                  <Card
                    key={session.id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      currentSession?.id === session.id && "bg-primary/10"
                    )}
                    onClick={() => setCurrentSession(session)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Badge variant="outline" className="mb-1">
                            {session.subject}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(session.lastActive, { addSuffix: true })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.messages.length} messages
                          </p>
                          {session.provider !== 'auto' && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {session.provider}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={deletingSessionId === session.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(session.id);
                          }}
                        >
                          {deletingSessionId === session.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">
              {currentSession ? `${currentSession.subject} Session` : 'Select or Create a Session'}
            </CardTitle>
            {currentSession && enableTools && (
              <CardDescription>
                AI tools enabled: Create tasks, plan week, make quiz, and more
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {currentSession ? (
              <div className="space-y-4">
                <ScrollArea className="h-[500px] rounded-lg border p-4">
                  <div className="space-y-4">
                    {currentSession.messages.map((message, index) => renderMessage(message, index))}
                    {streamingMessage && renderMessage(streamingMessage)}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Input
                    placeholder={enableTools ? 
                      "Ask for help, create tasks, plan your week..." : 
                      "Ask your tutor a question..."
                    }
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    disabled={isLoading}
                  />
                  <Button onClick={handleSendMessage} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {enableTools && (
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>Try:</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-auto p-1 text-xs"
                      onClick={() => setInputMessage("Create a study plan for this week")}
                    >
                      "Create a study plan"
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-auto p-1 text-xs"
                      onClick={() => setInputMessage("Make a quiz about the last topic we discussed")}
                    >
                      "Make a quiz"
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-auto p-1 text-xs"
                      onClick={() => setInputMessage("Break down this topic into study tasks")}
                    >
                      "Break down topic"
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Create a new session to start learning</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeout Popup */}
      <TimeoutPopup 
        isVisible={showTimeoutPopup}
        duration={timeoutDuration}
      />
    </div>
  );
}