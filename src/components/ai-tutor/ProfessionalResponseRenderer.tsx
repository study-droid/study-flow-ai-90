/**
 * Professional Response Renderer
 * Enhanced renderer with error boundaries, performance optimizations, and static Tailwind classes
 */

import React, { memo, useMemo, ErrorInfo, Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  BookOpen, 
  Clock, 
  Zap, 
  CheckCircle, 
  Eye, 
  EyeOff,
  RefreshCcw,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLOR_CLASSES } from './professional-response-constants';
import { RequiredResponseStructureSchema, createSafeDefaults } from '@/types/ai-tutor-schemas';
import type { RequiredResponseStructure } from '@/types/ai-tutor';
import type {
  ProfessionalResponseRendererProps,
  ErrorBoundaryState,
  ErrorBoundaryProps,
  ValidationResult,
  ValidationError,
  QualityAssessmentCardProps,
  ProcessingMetricsCardProps,
  QualityAssessment,
  ProcessingMetadata,
  RendererMetrics,
  PerformanceTracker,
  SafeRenderOptions
} from '@/types/professional-response-renderer';

// Static color class mapping moved to './professional-response-constants'

// Extended local metrics interface (keeping local properties)
interface LocalRendererMetrics extends RendererMetrics {
  errorCount: number;
  missingDataFields: string[];
  fallbacksUsed: string[];
  contentLength: number;
  sectionCount: number;
}

// Extended local error boundary state (keeping local properties)
interface LocalErrorBoundaryState extends ErrorBoundaryState {
  retryCount: number;
}

// Extended local props interface (keeping local properties)
interface LocalProfessionalResponseRendererProps extends ProfessionalResponseRendererProps {
  result: unknown;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onMetrics?: (metrics: LocalRendererMetrics) => void;
}

/**
 * Error Boundary Component
 * Catches rendering errors and provides graceful fallbacks
 */
