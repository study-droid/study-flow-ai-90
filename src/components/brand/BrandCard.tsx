import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { ReactNode } from "react";

interface BrandCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "glass" | "warm" | "premium";
  hover?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const BrandCard = ({ 
  children, 
  className,
  variant = "default",
  hover = true,
  onMouseEnter,
  onMouseLeave
}: BrandCardProps) => {
  const variants = {
    default: "bg-card border-border",
    glass: "glass-card backdrop-blur-md",
    warm: "bg-gradient-to-br from-secondary via-card to-secondary/50 border-primary/10",
    premium: "bg-gradient-to-br from-primary/5 via-card to-warning/5 border-primary/20 shadow-lg"
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-300",
        variants[variant],
        hover && "hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1",
        className
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </Card>
  );
};