/**
 * Comprehensive AI Tutor Integration Component
 * Brings together all components with enhanced polish and animations
 */

import React, { Suspense } from 'react';
import { AccessibilityProvider } from '@/components/accessibility/AccessibilityProvider';
import { MobileAITutorWrapper } from './MobileAITutorWrapper';
import { AITutorEnhanced } from './AITutorEnhanced';
import { useMobile } from '@/components/mobile/mobile-hooks';
import { useAccessibility } from '@/components/accessibility/AccessibilityProvider';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { usePerformanceMetrics } from '@/services/monitoring/performance-metrics';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AITutorIntegratedProps {
  className?: string;
}

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64 bg-background/50 backdrop-blur-sm rounded-lg">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading AI Tutor...</p>
    </div>
  </div>
);

const ErrorFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => (
  <div className="flex items-center justify-center h-64 bg-destructive/5 border border-destructive/20 rounded-lg">
    <div className="text-center p-6">
      <h3 className="text-lg font-semibold text-destructive mb-2">Something went wrong</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {error.message || 'An unexpected error occurred while loading the AI Tutor.'}
      </p>
      <button
        onClick={resetError}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
);

export const AITutorIntegrated: React.FC<AITutorIntegratedProps> = ({ className }) => {
  const isMobile = useMobile();
  const { trackPageLoad } = usePerformanceMetrics();

  // Track page load performance
  React.useEffect(() => {
    const startTime = performance.now();
    
    const handleLoad = () => {
      const loadTime = performance.now() - startTime;
      trackPageLoad('ai-tutor-integrated', loadTime);
    };

    // Track when component is fully loaded
    const timer = setTimeout(handleLoad, 100);
    return () => clearTimeout(timer);
  }, [trackPageLoad]);

  return (
    <AccessibilityProvider>
      <div 
        className={cn(
          "ai-tutor-integrated h-full w-full",
          "transition-all duration-300 ease-out",
          className
        )}
        data-testid="ai-tutor-integrated"
      >
        <Suspense fallback={<LoadingFallback />}>
          {isMobile ? (
            <MobileAITutorWrapper className="h-full" />
          ) : (
            <AITutorEnhanced />
          )}
        </Suspense>
      </div>
    </AccessibilityProvider>
  );
};

/**
 * Enhanced AI Tutor with Error Boundary
 */
class AITutorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AI Tutor Error:', error, errorInfo);
    
    // Track error for monitoring
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      });
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetError={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Main export with error boundary
 */
export const AITutorWithErrorBoundary: React.FC<AITutorIntegratedProps> = (props) => (
  <AITutorErrorBoundary>
    <AITutorIntegrated {...props} />
  </AITutorErrorBoundary>
);

export default AITutorWithErrorBoundary;