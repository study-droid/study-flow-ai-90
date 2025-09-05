import React from 'react';
import FeatureErrorBoundary, { FeatureType, FeatureErrorBoundaryProps } from './FeatureErrorBoundary';

export const withFeatureErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  feature: FeatureType,
  errorBoundaryProps?: Omit<FeatureErrorBoundaryProps, 'children' | 'feature'>
) => {
  return React.forwardRef<unknown, P>((props, ref) => (
    <FeatureErrorBoundary feature={feature} {...errorBoundaryProps}>
      <Component {...props} ref={ref} />
    </FeatureErrorBoundary>
  ));
};


