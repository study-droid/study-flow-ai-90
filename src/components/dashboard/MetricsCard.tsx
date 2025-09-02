import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "gradient" | "focus" | "achievement" | "progress";
  className?: string;
  slowAnimation?: boolean;
}

export const MetricsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
}: MetricsCardProps) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
  // Animate number counting up
  useEffect(() => {
    setIsVisible(true);
    const numericValue = typeof value === 'string' ? 
      parseInt(value.replace(/[^0-9]/g, '') || '0') : value;
    
    if (typeof numericValue === 'number' && !isNaN(numericValue)) {
      const duration = 4000;
      const steps = 60;
      const increment = numericValue / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= numericValue) {
          setAnimatedValue(numericValue);
          clearInterval(timer);
        } else {
          setAnimatedValue(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    }
  }, [value]);
  const getVariantStyles = () => {
    switch (variant) {
      case "gradient":
        return "bg-gradient-to-br from-primary via-primary/90 to-focus text-white shadow-2xl border-t-4 border-t-white/30";
      case "focus":
        return "bg-gradient-to-br from-focus/5 to-focus/15 border border-focus/30 text-focus backdrop-blur-sm border-t-4 border-t-focus";
      case "achievement":
        return "bg-gradient-to-br from-achievement/5 to-achievement/15 border border-achievement/30 text-achievement backdrop-blur-sm border-t-4 border-t-achievement";
      case "progress":
        return "bg-gradient-to-br from-progress/5 to-progress/15 border border-progress/30 text-progress backdrop-blur-sm border-t-4 border-t-progress";
      default:
        return "bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border border-border/50 shadow-lg";
    }
  };
  
  const getIconAnimation = () => {
    // Check for specific slow animations
    if (title === "Study Hours Today") {
      return ""; // No animation for timer icon
    }
    if (title === "Focus Score") {
      return ""; // No animation for brain icon
    }
    
    switch (variant) {
      case "achievement":
        return "animate-pulse";
      case "focus":
        return "animate-spin-slow";
      case "gradient":
        return "animate-float";
      default:
        return "";
    }
  };

  // Format animated value back to original format
  const formatAnimatedValue = () => {
    if (typeof value === 'string') {
      if (value.includes('h') && value.includes('m')) {
        const hours = Math.floor(animatedValue / 60);
        const minutes = animatedValue % 60;
        return `${hours}h ${minutes}m`;
      } else if (value.includes('/')) {
        const parts = value.split('/');
        return `${animatedValue}/${parts[1]}`;
      } else if (value.includes('%')) {
        return `${animatedValue}%`;
      }
    }
    return animatedValue.toString();
  };
  
  const displayValue = typeof value === 'string' && value.includes('No data') ? value : formatAnimatedValue();
  
  return (
    <Card className={cn(
      "relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1",
      "shadow-xl hover:shadow-2xl",
      getVariantStyles(),
      isVisible ? "animate-fade-in" : "opacity-0",
      className
    )}>
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      
      <CardHeader className="relative flex flex-row items-center justify-between p-3 sm:p-4 pb-2">
        <CardTitle className={cn(
          "font-semibold tracking-wide opacity-90",
          "text-sm sm:text-base lg:text-lg"
        )}>{title}</CardTitle>
        <div className="relative">
          <Icon className={cn(
            "h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 transition-all duration-300",
            variant === "gradient" ? "text-white/90" : "text-current opacity-70",
            getIconAnimation()
          )} />
          {/* Icon glow effect */}
          {variant === "achievement" && (
            <div className="absolute inset-0 animate-ping">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-achievement opacity-30" />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="relative px-3 sm:px-4 pb-3 sm:pb-4">
        <div className="space-y-1 sm:space-y-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <div className={cn(
              "font-black tracking-tight transition-all duration-300 hover:scale-110 transform-origin-left",
              displayValue === "No data" 
                ? "text-base sm:text-lg lg:text-xl"
                : "text-xl sm:text-2xl lg:text-3xl xl:text-4xl"
            )}>
              {displayValue}
            </div>
            {trend && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
                trend.isPositive 
                  ? "bg-green-500/20 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                  : "bg-red-500/20 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              )}>
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{trend.value}%</span>
              </div>
            )}
          </div>
          
          {subtitle && (
            <p className={cn(
              "text-xs sm:text-sm font-medium",
              variant === "gradient" ? "text-white/80" : "text-muted-foreground"
            )}>
              {subtitle}
            </p>
          )}
        </div>
        
        {/* Progress ring for percentage values */}
        {typeof value === 'string' && value.includes('%') && !value.includes('No data') && (
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <svg className="w-24 h-24 transform rotate-90">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${animatedValue * 2.51} 251`}
                className="transition-all duration-2000"
              />
            </svg>
          </div>
        )}
      </CardContent>
    </Card>
  );
};