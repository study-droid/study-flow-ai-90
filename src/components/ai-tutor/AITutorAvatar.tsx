import React, { useState } from 'react';
import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AITutorAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallback?: React.ReactNode;
  alt?: string;
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5', 
  lg: 'w-6 h-6',
  xl: 'w-16 h-16'
};

const containerSizeClasses = {
  xs: 'w-5 h-5',
  sm: 'w-6 h-6',
  md: 'w-7 h-7', 
  lg: 'w-8 h-8',
  xl: 'w-20 h-20'
};

export const AITutorAvatar: React.FC<AITutorAvatarProps> = ({
  size = 'sm',
  className,
  fallback,
  alt = 'AI Tutor'
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizeClass = sizeClasses[size];
  const containerSizeClass = containerSizeClasses[size];
  const defaultFallback = <Brain className={cn(sizeClass, "text-primary")} />;

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  // Show fallback if image failed to load
  if (imageError) {
    return (
      <div className={cn(
        containerSizeClass, 
        "flex items-center justify-center rounded-md",
        "bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 p-1.5 shadow-md border border-gray-200",
        "dark:bg-white dark:from-white dark:via-white dark:to-white dark:p-0.5 dark:shadow-sm dark:border-gray-100",
        className
      )}>
        {fallback || defaultFallback}
      </div>
    );
  }

  return (
    <div className={cn(containerSizeClass, "relative flex items-center justify-center", className)}>
      {/* Loading state - show fallback while loading */}
      {isLoading && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center rounded-md",
          "bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 p-1.5 shadow-md border border-gray-200",
          "dark:bg-white dark:from-white dark:via-white dark:to-white dark:p-0.5 dark:shadow-sm dark:border-gray-100",
        )}>
          {fallback || defaultFallback}
        </div>
      )}
      
      {/* AI Tutor Image with enhanced visibility */}
      <div className={cn(
        "w-full h-full flex items-center justify-center rounded-md",
        // Light mode: elegant silver gradient with proper padding
        "bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 p-1.5 shadow-md border border-gray-200",
        // Dark mode: keep white background with padding
        "dark:bg-white dark:from-white dark:via-white dark:to-white dark:p-0.5 dark:shadow-sm dark:border-gray-100",
        "transition-all duration-200 hover:shadow-lg"
      )}>
        <img
          src="/ai_tutor.png"
          alt={alt}
          className={cn(
            "w-full h-full object-contain max-w-none", 
            isLoading ? "opacity-0" : "opacity-100",
            "transition-opacity duration-200"
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </div>
    </div>
  );
};

export default AITutorAvatar;