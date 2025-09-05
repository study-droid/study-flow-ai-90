/**
 * Enhanced AI Tutor component with streamlined architecture
 */

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, 
  Send, 
  Lightbulb, 
  BookOpen,
  Calculator,
  Target,
  MessageSquare,
  History,
  Loader2,
  PlusCircle,
  X,
  Settings,
  Edit,
} from "lucide-react";

import { useAITutor } from '../hooks/useAITutor';
import { MessageBubble } from './MessageBubble';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import { AIThinkingBubble } from './AIThinkingBubble';
import { circuitBreakerManager } from '@/services/reliability/circuit-breaker';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import './AITutorEnhanced.css';

const quickActions = [
  { 
    icon: BookOpen, 
    label: "Explain concept", 
    prompt: "Please explain this concept in simple terms with examples: ",
    color: "text-blue-500",
    bgColor: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40",
  },
  { 
    icon: Calculator, 
    label: "Solve problem", 
    prompt: "Help me solve this step-by-step with detailed explanations: ",
    color: "text-green-500",
    bgColor: "bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-900/40",
  },
  { 
    icon: Target, 
    label: "Create quiz", 
    prompt: "Create a comprehensive quiz with 10 questions about: ",
    color: "text-purple-500",
    bgColor: "bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/40",
  },
  { 
    icon: Lightbulb, 
    label: "Study tips", 
    prompt: "Give me effective study strategies and tips for: ",
    color: "text-yellow-500",
    bgColor: "bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/30 dark:hover:bg-yellow-900/40",
  },
];

