import * as React from "react";
import { cn } from "@/lib/utils";

export interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  safe?: boolean;
  breakOnMobile?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const ResponsiveContainer = React.forwardRef<HTMLDivElement, ResponsiveContainerProps>(
  ({ 
    children, 
    className, 
    safe = true,
    breakOnMobile = false,
    maxWidth = 'full',
    padding = 'md',
    ...props 
  }, ref) => {
    const maxWidthClasses = {
      'xs': 'max-w-xs',
      'sm': 'max-w-sm',
      'md': 'max-w-md',
      'lg': 'max-w-lg',
      'xl': 'max-w-xl',
      '2xl': 'max-w-2xl',
      'full': 'max-w-full'
    };

    const paddingClasses = {
      'none': '',
      'sm': 'p-2 sm:p-3',
      'md': 'p-3 sm:p-4 lg:p-6',
      'lg': 'p-4 sm:p-6 lg:p-8'
    };

    const combinedClassName = cn(
      'w-full',
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      safe && 'w-full max-w-full',
      breakOnMobile && 'break-words sm:break-normal',
      'min-w-0', // Ensure container can shrink
      className
    );

    return (
      <div
        ref={ref}
        className={combinedClassName}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsiveContainer.displayName = "ResponsiveContainer";

export { ResponsiveContainer };

// Convenience component for flex containers
export const ResponsiveFlexContainer = ({ 
  direction = 'row',
  wrap = true,
  gap = 'md',
  align = 'start',
  justify = 'start',
  ...props 
}: ResponsiveContainerProps & {
  direction?: 'row' | 'col' | 'responsive';
  wrap?: boolean;
  gap?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
}) => {
  const directionClasses = {
    'row': 'flex-row',
    'col': 'flex-col',
    'responsive': 'flex-col sm:flex-row'
  };

  const gapClasses = {
    'sm': 'gap-2',
    'md': 'gap-3 sm:gap-4',
    'lg': 'gap-4 sm:gap-6'
  };

  const alignClasses = {
    'start': 'items-start',
    'center': 'items-center',
    'end': 'items-end',
    'stretch': 'items-stretch'
  };

  const justifyClasses = {
    'start': 'justify-start',
    'center': 'justify-center',
    'end': 'justify-end',
    'between': 'justify-between',
    'around': 'justify-around'
  };

  return (
    <ResponsiveContainer 
      {...props}
      className={cn(
        'flex',
        directionClasses[direction],
        wrap && 'flex-wrap',
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        props.className
      )}
    />
  );
};