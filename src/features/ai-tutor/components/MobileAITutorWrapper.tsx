/**
 * Mobile-optimized wrapper for AI Tutor with touch gestures and responsive design
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useViewport, useDeviceCapabilities, useKeyboardHeight } from '@/components/mobile/mobile-hooks';
import { 
  EnhancedSwipeCard, 
  AdaptiveLayout, 
  KeyboardAwareContainer,
  HapticButton,
  MobileScrollContainer 
} from '@/components/mobile/MobileOptimizations';
import { AITutorEnhanced } from './AITutorEnhanced';
import { Button } from '@/components/ui/button';
import { 
  Menu, 
  X, 
  MessageSquare, 
  Settings, 
  History,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface MobileAITutorWrapperProps {
  className?: string;
}

export const MobileAITutorWrapper: React.FC<MobileAITutorWrapperProps> = ({
  className
}) => {
  const { isMobile, isTablet, width, height } = useViewport();
  const { hasTouch, supportsVibration, prefersReducedMotion } = useDeviceCapabilities();
  const { isKeyboardVisible, keyboardHeight } = useKeyboardHeight();
  
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const [swipeHintShown, setSwipeHintShown] = React.useState(false);

  // Show swipe hint on first mobile visit
  React.useEffect(() => {
    if (isMobile && hasTouch && !swipeHintShown) {
      const hasSeenHint = localStorage.getItem('ai-tutor-swipe-hint-shown');
      if (!hasSeenHint) {
        setSwipeHintShown(true);
        localStorage.setItem('ai-tutor-swipe-hint-shown', 'true');
        
        // Auto-hide hint after 3 seconds
        setTimeout(() => setSwipeHintShown(false), 3000);
      }
    }
  }, [isMobile, hasTouch, swipeHintShown]);

  const handleSwipeLeft = () => {
    if (supportsVibration) navigator.vibrate(25);
    // Could open chat history or next session
    console.log('Swiped left - could open history');
  };

  const handleSwipeRight = () => {
    if (supportsVibration) navigator.vibrate(25);
    // Could close panels or go back
    console.log('Swiped right - could close panels');
  };

  const handleSwipeUp = () => {
    if (supportsVibration) navigator.vibrate(25);
    // Could minimize or show quick actions
    console.log('Swiped up - could show quick actions');
  };

  const handleSwipeDown = () => {
    if (supportsVibration) navigator.vibrate(25);
    // Could refresh or show settings
    console.log('Swiped down - could refresh');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (supportsVibration) navigator.vibrate(50);
  };

  const MobileLayout = () => (
    <div className="flex flex-col h-full">
      {/* Mobile Header */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <HapticButton
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="h-9 w-9 p-0"
              aria-label={showMobileMenu ? "Close menu" : "Open menu"}
            >
              {showMobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </HapticButton>
            <h1 className="text-lg font-semibold truncate">AI Tutor</h1>
          </div>
          
          <div className="flex items-center gap-1">
            <HapticButton
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-9 w-9 p-0"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </HapticButton>
          </div>
        </div>
        
        {/* Swipe Hint */}
        {swipeHintShown && (
          <div className="px-3 pb-2">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 text-xs text-primary">
              💡 Swipe left for history, right to close panels, up for actions
            </div>
          </div>
        )}
      </div>

      {/* Main Content with Gesture Support */}
      <EnhancedSwipeCard
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        onSwipeUp={handleSwipeUp}
        onSwipeDown={handleSwipeDown}
        className="flex-1 min-h-0"
        swipeThreshold={80}
      >
        <KeyboardAwareContainer className="h-full">
          <MobileScrollContainer
            enablePullToRefresh={true}
            onRefresh={async () => {
              // Refresh chat or reload AI service
              await new Promise(resolve => setTimeout(resolve, 1000));
            }}
            className="h-full"
          >
            <AITutorEnhanced />
          </MobileScrollContainer>
        </KeyboardAwareContainer>
      </EnhancedSwipeCard>

      {/* Mobile Quick Actions Bar */}
      {!isKeyboardVisible && (
        <div className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-t border-border">
          <div className="flex items-center justify-around p-2">
            <HapticButton
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2 px-3"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs">Chat</span>
            </HapticButton>
            
            <HapticButton
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2 px-3"
            >
              <History className="w-4 h-4" />
              <span className="text-xs">History</span>
            </HapticButton>
            
            <HapticButton
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2 px-3"
            >
              <Settings className="w-4 h-4" />
              <span className="text-xs">Settings</span>
            </HapticButton>
          </div>
        </div>
      )}
    </div>
  );

  const TabletLayout = () => (
    <div className="flex h-full">
      {/* Tablet Sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-border bg-muted/30">
        <div className="p-4">
          <h2 className="font-semibold mb-4">AI Tutor</h2>
          {/* Tablet-specific navigation */}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <AITutorEnhanced />
      </div>
    </div>
  );

  const DesktopLayout = () => (
    <AITutorEnhanced />
  );

  return (
    <div 
      className={cn(
        "ai-tutor-mobile-wrapper h-full",
        isFullscreen && "fixed inset-0 z-50 bg-background",
        prefersReducedMotion && "motion-reduce",
        className
      )}
      style={{
        height: isFullscreen ? '100vh' : undefined,
        paddingBottom: isKeyboardVisible ? `${keyboardHeight}px` : undefined,
      }}
    >
      <AdaptiveLayout
        mobileLayout={<MobileLayout />}
        tabletLayout={<TabletLayout />}
        desktopLayout={<DesktopLayout />}
      >
        <AITutorEnhanced />
      </AdaptiveLayout>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && isMobile && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="fixed top-0 left-0 h-full w-80 bg-background border-r border-border shadow-xl">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Menu</h2>
                <HapticButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileMenu(false)}
                  className="h-8 w-8 p-0"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </HapticButton>
              </div>
              
              {/* Mobile menu content */}
              <div className="space-y-2">
                <HapticButton
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  New Chat
                </HapticButton>
                
                <HapticButton
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <History className="w-4 h-4 mr-2" />
                  Chat History
                </HapticButton>
                
                <HapticButton
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </HapticButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};