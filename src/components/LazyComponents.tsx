/**
 * Lazy-loaded components for code splitting
 * Reduces initial bundle size by loading components on demand
 */

import { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Lazy load heavy pages
export const LazyAnalytics = lazy(() => 
  import('@/pages/Analytics').then(module => ({
    default: module.default
  }))
);

export const LazyAITutor = lazy(() => 
  import('@/pages/AITutor').then(module => ({
    default: module.default
  }))
);

export const LazyCalendar = lazy(() => 
  import('@/pages/Calendar').then(module => ({
    default: module.default
  }))
);

export const LazyFlashcards = lazy(() => 
  import('@/pages/Flashcards').then(module => ({
    default: module.default
  }))
);

export const LazyPerformance = lazy(() => 
  import('@/pages/Performance').then(module => ({
    default: module.default
  }))
);

export const LazyAchievements = lazy(() => 
  import('@/pages/Achievements').then(module => ({
    default: module.default
  }))
);

export const LazyAIRecommendations = lazy(() => 
  import('@/pages/AIRecommendations').then(module => ({
    default: module.default
  }))
);

export const LazySettings = lazy(() => 
  import('@/pages/Settings').then(module => ({
    default: module.default
  }))
);

export const LazyTimetable = lazy(() => 
  import('@/pages/Timetable').then(module => ({
    default: module.default
  }))
);

export const LazySecurity = lazy(() => 
  import('@/pages/Security').then(module => ({
    default: module.default
  }))
);

// Lazy load heavy components
export const LazyPDFExport = lazy(() => 
  import('@/components/export/PDFExport').then(module => ({
    default: module.PDFExport
  }))
);

export const LazyChartComponents = lazy(() => 
  import('@/components/charts/ChartComponents').then(module => ({
    default: module.ChartComponents
  }))
);

export const LazyRichTextEditor = lazy(() => 
  import('@/components/editor/RichTextEditor').then(module => ({
    default: module.RichTextEditor
  }))
);

// Wrapper component for lazy loading with custom fallback
interface LazyWrapperProps {
  component: ComponentType<any>;
  fallback?: React.ReactNode;
  props?: any;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  component: Component, 
  fallback = <LoadingFallback />,
  props = {}
}) => (
  <Suspense fallback={fallback}>
    <Component {...props} />
  </Suspense>
);

// Preload function for critical components
export const preloadComponent = (
  componentLoader: () => Promise<{ default: ComponentType<any> }>
) => {
  componentLoader();
};

// Preload critical components on idle
export const preloadCriticalComponents = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Preload commonly used heavy components
      import('@/pages/Analytics');
      import('@/pages/Study');
      import('@/pages/Tasks');
    });
  }
};

// Export helper for route-based code splitting
export const createLazyRoute = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = lazy(importFn);
  
  return (props: any) => (
    <Suspense fallback={fallback || <LoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};