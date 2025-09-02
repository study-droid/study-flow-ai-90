import React from 'react';
import { cn } from '@/lib/utils';

interface ThinkingIndicatorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  variant?: 'dots' | 'pulse' | 'typing';
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  className,
  size = 'md',
  label = 'AI is thinking',
  variant = 'dots'
}) => {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  const containerSizeClasses = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2'
  };

  if (variant === 'pulse') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="relative">
          <div className={cn(
            'rounded-full bg-primary animate-ping absolute',
            sizeClasses[size]
          )} />
          <div className={cn(
            'rounded-full bg-primary',
            sizeClasses[size]
          )} />
        </div>
        {label && (
          <span className="text-sm text-muted-foreground animate-pulse">
            {label}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'typing') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground animate-pulse">
            {label}
          </span>
          <span className="inline-flex">
            <span className="animate-typing-cursor">|</span>
          </span>
        </div>
      </div>
    );
  }

  // Default dots variant
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex items-center', containerSizeClasses[size])}>
        <span
          className={cn(
            'rounded-full bg-primary animate-thinking-dot-1',
            sizeClasses[size]
          )}
        />
        <span
          className={cn(
            'rounded-full bg-primary animate-thinking-dot-2',
            sizeClasses[size]
          )}
        />
        <span
          className={cn(
            'rounded-full bg-primary animate-thinking-dot-3',
            sizeClasses[size]
          )}
        />
      </div>
      {label && (
        <span className="text-sm text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
};

export const ChatThinkingBubble: React.FC<{
  className?: string;
}> = ({ className }) => {
  return (
    <div className={cn('flex gap-3', className)}>
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
        <div className="h-4 w-4 rounded-full bg-primary animate-pulse" />
      </div>
      <div className="bg-muted rounded-lg p-3 max-w-[200px]">
        <ThinkingIndicator size="sm" label="" />
      </div>
    </div>
  );
};