/**
 * Enhanced Thinking Indicator Component
 * Provides intelligent thinking states with contextual messages and smooth animations
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, Zap, Lightbulb, Sparkles, ChevronDown, ChevronUp, Eye, EyeOff, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { aiFactsService, type AIFact } from '../services/ai-facts.service';
import { thinkingStateService, type EnhancedThinkingState, type ThinkingContext } from '../services/thinking-state.service';

interface EnhancedThinkingIndicatorProps {
  isVisible: boolean;
  stage: 'analyzing' | 'reasoning' | 'responding';
  content?: string;
  messageContext?: ThinkingContext;
  progress?: number;
  className?: string;
  onVisibilityChange?: (visible: boolean) => void;
}

const stageIcons = {
  analyzing: Brain,
  reasoning: Zap,
  responding: Lightbulb,
};

const stageColors = {
  analyzing: 'text-blue-500 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
  reasoning: 'text-purple-500 bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
  responding: 'text-green-500 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
};

const stageLabels = {
  analyzing: 'Analyzing',
  reasoning: 'Reasoning',
  responding: 'Responding',
};

export function EnhancedThinkingIndicator({
  isVisible,
  stage,
  content,
  messageContext,
  progress: externalProgress,
  className,
  onVisibilityChange
}: EnhancedThinkingIndicatorProps) {
  const [thinkingState, setThinkingState] = useState<EnhancedThinkingState | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContent, setShowContent] = useState(true);
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [isFactRotating, setIsFactRotating] = useState(false);
  const [internalProgress, setInternalProgress] = useState(0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number; duration: number }>>([]);
  
  const progressIntervalRef = useRef<NodeJS.Timeout>();
  const factRotationRef = useRef<NodeJS.Timeout>();
  const stageStartTimeRef = useRef<number>(Date.now());

  // Generate enhanced thinking state when context changes
  useEffect(() => {
    if (!isVisible || !messageContext) return;

    const enhancedState = thinkingStateService.generateThinkingState(
      stage,
      messageContext,
      externalProgress
    );
    
    setThinkingState(enhancedState);
    stageStartTimeRef.current = Date.now();
    
    // Reset progress for new stage
    if (externalProgress === undefined) {
      setInternalProgress(enhancedState.progress);
    }
  }, [stage, messageContext, isVisible, externalProgress]);

  // Handle progress updates
  useEffect(() => {
    if (externalProgress !== undefined) {
      setInternalProgress(externalProgress);
      return;
    }

    if (!thinkingState || !isVisible) return;

    // Simulate realistic progress based on estimated duration
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - stageStartTimeRef.current;
      const estimatedDuration = thinkingState.estimatedDuration;
      const targetProgress = Math.min(95, (elapsed / estimatedDuration) * 100);
      
      setInternalProgress(prev => {
        const increment = Math.random() * 2 + 0.5; // Random increment between 0.5-2.5%
        const newProgress = Math.min(targetProgress, prev + increment);
        return newProgress;
      });
    }, 200);

    progressIntervalRef.current = progressInterval;
    return () => clearInterval(progressInterval);
  }, [thinkingState, isVisible, externalProgress]);

  // Handle fact rotation
  useEffect(() => {
    if (!thinkingState?.factRotation || thinkingState.factRotation.length <= 1) return;

    const rotationInterval = setInterval(() => {
      setIsFactRotating(true);
      
      setTimeout(() => {
        setCurrentFactIndex(prev => (prev + 1) % thinkingState.factRotation!.length);
        setIsFactRotating(false);
      }, 150);
    }, 4000);

    factRotationRef.current = rotationInterval;
    return () => clearInterval(rotationInterval);
  }, [thinkingState?.factRotation]);

  // Generate floating particles
  useEffect(() => {
    if (!isVisible || !thinkingState) return;

    const generateParticles = () => {
      const particleCount = thinkingState.animations.particleCount;
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
      }));
      setParticles(newParticles);
    };

    generateParticles();
    const interval = setInterval(generateParticles, 5000);
    return () => clearInterval(interval);
  }, [isVisible, thinkingState]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (factRotationRef.current) {
        clearInterval(factRotationRef.current);
      }
    };
  }, []);

  const handleVisibilityToggle = useCallback(() => {
    const newVisibility = !showContent;
    setShowContent(newVisibility);
    onVisibilityChange?.(newVisibility);
  }, [showContent, onVisibilityChange]);

  if (!isVisible || !thinkingState) return null;

  const StageIcon = stageIcons[stage];
  const currentFact = thinkingState.factRotation?.[currentFactIndex];
  const displayProgress = externalProgress ?? internalProgress;

  return (
    <div 
      className={cn(
        "enhanced-thinking-indicator",
        `thinking-${stage}`,
        `complexity-${thinkingState.complexity}`,
        `type-${thinkingState.messageType}`,
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`AI is ${stageLabels[stage].toLowerCase()}: ${thinkingState.contextualMessage}`}
    >
      {/* Ambient Particles */}
      <div className="thinking-particles-enhanced" aria-hidden="true">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={cn(
              "thinking-particle-enhanced",
              `particle-${thinkingState.animations.colorScheme}`
            )}
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
              opacity: thinkingState.animations.pulseIntensity,
            }}
          >
            <Sparkles className="w-2 h-2" />
          </div>
        ))}
      </div>

      {/* Main Content Container */}
      <div className="thinking-content-enhanced">
        {/* Enhanced Avatar with Dynamic Glow */}
        <div 
          className={cn(
            "thinking-avatar-enhanced",
            stageColors[stage]
          )}
          style={{
            '--pulse-intensity': thinkingState.animations.pulseIntensity,
          } as React.CSSProperties}
          aria-hidden="true"
        >
          <div 
            className={cn(
              "avatar-glow-enhanced",
              `glow-${thinkingState.animations.colorScheme}`
            )}
            style={{
              animationDuration: `${2 / thinkingState.animations.pulseIntensity}s`,
            }}
          />
          <div className="avatar-icon-enhanced">
            <StageIcon className="w-4 h-4" />
          </div>
        </div>

        {/* Enhanced Bubble */}
        <div className={cn(
          "thinking-body-enhanced",
          stageColors[stage]
        )}>
          {/* Header with Stage and Controls */}
          <div className="thinking-header-enhanced">
            <div className="thinking-stage-enhanced">
              <Badge 
                variant="outline" 
                className={cn(
                  "stage-badge-enhanced",
                  stageColors[stage]
                )}
              >
                <div className="stage-indicator-enhanced">
                  <Activity className="w-3 h-3 animate-pulse" />
                </div>
                <span className="stage-label-enhanced">
                  {stageLabels[stage]}
                </span>
                <span className="complexity-indicator">
                  {thinkingState.complexity}
                </span>
              </Badge>
            </div>

            <div className="thinking-controls-enhanced">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVisibilityToggle}
                className="control-btn-enhanced"
                aria-label={showContent ? "Hide thinking details" : "Show thinking details"}
              >
                {showContent ? (
                  <EyeOff className="w-3 h-3" />
                ) : (
                  <Eye className="w-3 h-3" />
                )}
              </Button>

              {(content || thinkingState.content) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="control-btn-enhanced"
                  aria-label={isExpanded ? "Collapse details" : "Expand details"}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Enhanced Progress Indicator */}
          <div className="thinking-progress-enhanced">
            <div className="progress-header">
              <span className="progress-label">
                {Math.round(displayProgress)}%
              </span>
              <span className="progress-eta">
                ~{Math.ceil((thinkingState.estimatedDuration * (100 - displayProgress)) / 100 / 1000)}s
              </span>
            </div>
            <Progress 
              value={displayProgress} 
              className={cn(
                "progress-bar-enhanced",
                `progress-${stage}`
              )}
            />
          </div>

          {/* Contextual Content */}
          {showContent && (
            <div className="thinking-content-text-enhanced">
              <div className="contextual-message">
                {content || thinkingState.contextualMessage}
              </div>

              {/* Detailed Content (Expandable) */}
              {isExpanded && thinkingState.content && (
                <ScrollArea className="thinking-details-enhanced">
                  <div className="thinking-reasoning-enhanced">
                    {thinkingState.content}
                  </div>
                </ScrollArea>
              )}

              {/* Message Type and Complexity Indicators */}
              <div className="thinking-metadata-enhanced">
                <Badge variant="secondary" className="metadata-badge">
                  {thinkingState.messageType.replace('-', ' ')}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "complexity-badge",
                    {
                      'border-green-300 text-green-700': thinkingState.complexity === 'simple',
                      'border-yellow-300 text-yellow-700': thinkingState.complexity === 'moderate',
                      'border-orange-300 text-orange-700': thinkingState.complexity === 'complex',
                      'border-red-300 text-red-700': thinkingState.complexity === 'advanced',
                    }
                  )}
                >
                  {thinkingState.complexity}
                </Badge>
              </div>
            </div>
          )}

          {/* AI Facts Display */}
          {currentFact && showContent && (
            <div className={cn(
              "ai-fact-container-enhanced",
              isFactRotating && "ai-fact-rotating"
            )}>
              <div className="ai-fact-header-enhanced">
                <span className="ai-fact-icon-enhanced" role="img" aria-label={currentFact.title}>
                  {currentFact.icon || '🤖'}
                </span>
                <span className="ai-fact-title-enhanced">{currentFact.title}</span>
              </div>
              <div className="ai-fact-content-enhanced">
                {currentFact.content}
              </div>
            </div>
          )}

          {/* Enhanced Ripple Effect */}
          <div 
            className={cn(
              "thinking-ripple-enhanced",
              `ripple-${thinkingState.animations.colorScheme}`
            )}
            aria-hidden="true"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="ripple-circle-enhanced"
                style={{
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${2 / thinkingState.animations.pulseIntensity}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}