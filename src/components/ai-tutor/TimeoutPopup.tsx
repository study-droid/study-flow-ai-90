import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Brain, Sparkles } from 'lucide-react';

interface TimeoutPopupProps {
  isVisible: boolean;
  duration: number; // in seconds
  className?: string;
}

export const TimeoutPopup: React.FC<TimeoutPopupProps> = ({
  isVisible,
  duration,
  className
}) => {
  const [currentMessage, setCurrentMessage] = useState(0);

  const messages = [
    {
      text: "Don't worry, I'm working hard to provide the best response for you...",
      icon: Brain,
      threshold: 15
    },
    {
      text: "Still thinking... Complex topics need careful consideration.",
      icon: Sparkles,
      threshold: 30
    },
    {
      text: "Almost there! Preparing a detailed response just for you.",
      icon: Brain,
      threshold: 45
    }
  ];

  // AI-generated fact state (DeepSeek-powered with graceful fallback)
  const [interestingFact, setInterestingFact] = useState<string>('');
  const [isLoadingFact, setIsLoadingFact] = useState<boolean>(false);
  const [factError, setFactError] = useState<string | null>(null);

  // Local fallback facts (shown if DeepSeek not configured or fails)
  const fallbackFacts = [
    "Spaced repetition can double long-term retention compared to cramming.",
    "Interleaving topics (mixing subjects) improves transfer of learning and problem-solving.",
    "Active recall beats passive review: testing yourself strengthens memory pathways.",
    "Short, focused sessions (25–40 minutes) with breaks reduce cognitive fatigue.",
    "Teaching a concept to someone else is one of the fastest ways to learn it deeply."
  ];

  useEffect(() => {
    if (!isVisible) {
      setCurrentMessage(0);
      // Reset fact state when popup hides so each response feels fresh
      setInterestingFact('');
      setIsLoadingFact(false);
      setFactError(null);
      return;
    }
    // Update message based on duration
    const messageIndex = messages.findLastIndex(msg => duration >= msg.threshold);
    if (messageIndex >= 0 && messageIndex !== currentMessage) {
      setCurrentMessage(messageIndex);
    }
  }, [duration, isVisible, currentMessage]);

  // Fetch a concise, interesting fact when popup appears (once per visibility cycle)
  useEffect(() => {
    const fetchFact = async () => {
      // Avoid refetching if already present or currently loading
      if (!isVisible || interestingFact || isLoadingFact) return;
      setIsLoadingFact(true);
      setFactError(null);
      try {
        const { DeepSeekClient } = await import('@/lib/llm/deepseek');
        const client = new DeepSeekClient({
          // Uses env defaults inside DeepSeekClient if these are undefined
          apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
          model: import.meta.env.VITE_DEEPSEEK_MODEL
        } as any);

        const prompt =
          "Generate one short, engaging, study-related fact in 1-2 sentences. " +
          "Keep it technically accurate and concise. No preamble or formatting.";
        const fact = await client.complete(prompt);
        setInterestingFact((fact || '').trim());
      } catch (err) {
        setFactError('unavailable');
        // Graceful fallback to a local fact
        const random = fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];
        setInterestingFact(random);
      } finally {
        setIsLoadingFact(false);
      }
    };
    fetchFact();
  }, [isVisible, interestingFact, isLoadingFact]);

  if (!isVisible) return null;

  const CurrentIcon = messages[currentMessage].icon;

  return (
    <div
      className={cn(
        "fixed z-50 top-4 right-4 max-w-sm",
        "animate-slide-up opacity-0 animate-fade-in",
        className
      )}
      style={{
        animation: isVisible 
          ? 'fadeIn 0.3s ease-out forwards, slideUp 0.3s ease-out' 
          : 'fadeOut 0.2s ease-in forwards'
      }}
    >
      <div className="glass-card p-4 rounded-lg shadow-lg border border-primary/20 backdrop-blur-md">
        <div className="flex items-start space-x-3">
          {/* Animated Icon */}
          <div className="flex-shrink-0 relative">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-slow">
              <CurrentIcon className="h-4 w-4 text-primary animate-pulse" />
            </div>
            {/* Pulsing ring effect */}
            <div className="absolute inset-0 w-8 h-8 rounded-full border-2 border-primary/30 animate-ping" />
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-thinking-dot-1"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-thinking-dot-2"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-thinking-dot-3"></div>
              </div>
              <span className="text-xs text-primary font-medium">
                AI Tutor
              </span>
            </div>
            
            <p className="text-sm text-foreground/90 leading-relaxed">
              {messages[currentMessage].text}
            </p>
            
            {/* Progress indicator */}
            <div className="mt-3 flex items-center space-x-2">
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((duration / 60) * 100, 100)}%`
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {duration}s
              </span>
            </div>

            {/* Removed: detailed explanation and interesting fact sections */}
            {/* Previously rendered “How your answer is generated” and “Interesting fact” divs are removed to keep the message concise and provider-agnostic. */}
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-1 -right-1 w-3 h-3">
        <Sparkles className="w-3 h-3 text-yellow-400 animate-pulse" />
      </div>
    </div>
  );
};

// Add keyframe animations for smoother effects
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  @keyframes fadeOut {
    from {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    to {
      opacity: 0;
      transform: translateY(-10px) scale(0.95);
    }
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(20px);
    }
    to {
      transform: translateY(0);
    }
  }
`;

if (!document.head.querySelector('[data-timeout-popup-styles]')) {
  style.setAttribute('data-timeout-popup-styles', 'true');
  document.head.appendChild(style);
}