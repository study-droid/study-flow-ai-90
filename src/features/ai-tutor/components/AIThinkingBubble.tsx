/**
 * AI Thinking Bubble component with modern animations and effects
 */

import { useState, useEffect } from 'react';
import { Brain, ChevronDown, ChevronUp, Eye, EyeOff, Sparkles, Zap, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/shared/utils';
import { aiFactsService } from '../services/ai-facts.service';
import type { AIFact } from '../types';

interface AIThinkingBubbleProps {
  content: string;
  stage: 'analyzing' | 'reasoning' | 'responding';
  isVisible?: boolean;
  className?: string;
}

const stageLabels = {
  analyzing: 'Analyzing question',
  reasoning: 'Thinking through the problem',
  responding: 'Formulating response',
};

const stageColors = {
  analyzing: 'text-blue-500 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
  reasoning: 'text-purple-500 bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
  responding: 'text-green-500 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
};

const stageIcons = {
  analyzing: Brain,
  reasoning: Zap,
  responding: Lightbulb,
};

const stageAnimations = {
  analyzing: 'thinking-analyzing',
  reasoning: 'thinking-reasoning',
  responding: 'thinking-responding',
};

export function AIThinkingBubble({ 
  content, 
  stage, 
  isVisible = true,
  className 
}: AIThinkingBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContent, setShowContent] = useState(true);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number; duration: number }>>([]);
  const [currentFact, setCurrentFact] = useState<AIFact | null>(null);
  const [factRotation, setFactRotation] = useState<AIFact[]>([]);
  const [factIndex, setFactIndex] = useState(0);
  const [isFactRotating, setIsFactRotating] = useState(false);

  // Initialize AI facts for the current stage
  useEffect(() => {
    const facts = aiFactsService.getFactsForStage(stage, 3);
    setFactRotation(facts);
    setCurrentFact(facts[0] || null);
    setFactIndex(0);
  }, [stage]);

  // Rotate facts during longer thinking sessions
  useEffect(() => {
    if (factRotation.length <= 1) return;

    const rotationInterval = setInterval(() => {
      setIsFactRotating(true);
      
      setTimeout(() => {
        setFactIndex((prev) => (prev + 1) % factRotation.length);
        setCurrentFact(factRotation[(factIndex + 1) % factRotation.length]);
        setIsFactRotating(false);
      }, 150); // Half of the rotation animation duration
    }, 3500); // Rotate facts every 3.5 seconds

    return () => clearInterval(rotationInterval);
  }, [factRotation, factIndex]);

  // Generate floating particles for ambient effect
  useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
      }));
      setParticles(newParticles);
    };

    generateParticles();
    const interval = setInterval(generateParticles, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  const StageIcon = stageIcons[stage];

  return (
    <div 
      className={cn(
        "thinking-bubble-modern",
        stageAnimations[stage],
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`AI is ${stageLabels[stage].toLowerCase()}`}
    >
      {/* Ambient Particles */}
      <div className="thinking-particles" aria-hidden="true">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="thinking-particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          >
            <Sparkles className="w-2 h-2" />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="thinking-content-modern">
        {/* Enhanced Avatar with Glow Effect */}
        <div 
          className={cn(
            "thinking-avatar-modern",
            stageColors[stage]
          )}
          aria-hidden="true"
        >
          <div className="avatar-glow" aria-hidden="true" />
          <div className="avatar-icon">
            <StageIcon className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>

        {/* Enhanced Bubble */}
        <div className={cn(
          "thinking-body-modern",
          stageColors[stage]
        )}>
          {/* Floating Header with Better Animations */}
          <div className="thinking-header-modern">
            <div className="thinking-stage-modern">
              <Badge 
                variant="outline" 
                className={cn(
                  "stage-badge-modern",
                  stageColors[stage]
                )}
              >
                <div className="stage-indicator-modern">
                  <div className="stage-dots-modern">
                    <div className="dot-modern" />
                    <div className="dot-modern" />
                    <div className="dot-modern" />
                  </div>
                </div>
                <span className="stage-label">{stageLabels[stage]}</span>
              </Badge>
            </div>

            <div className="thinking-controls-modern">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowContent(!showContent)}
                className="control-btn-modern"
                aria-label={showContent ? "Hide thinking content" : "Show thinking content"}
              >
                {showContent ? (
                  <EyeOff className="w-3 h-3" aria-hidden="true" />
                ) : (
                  <Eye className="w-3 h-3" aria-hidden="true" />
                )}
              </Button>

              {content && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="control-btn-modern"
                  aria-label={isExpanded ? "Collapse thinking details" : "Expand thinking details"}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-3 h-3" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-3 h-3" aria-hidden="true" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Enhanced Content with Typewriter Effect */}
          {showContent && (
            <div className="thinking-text-modern">
              {content ? (
                <div className={cn(
                  "thinking-reasoning-modern",
                  !isExpanded && "thinking-reasoning-collapsed-modern"
                )}>
                  {isExpanded ? (
                    <ScrollArea className="thinking-scroll-modern">
                      <div className="thinking-content-text">
                        {content}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="thinking-preview">
                      {content.length > 100 
                        ? `${content.substring(0, 100)}...` 
                        : content
                      }
                    </div>
                  )}
                </div>
              ) : (
                <div className="thinking-placeholder-modern">
                  <span className="placeholder-text">
                    Working on your request...
                  </span>
                  <div className="thinking-dots-animated">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Facts Display */}
          {currentFact && (
            <div className={cn(
              "ai-fact-container",
              isFactRotating && "ai-fact-rotating"
            )}>
              <div className="ai-fact-header">
                <span className="ai-fact-icon" role="img" aria-label={currentFact.title}>
                  {currentFact.icon || '🤖'}
                </span>
                <span className="ai-fact-title">{currentFact.title}</span>
              </div>
              <div className="ai-fact-content">
                {currentFact.content}
              </div>
            </div>
          )}

          {/* Enhanced Progress Indicator with Smooth Animation */}
          <div className="thinking-progress-modern">
            <div className="progress-track">
              <div className={cn(
                "progress-bar-modern",
                `progress-${stage}`
              )}>
                <div className="progress-shimmer" />
              </div>
            </div>
            <div className="progress-label">
              {stage === 'analyzing' && '28%'}
              {stage === 'reasoning' && '72%'}
              {stage === 'responding' && '95%'}
            </div>
          </div>

          {/* Ripple Effect */}
          <div className="thinking-ripple" aria-hidden="true">
            <div className="ripple-circle" aria-hidden="true" />
            <div className="ripple-circle" aria-hidden="true" />
            <div className="ripple-circle" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}