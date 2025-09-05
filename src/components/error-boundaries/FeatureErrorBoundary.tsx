/**
 * Feature Error Boundary
 * 
 * Specialized error boundary for different feature areas that provides
 * graceful degradation without breaking the entire application.
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/services/logging/logger';

export type FeatureType = 
  | 'auth'
  | 'ai-tutor' 
  | 'dashboard'
  | 'tables'
  | 'tasks'
  | 'analytics'
  | 'settings'
  | 'notifications'
  | 'study-sessions'
  | 'flashcards'
  | 'goals'
  | 'timetable'
  | 'subjects';

export interface FeatureErrorBoundaryProps {
  children: ReactNode;
  feature: FeatureType;
  fallbackComponent?: React.ComponentType<FeatureErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo, feature: FeatureType) => void;
  isolateErrors?: boolean; // Prevent errors from bubbling up
  enableRecovery?: boolean;
  displayMode?: 'inline' | 'card' | 'minimal';
  gracefulDegradation?: {
    enabled: boolean;
    fallbackContent?: ReactNode;
    hideFeature?: boolean;
  };
}

interface FeatureErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  feature: FeatureType;
  resetError: () => void;
  hideError: () => void;
  canRetry: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  isHidden: boolean;
  isExpanded: boolean;
  timestamp: string;
}

const FEATURE_CONFIG: Record<FeatureType, {
  displayName: string;
  maxRetries: number;
  criticalLevel: 'low' | 'medium' | 'high' | 'critical';
  gracefulDegradation: boolean;
  fallbackMessage: string;
  recoveryActions: string[];
}> = {
  auth: {
    displayName: 'Authentication',
    maxRetries: 2,
    criticalLevel: 'critical',
    gracefulDegradation: false,
    fallbackMessage: 'Authentication is required to use this application.',
    recoveryActions: ['Refresh page', 'Clear browser data', 'Try incognito mode']
  },
  'ai-tutor': {
    displayName: 'AI Tutor',
    maxRetries: 3,
    criticalLevel: 'high',
    gracefulDegradation: true,
    fallbackMessage: 'The AI Tutor is temporarily unavailable. Other features remain functional.',
    recoveryActions: ['Try again', 'Check network connection', 'Use alternative study methods']
  },
  dashboard: {
    displayName: 'Dashboard',
    maxRetries: 2,
    criticalLevel: 'medium',
    gracefulDegradation: true,
    fallbackMessage: 'Dashboard data is temporarily unavailable.',
    recoveryActions: ['Refresh dashboard', 'Navigate to other features', 'Try again later']
  },
  tables: {
    displayName: 'Table Builder',
    maxRetries: 3,
    criticalLevel: 'medium',
    gracefulDegradation: true,
    fallbackMessage: 'Table creation is temporarily unavailable.',
    recoveryActions: ['Try creating a simpler table', 'Use manual table creation', 'Save work and retry']
  },
  tasks: {
    displayName: 'Task Management',
    maxRetries: 2,
    criticalLevel: 'medium',
    gracefulDegradation: true,
    fallbackMessage: 'Task management features are temporarily unavailable.',
    recoveryActions: ['View existing tasks', 'Create tasks manually', 'Sync when available']
  },
  analytics: {
    displayName: 'Analytics',
    maxRetries: 1,
    criticalLevel: 'low',
    gracefulDegradation: true,
    fallbackMessage: 'Analytics data is temporarily unavailable.',
    recoveryActions: ['View basic statistics', 'Try again later', 'Check other sections']
  },
  settings: {
    displayName: 'Settings',
    maxRetries: 2,
    criticalLevel: 'medium',
    gracefulDegradation: true,
    fallbackMessage: 'Settings management is temporarily unavailable.',
    recoveryActions: ['Use default settings', 'Try specific setting sections', 'Contact support']
  },
  notifications: {
    displayName: 'Notifications',
    maxRetries: 1,
    criticalLevel: 'low',
    gracefulDegradation: true,
    fallbackMessage: 'Notification system is temporarily unavailable.',
    recoveryActions: ['Check manually for updates', 'Enable browser notifications', 'Try again later']
  },
  'study-sessions': {
    displayName: 'Study Sessions',
    maxRetries: 2,
    criticalLevel: 'high',
    gracefulDegradation: true,
    fallbackMessage: 'Study session tracking is temporarily unavailable.',
    recoveryActions: ['Track time manually', 'Use basic timer', 'Sync data later']
  },
  flashcards: {
    displayName: 'Flashcards',
    maxRetries: 2,
    criticalLevel: 'medium',
    gracefulDegradation: true,
    fallbackMessage: 'Flashcard system is temporarily unavailable.',
    recoveryActions: ['Create physical flashcards', 'Use text-based review', 'Try again later']
  },
  goals: {
    displayName: 'Goal Tracking',
    maxRetries: 1,
    criticalLevel: 'low',
    gracefulDegradation: true,
    fallbackMessage: 'Goal tracking is temporarily unavailable.',
    recoveryActions: ['Track goals manually', 'Set reminders', 'Review progress later']
  },
  timetable: {
    displayName: 'Timetable',
    maxRetries: 2,
    criticalLevel: 'medium',
    gracefulDegradation: true,
    fallbackMessage: 'Timetable features are temporarily unavailable.',
    recoveryActions: ['Use calendar app', 'Create manual schedule', 'View existing entries']
  },
  subjects: {
    displayName: 'Subject Management',
    maxRetries: 2,
    criticalLevel: 'medium',
    gracefulDegradation: true,
    fallbackMessage: 'Subject management is temporarily unavailable.',
    recoveryActions: ['View subjects list', 'Access individual subjects', 'Use search function']
  }
};

export class FeatureErrorBoundary extends Component<FeatureErrorBoundaryProps, State> {
  private readonly featureConfig: typeof FEATURE_CONFIG[FeatureType];

  constructor(props: FeatureErrorBoundaryProps) {
    super(props);
    
    this.featureConfig = FEATURE_CONFIG[props.feature];
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      isHidden: false,
      isExpanded: false,
      timestamp: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `feature_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
    
    return {
      hasError: true,
      error,
      errorId,
      timestamp: new Date().toISOString()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, feature, isolateErrors = true } = this.props;
    
    this.setState({ errorInfo });

    // Log the error
    logger.error(`Feature Error Boundary: ${feature}`, 'FeatureErrorBoundary', {
      feature,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      criticalLevel: this.featureConfig.criticalLevel
    });

    // Call custom error handler
    if (onError) {
      try {
        onError(error, errorInfo, feature);
      } catch (handlerError) {
        logger.error('Feature error handler failed', 'FeatureErrorBoundary', handlerError);
      }
    }

    // Don't let the error bubble up if isolateErrors is true
    if (isolateErrors) {
      // Error is contained within this feature
      logger.info(`Error isolated within feature: ${feature}`, 'FeatureErrorBoundary');
    }
  }

  private handleRetry = (): void => {
    if (this.state.retryCount >= this.featureConfig.maxRetries) {
      logger.warn(`Max retries reached for feature: ${this.props.feature}`, 'FeatureErrorBoundary');
      return;
    }

    logger.info(`Retrying feature: ${this.props.feature} (${this.state.retryCount + 1}/${this.featureConfig.maxRetries})`, 'FeatureErrorBoundary');
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: prevState.retryCount + 1,
      isExpanded: false,
      timestamp: ''
    }));
  };

  private handleReset = (): void => {
    logger.info(`Resetting feature error boundary: ${this.props.feature}`, 'FeatureErrorBoundary');
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      isHidden: false,
      isExpanded: false,
      timestamp: ''
    });
  };

  private handleHide = (): void => {
    this.setState({ isHidden: true });
  };

  private handleShow = (): void => {
    this.setState({ isHidden: false });
  };

  private toggleExpanded = (): void => {
    this.setState(prevState => ({ isExpanded: !prevState.isExpanded }));
  };

  private getCriticalityColor(): string {
    switch (this.featureConfig.criticalLevel) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  }

  private renderMinimalError(): ReactNode {
    return (
      <div className="p-2 bg-muted/50 rounded border-l-4 border-destructive">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium">
              {this.featureConfig.displayName} unavailable
            </span>
          </div>
          <div className="flex items-center gap-1">
            {this.state.retryCount < this.featureConfig.maxRetries && (
              <Button
                variant="ghost"
                size="sm"
                onClick={this.handleRetry}
                className="h-6 px-2 text-xs"
              >
                Retry
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={this.handleHide}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  private renderInlineError(): ReactNode {
    const canRetry = this.state.retryCount < this.featureConfig.maxRetries;

    return (
      <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <h4 className="font-medium text-foreground">
                {this.featureConfig.displayName} Error
              </h4>
              <p className="text-sm text-muted-foreground">
                {this.featureConfig.fallbackMessage}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={this.getCriticalityColor() as any}>
              {this.featureConfig.criticalLevel}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={this.handleHide}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleRetry}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Try Again ({this.featureConfig.maxRetries - this.state.retryCount} left)
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={this.handleReset}
          >
            Reset
          </Button>
        </div>

        <Collapsible open={this.state.isExpanded} onOpenChange={this.toggleExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span>Recovery suggestions</span>
              {this.state.isExpanded ? 
                <ChevronUp className="w-3 h-3" /> : 
                <ChevronDown className="w-3 h-3" />
              }
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pt-2 space-y-1">
              {this.featureConfig.recoveryActions.map((action, index) => (
                <div key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                  <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                  {action}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  private renderCardError(): ReactNode {
    const canRetry = this.state.retryCount < this.featureConfig.maxRetries;

    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-full">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {this.featureConfig.displayName} Unavailable
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {this.featureConfig.fallbackMessage}
                </p>
              </div>
            </div>
            
            <Badge variant={this.getCriticalityColor() as any}>
              {this.featureConfig.criticalLevel}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-medium">Error ID:</span>
              <code className="ml-2 bg-muted px-1 py-0.5 rounded">
                {this.state.errorId}
              </code>
            </div>
            <div>
              <span className="font-medium">Time:</span>
              <span className="ml-2">
                {new Date(this.state.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>

          <div>
            <h5 className="font-medium text-sm mb-2">Suggested actions:</h5>
            <ul className="space-y-1">
              {this.featureConfig.recoveryActions.map((action, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
                  {action}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2">
            {canRetry && (
              <Button
                variant="default"
                size="sm"
                onClick={this.handleRetry}
                className="flex-1"
              >
                <RefreshCw className="w-3 h-3 mr-2" />
                Try Again ({this.featureConfig.maxRetries - this.state.retryCount} attempts left)
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="flex-1"
            >
              Reset Feature
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  render(): ReactNode {
    // If error is hidden, don't render anything
    if (this.state.isHidden) {
      return null;
    }

    if (this.state.hasError) {
      const { fallbackComponent, displayMode = 'card', gracefulDegradation } = this.props;

      // Use custom fallback component if provided
      if (fallbackComponent) {
        const FallbackComponent = fallbackComponent;
        return (
          <FallbackComponent
            error={this.state.error!}
            errorInfo={this.state.errorInfo!}
            feature={this.props.feature}
            resetError={this.handleReset}
            hideError={this.handleHide}
            canRetry={this.state.retryCount < this.featureConfig.maxRetries}
          />
        );
      }

      // Graceful degradation - show fallback content instead of error
      if (gracefulDegradation?.enabled && gracefulDegradation.fallbackContent) {
        if (gracefulDegradation.hideFeature) {
          return gracefulDegradation.fallbackContent;
        }
        
        return (
          <div className="space-y-2">
            {displayMode === 'minimal' && this.renderMinimalError()}
            {gracefulDegradation.fallbackContent}
          </div>
        );
      }

      // Render error UI based on display mode
      switch (displayMode) {
        case 'minimal':
          return this.renderMinimalError();
        case 'inline':
          return this.renderInlineError();
        case 'card':
        default:
          return this.renderCardError();
      }
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for feature error boundaries
 */
// HOC moved to './withFeatureErrorBoundary'

export default FeatureErrorBoundary;
