import { cn } from "@/lib/utils";

interface TeddyLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showText?: boolean;
  animated?: boolean;
}

export const TeddyLogo = ({ 
  size = "md", 
  className,
  showText = true,
  animated = false 
}: TeddyLogoProps) => {
  const sizeClasses = {
    sm: "w-6 h-6 text-sm",
    md: "w-8 h-8 text-base",
    lg: "w-12 h-12 text-lg",
    xl: "w-16 h-16 text-xl"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl",
    xl: "text-2xl"
  };

  return (
    <div className={cn(
      "flex items-center gap-2",
      className
    )}>
      {/* Teddy Bear Icon */}
      <div className={cn(
        "rounded-full bg-gradient-to-br from-primary via-primary-glow to-warning flex items-center justify-center shadow-lg",
        sizeClasses[size],
        animated && "animate-bounce-gentle hover:animate-glow-pulse transition-all duration-300"
      )}>
        <span className="text-white font-bold filter drop-shadow-sm">
          🧸
        </span>
      </div>
      
      {/* Brand Text */}
      {showText && (
        <span className={cn(
          "font-heading font-semibold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent",
          textSizeClasses[size]
        )}>
          Study Teddy
        </span>
      )}
    </div>
  );
};