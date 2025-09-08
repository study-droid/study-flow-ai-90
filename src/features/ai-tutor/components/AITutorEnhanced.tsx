/**
 * Enhanced AI Tutor component with comprehensive integration and final polish
 */

import { useState, useRef, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Edit,
  RefreshCw,
  Settings,
  Zap,
  Activity,
  Wifi,
  Shield,
  BarChart3,
  Accessibility,
} from "lucide-react";

import { useAITutor } from '../hooks/useAITutor';
import { EnhancedMessageContainer } from './EnhancedMessageContainer';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import { AITutorErrorBoundary } from './ErrorBoundary';
import { EnhancedThinkingIndicator } from './EnhancedThinkingIndicator';
import { ProviderSelectionModal } from './ProviderSelectionModal';
import { ServiceStatusIndicator } from './ServiceStatusIndicator';
import { QueueStatusIndicator } from './QueueStatusIndicator';
import { useProviderSelection } from '../hooks/useProviderSelection';
import { thinkingStateService } from '../services/thinking-state.service';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useMobile, useDeviceCapabilities } from '@/components/mobile/mobile-hooks';
import { HapticButton } from '@/components/mobile/MobileOptimizations';
import { useAccessibility } from '@/components/accessibility/AccessibilityProvider';
import { OfflineIndicator, CompactOfflineIndicator } from '@/components/offline/OfflineIndicator';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { usePerformanceMetrics } from '@/services/monitoring/performance-metrics';
import { PerformanceDashboard } from '@/components/monitoring/PerformanceDashboard';
import './AITutorEnhanced.css';
import './EnhancedThinkingIndicator.css';

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
    errorRecovery,
    serviceHealth,
  } = useAITutor();

  const {
    currentProviderInfo,
    recommendedProvider,
    hasHealthyProviders,
  } = useProviderSelection();

  const isMobile = useMobile();
  const { hasTouch, supportsVibration } = useDeviceCapabilities();
  const { settings: accessibilitySettings, announceToScreenReader } = useAccessibility();
  const { offlineState, hasPendingSync } = useOfflineMode();
  const { trackUserInteraction, trackAPICall } = usePerformanceMetrics();

  const [inputMessage, setInputMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  const [showServiceStatus, setShowServiceStatus] = useState(false);

  const [isRenaming, setIsRenaming] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [lastMessageContext, setLastMessageContext] = useState<any>(null);
  const [animationState, setAnimationState] = useState<'idle' | 'sending' | 'receiving'>('idle');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (accessibilitySettings.reducedMotion) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentSession?.messages, accessibilitySettings.reducedMotion]);

  // Reset animation state when loading completes
  useEffect(() => {
    if (!isLoading && !isThinking) {
      setAnimationState('idle');
    }
  }, [isLoading, isThinking]);

  // Reset circuit breakers when there are errors
  const handleResetServices = () => {
    trackUserInteraction('reset_services', 'service-reset-button');
    errorRecovery.resetServices();

    if (accessibilitySettings.screenReaderOptimized) {
      announceToScreenReader('AI services have been reset', 'polite');
    }

    if (supportsVibration) {
      navigator.vibrate(50);
    }
  };

  // Handle retry last operation
  const handleRetryLastOperation = async () => {
    try {
      trackUserInteraction('retry_operation', 'retry-button');
      await errorRecovery.retryLastOperation();

      if (accessibilitySettings.screenReaderOptimized) {
        announceToScreenReader('Retrying last operation', 'polite');
      }
    } catch (error) {
      console.error('Retry failed:', error);

      if (accessibilitySettings.screenReaderOptimized) {
        announceToScreenReader('Retry failed', 'assertive');
      }
    }
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

    // Track user interaction
    trackUserInteraction('send_message', 'ai-tutor-input', {
      messageLength: message.length,
      hasSession: !!currentSession,
      provider: currentProviderInfo?.id
    });

    // Analyze message for enhanced thinking context
    const messageContext = thinkingStateService.analyzeMessage(
      message,
      currentSession?.messages.slice(-5).map(m => ({ role: m.role, content: m.content }))
    );
    setLastMessageContext(messageContext);

    setInputMessage("");
    setAnimationState('sending');

    // Announce to screen reader
    if (accessibilitySettings.screenReaderOptimized) {
      announceToScreenReader('Sending message to AI tutor', 'polite');
    }

    try {
      await trackAPICall('ai-tutor-send-message', async () => {
        await sendMessage(message);
      }, {
        messageType: messageContext?.type,
        provider: currentProviderInfo?.id,
        offline: offlineState.isOffline
      });

      setAnimationState('receiving');

      // Haptic feedback on success
      if (supportsVibration) {
        navigator.vibrate(25);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setAnimationState('idle');

      // Enhanced error handling with accessibility
      const errorMessage = error instanceof Error ? error.message : 'Could not send message. Please try again.';
      toast({
        title: 'Send failed',
        description: errorMessage,
        variant: 'destructive'
      });

      if (accessibilitySettings.screenReaderOptimized) {
        announceToScreenReader(`Error sending message: ${errorMessage}`, 'assertive');
      }

      // Error haptic feedback
      if (supportsVibration) {
        navigator.vibrate([100, 50, 100]);
      }
    }
  };

  const handleQuickAction = (action: typeof quickActions[0]) => {
    trackUserInteraction('quick_action', 'quick-action-button', {
      actionType: action.label
    });
    
    setInputMessage(action.prompt);
    textareaRef.current?.focus();

    if (accessibilitySettings.screenReaderOptimized) {
      announceToScreenReader(`Selected ${action.label} quick action`, 'polite');
    }

    if (supportsVibration) {
      navigator.vibrate(25);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }

    // Enhanced keyboard navigation
    if (e.key === 'Escape') {
      if (showHistory) {
        setShowHistory(false);
      } else if (showProviderModal) {
        setShowProviderModal(false);
      } else if (showPerformanceDashboard) {
        setShowPerformanceDashboard(false);
      }
    }
  };

  const handleNewChat = () => {
    trackUserInteraction('new_chat', 'new-chat-button');
    createNewSession();
    setShowHistory(false);

    if (accessibilitySettings.screenReaderOptimized) {
      announceToScreenReader('Started new chat session', 'polite');
    }
    
    if (supportsVibration) {
      navigator.vibrate(25);
    }
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

const handleProviderChange = (providerId: string) => {
  toast({
    title: 'Provider switched',
    description: `Now using ${currentProviderInfo?.name || providerId}`
  });
};

return (
  <AITutorErrorBoundary>
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
                  <HapticButton size="sm" variant="secondary" onClick={saveRename} hapticFeedback={hasTouch}>Save</HapticButton>
                  <HapticButton size="sm" variant="ghost" onClick={cancelRename} hapticFeedback={hasTouch}>Cancel</HapticButton>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold">{currentSession?.title || 'AI Study Tutor'}</h1>
                  {currentSession && (
                    <HapticButton size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={startRename} hapticFeedback={hasTouch}>
                      <Edit className="w-4 h-4" />
                    </HapticButton>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Your intelligent learning companion</p>
            </div>
          </div>

          <div className="header-actions">
            {/* Offline/Sync Status */}
            {(offlineState.isOffline || hasPendingSync) && (
              <CompactOfflineIndicator className="mr-2" />
            )}

            {/* Service Status Indicator */}
            <ServiceStatusIndicator 
              compact={true}
              showResetButton={false}
              className="mr-2"
            />

            {/* Provider Selection Button */}
            <div className="flex items-center gap-2">
              {currentProviderInfo && (
                <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-lg">
                  <Zap className="w-3 h-3 text-blue-500" />
                  <span className="text-xs text-gray-700">{currentProviderInfo.name}</span>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    currentProviderInfo.status === 'online' && "bg-green-500",
                    currentProviderInfo.status === 'degraded' && "bg-yellow-500",
                    currentProviderInfo.status === 'offline' && "bg-red-500"
                  )} />
                </div>
              )}

              <HapticButton
                variant="ghost"
                size="sm"
                onClick={() => setShowProviderModal(true)}
                className="h-8 px-2 text-xs"
                title="Select AI Provider"
                hapticFeedback={hasTouch}
              >
                <Settings className="w-3 h-3 mr-1" />
                Provider
              </HapticButton>
            </div>

            {/* Performance Dashboard Toggle */}
            <HapticButton
              variant="ghost"
              size="sm"
              onClick={() => setShowPerformanceDashboard(!showPerformanceDashboard)}
              className={cn(
                "h-8 px-2 text-xs",
                showPerformanceDashboard && "bg-accent text-accent-foreground"
              )}
              title="Performance Dashboard"
              hapticFeedback={hasTouch}
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              Metrics
            </HapticButton>

            {/* Service Status Indicator */}
            {serviceHealth.overallHealth !== 'healthy' && (
              <div className="flex items-center gap-2">
                {errorRecovery.canRetry && (
                  <HapticButton
                    variant="ghost"
                    size="sm"
                    onClick={handleRetryLastOperation}
                    disabled={errorRecovery.isRecovering}
                    className="h-8 px-2 text-xs text-blue-600 hover:bg-blue-50"
                    title="Retry last operation"
                    hapticFeedback={hasTouch}
                  >
                    <RefreshCw className={cn("w-3 h-3 mr-1", errorRecovery.isRecovering && "animate-spin")} />
                    Retry
                  </HapticButton>
                )}
                <HapticButton
                  variant="ghost"
                  size="sm"
                  onClick={handleResetServices}
                  className={cn(
                    "h-8 px-2 text-xs",
                    serviceHealth.overallHealth === 'degraded' && "text-yellow-600 hover:bg-yellow-50",
                    serviceHealth.overallHealth === 'unhealthy' && "text-red-600 hover:bg-red-50"
                  )}
                  title="Click to reset services"
                  hapticFeedback={hasTouch}
                >
                  <span className="mr-1">
                    {serviceHealth.overallHealth === 'degraded' ? '⚠️' : '🔴'}
                  </span>
                  {serviceHealth.overallHealth === 'degraded' ? 'Degraded' : 'Issues'}
                </HapticButton>
              </div>
            )}

            <HapticButton
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "h-8 w-8 p-0",
                showHistory && "bg-accent text-accent-foreground"
              )}
              hapticFeedback={hasTouch}
            >
              <History className="w-4 h-4" />
            </HapticButton>

            <HapticButton
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              className="h-8 w-8 p-0"
              hapticFeedback={hasTouch}
            >
              <PlusCircle className="w-4 h-4" />
            </HapticButton>
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
                      <HapticButton
                        key={index}
                        variant="secondary"
                        className={cn(
                          "quick-action-btn h-auto p-4 text-left justify-start",
                          action.bgColor
                        )}
                        onClick={() => handleQuickAction(action)}
                        hapticFeedback={hasTouch}
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
                      </HapticButton>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EnhancedMessageContainer
                messages={currentSession.messages}
                isLoading={isLoading}
                isThinking={isThinking}
                thinkingState={thinkingState}
                onFeedback={(messageId, type) => {
                  // Handle feedback - could be implemented in the store
                  console.log('Message feedback:', messageId, type);
                }}
                onRetry={(messageId) => {
                  // Handle retry - could trigger message regeneration
                  console.log('Retry message:', messageId);
                }}
                onBookmark={(messageId) => {
                  // Handle bookmark - could be stored in user preferences
                  console.log('Bookmark message:', messageId);
                }}
                onShare={(messageId) => {
                  // Handle share - already implemented in handleShare
                  console.log('Share message:', messageId);
                }}
                onExport={(messageId, format) => {
                  // Handle export - already implemented in handleExport
                  console.log('Export message:', messageId, format);
                }}
                isDarkMode={false} // Could be derived from theme context
                className="flex-1"
              />
            )}

            {/* Enhanced Thinking Indicator for empty sessions */}
            {(isThinking || (isLoading && currentSession?.messages?.length === 0)) && lastMessageContext && (
              <div className="flex justify-start px-4">
                <EnhancedThinkingIndicator
                  isVisible={true}
                  stage={thinkingState?.stage || 'analyzing'}
                  content={thinkingState?.content}
                  messageContext={lastMessageContext}
                  progress={undefined} // Let the component handle auto-progress
                  onVisibilityChange={(visible) => {
                    console.log('Thinking indicator visibility changed:', visible);
                  }}
                />
              </div>
            )}

            {/* Enhanced Error Display */}
            {error && (
              <div className="error-container">
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-800">{error}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {errorRecovery.canRetry && (
                      <HapticButton
                        size="sm"
                        variant="secondary"
                        onClick={handleRetryLastOperation}
                        disabled={errorRecovery.isRecovering}
                        className="h-7 px-2 text-xs border-red-300 text-red-700 hover:bg-red-100"
                        hapticFeedback={hasTouch}
                      >
                        <RefreshCw className={cn("w-3 h-3 mr-1", errorRecovery.isRecovering && "animate-spin")} />
                        Retry
                      </HapticButton>
                    )}
                    <HapticButton
                      size="sm"
                      variant="secondary"
                      onClick={handleResetServices}
                      className="h-7 px-2 text-xs border-red-300 text-red-700 hover:bg-red-100"
                      hapticFeedback={hasTouch}
                    >
                      Reset
                    </HapticButton>
                  </div>
                </div>
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

                <HapticButton
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || !canSendMessage}
                  size="sm"
                  className="send-btn shrink-0"
                  hapticFeedback={hasTouch}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </HapticButton>
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

      {/* Provider Selection Modal */}
      <ProviderSelectionModal
        isOpen={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        onProviderChange={handleProviderChange}
        currentProvider={currentProviderInfo?.id}
        preserveContext={true}
      />

      {/* Performance Dashboard Modal */}
      {showPerformanceDashboard && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="fixed inset-4 bg-background border border-border rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Performance Dashboard</h2>
              <HapticButton
                variant="ghost"
                size="sm"
                onClick={() => setShowPerformanceDashboard(false)}
                className="h-8 w-8 p-0"
                hapticFeedback={hasTouch}
              >
                <X className="w-4 h-4" />
              </HapticButton>
            </div>
            <div className="p-4 overflow-auto h-full">
              <Suspense fallback={
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              }>
                <PerformanceDashboard />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Offline Guidance */}
      {offlineState.isOffline && (
        <div className="fixed bottom-4 right-4 z-40">
          <OfflineIndicator 
            showDetails={true}
            position="bottom"
            className="max-w-sm"
          />
        </div>
      )}

      {/* Queue Status for Mobile */}
      {isMobile && (
        <div className="fixed bottom-20 left-4 z-40">
          <QueueStatusIndicator compact={true} />
        </div>
      )}
    </div>
  </AITutorErrorBoundary>
);
}

