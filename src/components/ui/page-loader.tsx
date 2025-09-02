import { BookOpen, Brain, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageLoaderProps {
  className?: string;
  message?: string;
}

export const PageLoader = ({ className, message = 'Loading...' }: PageLoaderProps) => {
  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/20',
        className
      )}
    >
      <div className="relative">
        {/* Animated circles */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-32 w-32 rounded-full border-4 border-primary/20 animate-ping" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-24 w-24 rounded-full border-4 border-primary/30 animate-ping animation-delay-200" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-16 rounded-full border-4 border-primary/40 animate-ping animation-delay-400" />
        </div>
        
        {/* Center icon */}
        <div className="relative flex items-center justify-center h-32 w-32">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/60 rounded-full animate-pulse" />
          <BookOpen className="h-12 w-12 text-white relative z-10" />
        </div>
      </div>
      
      <p className="mt-8 text-lg font-medium text-foreground animate-pulse">
        {message}
      </p>
      
      {/* Loading dots */}
      <div className="flex gap-1 mt-4">
        <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
        <div className="h-2 w-2 bg-primary rounded-full animate-bounce animation-delay-100" />
        <div className="h-2 w-2 bg-primary rounded-full animate-bounce animation-delay-200" />
      </div>
    </div>
  );
};

export const SectionLoader = ({ className, message = 'Loading content...' }: PageLoaderProps) => {
  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center p-8',
        className
      )}
    >
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-t-primary border-r-primary/60 border-b-primary/30 border-l-primary/10 animate-spin" />
        <Brain className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
};

export const InlineLoader = ({ className }: { className?: string }) => {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <Zap className="h-4 w-4 text-primary animate-pulse" />
      <span className="text-sm text-muted-foreground">Processing...</span>
    </div>
  );
};