class RendererErrorBoundary extends Component<
  { children: ReactNode; fallbackContent?: string; onError?: (error: Error, errorInfo: ErrorInfo) => void; onRetry?: () => void },
  LocalErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallbackContent?: string; onError?: (error: Error, errorInfo: ErrorInfo) => void; onRetry?: () => void }) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<LocalErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Log error for debugging
    console.error('Professional Response Renderer Error:', {
      error,
      errorInfo,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount
    });

    // Call error callback if provided
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1
    }));
    
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Rendering Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-red-700 dark:text-red-300">
              <p className="mb-2">Failed to render AI response content.</p>
              {this.state.retryCount < 3 && (
                <Button 
                  onClick={this.handleRetry}
                  size="sm" 
                  variant="outline"
                  className="mr-2"
                >
                  <RefreshCcw className="w-3 h-3 mr-1" />
                  Retry ({this.state.retryCount + 1}/3)
                </Button>
              )}
            </div>
            
            {this.props.fallbackContent && (
              <div className="border-t border-red-200 dark:border-red-700 pt-4">
                <p className="text-xs text-red-600 dark:text-red-400 mb-2">Fallback content:</p>
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded text-sm">
                  <pre className="whitespace-pre-wrap break-words overflow-hidden">
                    {this.props.fallbackContent}
                  </pre>
                </div>
              </div>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="border-t border-red-200 dark:border-red-700 pt-4">
                <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer mb-2">
                  Debug Information
                </summary>
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded text-xs font-mono">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  <div className="mb-2">
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1 text-xs">
                      {this.state.error.stack}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1 text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Data validation and processing
 */
function validateRendererData(result: unknown): ValidationResult {
  const startTime = performance.now();
  const metrics: Partial<RendererMetrics> = {
    errorCount: 0,
    missingDataFields: [],
    fallbacksUsed: []
  };

  let validatedData: RequiredResponseStructure;

  try {
    const validation = RequiredResponseStructureSchema.safeParse(result);
    
    if (validation.success) {
      validatedData = validation.data;
    } else {
      metrics.errorCount = (metrics.errorCount || 0) + 1;
      metrics.fallbacksUsed = [...(metrics.fallbacksUsed || []), 'schema_validation_failed'];
      metrics.missingDataFields = validation.error.issues.map(issue => issue.path.join('.'));
      
      validatedData = createSafeDefaults();
      
      // Try to preserve some content if available
      if (result?.formattedResponse?.content) {
        validatedData.formattedResponse.content = result.formattedResponse.content;
        metrics.fallbacksUsed.push('preserved_content');
      }
    }
  } catch (error) {
    metrics.errorCount = (metrics.errorCount || 0) + 1;
    metrics.fallbacksUsed = [...(metrics.fallbacksUsed || []), 'validation_exception'];
    validatedData = createSafeDefaults();
  }

  // Calculate content metrics
  const content = validatedData.formattedResponse.content;
  metrics.contentLength = content.length;
  metrics.sectionCount = validatedData.formattedResponse.structure.sections.length;
  
  const processingTime = performance.now() - startTime;
  metrics.renderTime = processingTime;

  return { data: validatedData, metrics };
}

/**
 * Memoized Section Component
 */
const Section = memo(function Section({ 
  title, 
  content, 
  index,
  color 
}: { 
  title: string; 
  content: string; 
  index: number;
  color: keyof typeof COLOR_CLASSES;
}) {
  const colorScheme = COLOR_CLASSES[color];
  
  return (
    <Card className={cn("mb-4 transition-all duration-200 hover:shadow-md", colorScheme.border)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap break-words leading-relaxed">
            {content}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Memoized Quality Metrics Panel
 */
const QualityMetricsPanel = memo(function QualityMetricsPanel({ 
  qualityAssessment,
  color 
}: QualityAssessmentCardProps) {
  const colorScheme = COLOR_CLASSES[color];
  
  return (
    <Card className={cn("mt-4", colorScheme.border, colorScheme.bg)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Quality Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Overall Score</span>
          <Badge variant="outline" className={colorScheme.text}>
            {qualityAssessment.overallScore}/100
          </Badge>
        </div>
        
        {qualityAssessment.breakdown && Object.entries(qualityAssessment.breakdown).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span className="capitalize text-muted-foreground">
              {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
            </span>
            <span className={cn("font-medium", colorScheme.text)}>
              {value}/100
            </span>
          </div>
        ))}

        {qualityAssessment.recommendations && qualityAssessment.recommendations.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <p className="text-xs text-muted-foreground mb-2">Recommendations:</p>
            <ul className="space-y-1">
              {qualityAssessment.recommendations.slice(0, 3).map((rec: string, index: number) => (
                <li key={index} className="text-xs flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * Memoized Performance Metrics Panel
 */
const PerformanceMetricsPanel = memo(function PerformanceMetricsPanel({ 
  metrics, 
  processingMetadata,
  color 
}: { 
  metrics: RendererMetrics;
  processingMetadata: ProcessingMetadata;
  color: keyof typeof COLOR_CLASSES;
}) {
  const colorScheme = COLOR_CLASSES[color];
  
  return (
    <Card className={cn("mt-4", colorScheme.border, colorScheme.accent)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Render Time</span>
              <span className="font-medium">{Math.round(metrics.renderTime)}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Content Length</span>
              <span className="font-medium">{metrics.contentLength.toLocaleString()} chars</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sections</span>
              <span className="font-medium">{metrics.sectionCount}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Processing Time</span>
              <span className="font-medium">
                {Math.round(processingMetadata?.processingTime || 0)}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Steps Completed</span>
              <span className="font-medium">
                {processingMetadata?.stepsCompleted?.length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Warnings</span>
              <span className="font-medium">
                {processingMetadata?.warnings?.length || 0}
              </span>
            </div>
          </div>
        </div>

        {metrics.fallbacksUsed && metrics.fallbacksUsed.length > 0 && (
          <div className="border-t pt-2 mt-2">
            <p className="text-xs text-muted-foreground mb-1">Fallbacks Used:</p>
            <div className="flex flex-wrap gap-1">
              {metrics.fallbacksUsed.map((fallback, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {fallback.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

/**
 * Main Professional Response Renderer Component
 */
export const ProfessionalResponseRenderer = memo(function ProfessionalResponseRenderer({
  result,
  color = 'blue',
  fallbackContent,
  showMetrics = false,
  className,
  onError,
  onMetrics
}: LocalProfessionalResponseRendererProps) {
  const [showRawData, setShowRawData] = React.useState(false);
  const [retryKey, setRetryKey] = React.useState(0);

  // Validate and process data
  const { data, metrics } = useMemo(() => {
    const result_data = validateRendererData(result);
    
    // Log performance warning if render is slow
    if (result_data.metrics.renderTime! > 100) {
      console.warn('Slow render detected:', result_data.metrics);
    }
    
    return result_data;
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, retryKey]);

  // Report metrics to callback
  React.useEffect(() => {
    if (onMetrics && metrics.renderTime !== undefined) {
      onMetrics(metrics as RendererMetrics);
    }
  }, [metrics, onMetrics]);

  const colorScheme = COLOR_CLASSES[color];
  const content = data.formattedResponse.content;
  const sections = data.formattedResponse.structure.sections;
  const metadata = data.formattedResponse.metadata;
  const qualityAssessment = data.qualityAssessment;
  const processingMetadata = data.processingMetadata;

  // Handle retry
  const handleRetry = React.useCallback(() => {
    setRetryKey(prev => prev + 1);
  }, []);

  return (
    <RendererErrorBoundary 
      fallbackContent={fallbackContent} 
      onError={onError}
      onRetry={handleRetry}
    >
      <div className={cn("space-y-4", className)}>
        {/* Header Section */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("flex items-center gap-1", colorScheme.text)}>
              <BookOpen className="w-3 h-3" />
              Professional Response
            </Badge>
            
            {metadata?.responseType && (
              <Badge variant="secondary">
                {metadata.responseType.replace(/_/g, ' ')}
              </Badge>
            )}
            
            {metadata?.difficulty && (
              <Badge 
                variant={
                  metadata.difficulty === 'hard' ? 'destructive' : 
                  metadata.difficulty === 'medium' ? 'default' : 
                  'secondary'
                }
              >
                {metadata.difficulty}
              </Badge>
            )}
            
            {metadata?.estimatedReadTime && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {metadata.estimatedReadTime} min read
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showMetrics && (
              <Badge variant="outline" className="text-xs">
                {Math.round(metrics.renderTime!)}ms
              </Badge>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRawData(!showRawData)}
              className="h-6 px-2 text-xs"
            >
              {showRawData ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {!showRawData ? (
          <>
            {/* Main Content */}
            <Card className={cn("transition-all duration-200", colorScheme.border, colorScheme.bg)}>
              <CardContent className="pt-6">
                <ScrollArea className="max-h-[600px]">
                  {/* Render content as plain markdown with proper formatting */}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                      {content}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Structure Overview */}
            {sections && sections.length > 0 && (
              <Card className={cn("border-l-4", colorScheme.border)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Content Structure ({sections.length} sections)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sections.map((section, index) => (
                      <div 
                        key={index} 
                        className={cn(
                          "flex items-center justify-between p-2 rounded text-sm",
                          colorScheme.accent
                        )}
                      >
                        <span className="font-medium truncate pr-4">{section.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {section.wordCount} words
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quality Assessment */}
            {qualityAssessment && showMetrics && (
              <QualityMetricsPanel 
                qualityAssessment={qualityAssessment}
                color={color}
              />
            )}

            {/* Performance Metrics */}
            {showMetrics && (
              <PerformanceMetricsPanel 
                metrics={metrics as RendererMetrics}
                processingMetadata={processingMetadata}
                color={color}
              />
            )}
          </>
        ) : (
          /* Raw Data View */
          <Card className={cn("", colorScheme.border)}>
            <CardHeader>
              <CardTitle className="text-sm">Raw Response Data</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <pre className="text-xs bg-muted p-4 rounded overflow-auto font-mono leading-relaxed">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </RendererErrorBoundary>
  );
});

export default ProfessionalResponseRenderer;