export function AITutorEnhanced() {
  const {
    currentSession,
    sessions,
    isLoading,
    isThinking,
    error,
    thinkingState,
    createNewSession,
    switchToSession,
    deleteSession,
    sendMessage,
    canSendMessage,
    renameSession,
  } = useAITutor();

  const [inputMessage, setInputMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'healthy' | 'degraded' | 'unhealthy'>('healthy');
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // Monitor circuit breaker status
  useEffect(() => {
    const checkServiceStatus = () => {
      const summary = circuitBreakerManager.getHealthSummary();
      setServiceStatus(summary.overallHealth);
    };

    checkServiceStatus();
    const interval = setInterval(checkServiceStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Reset circuit breakers when there are errors
  const handleResetServices = () => {
    circuitBreakerManager.resetFailingCircuits();
    setServiceStatus('healthy');
    toast({
      title: "🔄 Services Reset",
      description: "Circuit breakers have been reset. Try sending a message again.",
    });
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputMessage]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !canSendMessage) return;

    const message = inputMessage;
    setInputMessage("");
    
    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({ title: 'Send failed', description: 'Could not send message. Please try again.', variant: 'destructive' });
    }
  };

  const handleQuickAction = (action: typeof quickActions[0]) => {
    setInputMessage(action.prompt);
    textareaRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    createNewSession();
    setShowHistory(false);
  };

  const startRename = () => {
    if (!currentSession) return;
    setTempTitle(currentSession.title);
    setIsRenaming(true);
  };

  const cancelRename = () => {
    setIsRenaming(false);
    setTempTitle("");
  };

  const saveRename = async () => {
    if (!currentSession) return;
    const newTitle = tempTitle.trim();
    if (!newTitle || newTitle === currentSession.title) {
      setIsRenaming(false);
      return;
    }
    try {
      await renameSession(currentSession.id, newTitle);
      toast({ title: 'Renamed', description: 'Chat title updated.' });
    } catch {
      toast({ title: 'Rename failed', description: 'Could not update chat title.', variant: 'destructive' });
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <div className="ai-tutor-layout">
      {/* Header */}
      <div className="ai-tutor-header">
        <div className="header-content">
          <div className="header-left">
            <Brain className="w-5 h-5 text-primary" />
            <div>
              {isRenaming ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    className="h-8 w-64"
                    autoFocus
                  />
                  <Button size="sm" variant="secondary" onClick={saveRename}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={cancelRename}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold">{currentSession?.title || 'AI Study Tutor'}</h1>
                  {currentSession && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={startRename}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Your intelligent learning companion</p>
            </div>
          </div>
          
          <div className="header-actions">
            {/* Service Status Indicator */}
            {serviceStatus !== 'healthy' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetServices}
                className={cn(
                  "h-8 px-2 text-xs",
                  serviceStatus === 'degraded' && "text-yellow-600 hover:bg-yellow-50",
                  serviceStatus === 'unhealthy' && "text-red-600 hover:bg-red-50"
                )}
                title="Click to reset services"
              >
                <span className="mr-1">
                  {serviceStatus === 'degraded' ? '⚠️' : '🔴'}
                </span>
                {serviceStatus === 'degraded' ? 'Degraded' : 'Issues'}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "h-8 w-8 p-0",
                showHistory && "bg-accent text-accent-foreground"
              )}
            >
              <History className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="h-8 w-8 p-0"
            >
              <PlusCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="ai-tutor-main">
        {/* Chat History Sidebar */}
        {showHistory && (
          <ChatHistoryPanel 
            isOpen={showHistory}
            sessions={sessions}
            currentSession={currentSession}
            onSessionSelect={switchToSession}
            onSessionRename={(id, title) => renameSession(id, title)}
            onSessionDelete={deleteSession}
            onNewSession={handleNewChat}
            onClose={() => setShowHistory(false)}
          />
        )}

        {/* Chat Area */}
        <div className="ai-tutor-chat">
          {/* Messages Container */}
          <div className="messages-container">
            <ScrollArea className="messages-scroll">
              <div className="messages-content">
                {!currentSession?.messages?.length ? (
                  <div className="welcome-screen">
                    <div className="welcome-content">
                      <div className="welcome-icon">
                        <Brain className="w-12 h-12 text-primary/60" />
                      </div>
                      <h2 className="welcome-title">Welcome to AI Study Tutor!</h2>
                      <p className="welcome-description">
                        I'm here to help you learn, solve problems, and master any subject. 
                        Get started with a quick action or ask me anything!
                      </p>

                      <div className="quick-actions-grid">
                        {quickActions.map((action, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            className={cn(
                              "quick-action-btn h-auto p-4 text-left justify-start",
                              action.bgColor
                            )}
                            onClick={() => handleQuickAction(action)}
                          >
                            <action.icon className={cn("w-5 h-5 mr-3 shrink-0", action.color)} />
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{action.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {action.label === "Explain concept" && "Break down complex topics"}
                                {action.label === "Solve problem" && "Step-by-step solutions"}
                                {action.label === "Create quiz" && "Test your knowledge"}
                                {action.label === "Study tips" && "Effective learning strategies"}
                              </span>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="messages-list">
                    {currentSession.messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isLoading={isLoading && message.role === 'assistant' && !message.content}
                      />
                    ))}
                    
                    {/* Thinking Bubble - Show during AI processing */}
                    {(isThinking && thinkingState.isVisible) && (
                      <AIThinkingBubble
                        content={thinkingState.content}
                        stage={thinkingState.stage}
                      />
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Error Display */}
            {error && (
              <div className="error-container">
                <Badge variant="destructive">
                  <X className="w-3 h-3 mr-1" />
                  {error}
                </Badge>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="input-area">
            <div className="input-container">
              <div className="input-wrapper">
                <Textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask me anything about your studies..."
                  className="input-field resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isLoading}
                  rows={1}
                />
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || !canSendMessage}
                  size="sm"
                  className="send-btn shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="input-footer">
                <span className="input-hint">
                  Press Enter to send, Shift+Enter for new line
                </span>
                
                {currentSession && (
                  <Badge variant="secondary" className="message-count">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {currentSession.messages.length}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

