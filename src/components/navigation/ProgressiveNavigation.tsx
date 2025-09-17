import { Suspense, useState, useTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { BrandCard } from '@/components/brand/BrandCard';

interface ProgressiveLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export const ProgressiveLoader = ({ 
  children, 
  fallback,
  className 
}: ProgressiveLoaderProps) => {
  return (
    <div className={cn("w-full", className)}>
      <Suspense fallback={fallback || <ProgressiveLoadingSpinner />}>
        {children}
      </Suspense>
    </div>
  );
};

export const ProgressiveLoadingSpinner = () => (
  <BrandCard variant="glass" className="p-8">
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center animate-pulse">
          <span className="text-white text-xl">🧸</span>
        </div>
        <Loader2 className="absolute -top-1 -right-1 h-6 w-6 text-primary animate-spin" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="font-heading font-semibold text-primary">
          Teddy is preparing something special...
        </h3>
        <p className="text-sm text-muted-foreground">
          Just a moment while we load your content! ✨
        </p>
      </div>
    </div>
  </BrandCard>
);

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

const navigationItems: NavigationItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: '🏠',
    description: 'Your learning overview',
    priority: 'high'
  },
  {
    path: '/tutor',
    label: 'AI Tutor',
    icon: '🧸',
    description: 'Chat with Teddy',
    priority: 'high'
  },
  {
    path: '/calendar',
    label: 'Calendar',
    icon: '📅',
    description: 'Plan your studies',
    priority: 'medium'
  },
  {
    path: '/study',
    label: 'Study Session',
    icon: '📚',
    description: 'Focus and learn',
    priority: 'medium'
  },
  {
    path: '/pomodoro',
    label: 'Pomodoro',
    icon: '⏰',
    description: 'Time management',
    priority: 'low'
  },
  {
    path: '/analytics',
    label: 'Analytics',
    icon: '📊',
    description: 'Track progress',
    priority: 'low'
  }
];

export const EnhancedNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPending, startTransition] = useTransition();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleNavigation = (path: string) => {
    startTransition(() => {
      navigate(path);
    });
  };

  // Prefetch routes based on priority
  const prefetchRoute = (path: string) => {
    // In a real app, this would prefetch the route chunks
    console.log(`Prefetching route: ${path}`);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        Quick Navigation
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isHovered = hoveredItem === item.path;
          
          return (
            <BrandCard
              key={item.path}
              variant={isActive ? "premium" : "warm"}
              className={cn(
                "cursor-pointer transition-all duration-300 relative overflow-hidden",
                isActive && "ring-2 ring-primary ring-offset-2",
                isHovered && "scale-105 shadow-lg",
                isPending && "opacity-50 pointer-events-none"
              )}
              onMouseEnter={() => {
                setHoveredItem(item.path);
                prefetchRoute(item.path);
              }}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div 
                className="p-4 space-y-3"
                onClick={() => handleNavigation(item.path)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{item.icon}</div>
                    <div>
                      <h4 className="font-semibold text-sm">{item.label}</h4>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isHovered && "translate-x-1",
                    isActive && "text-primary"
                  )} />
                </div>
                
                {/* Priority indicator */}
                <div className="flex items-center justify-between">
                  <div className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    item.priority === 'high' && "bg-primary/10 text-primary",
                    item.priority === 'medium' && "bg-warning/10 text-warning",
                    item.priority === 'low' && "bg-muted text-muted-foreground"
                  )}>
                    {item.priority} priority
                  </div>
                  
                  {isPending && location.pathname === item.path && (
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  )}
                </div>
              </div>
              
              {/* Animated background */}
              {isHovered && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent animate-fade-in" />
              )}
            </BrandCard>
          );
        })}
      </div>
      
      {isPending && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Navigating with Teddy...
        </div>
      )}
    </div>
  );
};