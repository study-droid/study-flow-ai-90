import React, { lazy, Suspense, ComponentType } from 'react';
import React, { lazy, Suspense, ComponentType } from 'react';
export const preloadComponent = (
  componentLoader: () => Promise<{ default: ComponentType<any> }>
) => {
  componentLoader();
};

export const preloadCriticalComponents = () => {
  const ric: any = (window as any).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(() => {
      import('@/pages/Analytics');
      import('@/pages/Study');
      import('@/pages/Tasks');
    });
  }
};

export const createLazyRoute = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = lazy(importFn);
  
  return (props: any) => (
    <Suspense fallback={fallback || <div />}> 
      <LazyComponent {...props} />
    </Suspense>
  );
};
