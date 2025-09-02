import * as React from "react";
import { cn } from "@/lib/utils";

export interface ResponsiveTextProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  clamp?: 1 | 2 | 3;
  truncate?: boolean;
  safe?: boolean;
  responsive?: boolean;
}

const ResponsiveText = React.forwardRef<HTMLElement, ResponsiveTextProps>(
  ({ 
    children, 
    className, 
    as = 'p', 
    size = 'base',
    clamp,
    truncate = false,
    safe = true,
    responsive = true,
    ...props 
  }, ref) => {
    const Component = as;

    const sizeClasses = responsive ? {
      'xs': 'text-responsive-xs',
      'sm': 'text-responsive-sm',
      'base': 'text-responsive-base',
      'lg': 'text-responsive-lg',
      'xl': 'text-responsive-xl',
      '2xl': 'text-lg sm:text-xl md:text-2xl',
      '3xl': 'text-xl sm:text-2xl md:text-3xl'
    } : {
      'xs': 'text-xs',
      'sm': 'text-sm',
      'base': 'text-base',
      'lg': 'text-lg',
      'xl': 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl'
    };

    const combinedClassName = cn(
      sizeClasses[size],
      safe && 'text-safe',
      truncate && 'text-ellipsis-safe',
      clamp && `text-clamp-${clamp}`,
      'min-w-0', // Ensure text can shrink
      className
    );

    return (
      <Component
        ref={ref as any}
        className={combinedClassName}
        title={typeof children === 'string' && (truncate || clamp) ? children : undefined}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

ResponsiveText.displayName = "ResponsiveText";

export { ResponsiveText };

// Convenience components for common use cases
export const ResponsiveHeading = ({ level = 1, ...props }: ResponsiveTextProps & { level?: 1 | 2 | 3 | 4 | 5 | 6 }) => (
  <ResponsiveText as={`h${level}` as any} {...props} />
);

export const ResponsiveParagraph = (props: ResponsiveTextProps) => (
  <ResponsiveText as="p" {...props} />
);

export const ResponsiveSpan = (props: ResponsiveTextProps) => (
  <ResponsiveText as="span" {...props} />
);