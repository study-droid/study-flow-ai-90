import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const enhancedButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-orange-hover hover:text-orange-hover-foreground transition-all duration-300",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-300",
        outline:
          "border border-input bg-background hover:bg-orange-hover/10 hover:text-orange-hover hover:border-orange-hover/30 transition-all duration-300",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-orange-hover/20 hover:text-orange-hover transition-all duration-300",
        ghost: "hover:bg-orange-hover/10 hover:text-orange-hover transition-all duration-300",
        link: "text-primary underline-offset-4 hover:underline hover:text-orange-hover transition-all duration-300",
        // Enhanced variants with orange hover
        warm: "btn-warm hover:bg-orange-hover hover:text-orange-hover-foreground hover:scale-105 transition-all duration-300",
        glow: "btn-glow hover:bg-orange-hover hover:text-orange-hover-foreground hover:scale-105 transition-all duration-300",
        glass: "glass-card hover:bg-orange-hover/20 hover:text-orange-hover backdrop-blur-md transition-all duration-300",
        gradient: "bg-gradient-to-r from-primary via-primary-glow to-primary text-primary-foreground hover:bg-orange-hover hover:text-orange-hover-foreground hover:shadow-lg hover:shadow-orange-hover/25 hover:scale-105 transition-all duration-300",
        success: "bg-accent text-accent-foreground hover:bg-orange-hover hover:text-orange-hover-foreground hover:shadow-lg hover:shadow-orange-hover/25 transition-all duration-300",
        warning: "bg-warning text-warning-foreground hover:bg-orange-hover hover:text-orange-hover-foreground hover:shadow-lg hover:shadow-orange-hover/25 transition-all duration-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
      animation: {
        none: "",
        pulse: "animate-pulse",
        bounce: "hover:animate-bounce",
        float: "animate-float",
        // New enhanced animations
        shimmer: "relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:-skew-x-12 before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700 before:ease-out",
        glow: "animate-pulse hover:animate-none hover:shadow-2xl",
        rotate: "hover:rotate-3 transition-transform duration-300",
        wiggle: "hover:animate-wiggle",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none",
    },
  }
);

export interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof enhancedButtonVariants> {
  asChild?: boolean;
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ className, variant, size, animation, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(enhancedButtonVariants({ variant, size, animation, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

EnhancedButton.displayName = "EnhancedButton";

export { EnhancedButton, enhancedButtonVariants };