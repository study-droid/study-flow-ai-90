/**
 * Mobile-optimized AI Tutor page with full responsive design
 */

import React from 'react';
import { MobileAITutorWrapper } from '@/features/ai-tutor/components/MobileAITutorWrapper';
import { useViewport, useDeviceCapabilities } from '@/components/mobile/mobile-hooks';
import { cn } from '@/lib/utils';

export const MobileAITutorPage: React.FC = () => {
  const { isMobile, isTablet, width, height } = useViewport();
  const { hasTouch, prefersReducedMotion } = useDeviceCapabilities();

  React.useEffect(() => {
    // Set viewport meta tag for optimal mobile experience
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }

    // Add mobile-specific classes to body
    document.body.classList.add('mobile-optimized');
    if (hasTouch) {
      document.body.classList.add('touch-device');
    }
    if (prefersReducedMotion) {
      document.body.classList.add('reduced-motion');
    }

    return () => {
      document.body.classList.remove('mobile-optimized', 'touch-device', 'reduced-motion');
      // Reset viewport
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
    };
  }, [hasTouch, prefersReducedMotion]);

  return (
    <div 
      className={cn(
        "mobile-ai-tutor-page",
        "h-screen w-screen overflow-hidden",
        "bg-background text-foreground",
        isMobile && "mobile-layout",
        isTablet && "tablet-layout",
        hasTouch && "touch-enabled",
        prefersReducedMotion && "motion-reduced"
      )}
      style={{
        height: '100vh',
        width: '100vw',
        // Use CSS custom properties for dynamic viewport units
        '--vh': `${height * 0.01}px`,
        '--vw': `${width * 0.01}px`,
      }}
    >
      <MobileAITutorWrapper className="h-full w-full" />
    </div>
  );
};

export default MobileAITutorPage;