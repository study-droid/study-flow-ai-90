import { useState } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandCard } from "@/components/brand/BrandCard";
import { EnhancedButton } from "@/components/enhanced/EnhancedButton";
import { TeddyLogo } from "@/components/brand/TeddyLogo";
import { 
  Brain, 
  Calendar, 
  Clock, 
  Trophy, 
  BookOpen, 
  Target,
  Sparkles,
  Heart,
  Star,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ModernDashboardProps {
  className?: string;
}

export const ModernDashboard = ({ className }: ModernDashboardProps) => {
  const [activeCard, setActiveCard] = useState<string | null>(null);

  const stats = [
    {
      id: "study-hours",
      title: "Study Hours Today",
      value: "3.5",
      icon: Clock,
      gradient: "from-primary to-primary-glow",
      description: "Keep going! You're doing great!"
    },
    {
      id: "streak",
      title: "Study Streak",
      value: "12",
      icon: Trophy,
      gradient: "from-warning to-accent",
      description: "Days in a row - amazing!"
    },
    {
      id: "ai-sessions",
      title: "AI Study Sessions",
      value: "8",
      icon: Brain,
      gradient: "from-accent to-success",
      description: "Teddy helped you learn!"
    },
    {
      id: "goals",
      title: "Goals Completed",
      value: "5/7",
      icon: Target,
      gradient: "from-success to-primary",
      description: "Almost there!"
    }
  ];

  const quickActions = [
    {
      title: "Chat with Teddy",
      description: "Get help with any subject",
      icon: Brain,
      variant: "teddy" as const,
      action: () => console.log("Open AI Tutor")
    },
    {
      title: "Start Study Session",
      description: "Focus mode with timer",
      icon: BookOpen,
      variant: "warm" as const,
      action: () => console.log("Start study")
    },
    {
      title: "View Calendar",
      description: "Check your schedule",
      icon: Calendar,
      variant: "glass" as const,
      action: () => console.log("Open calendar")
    }
  ];

  return (
    <div className={cn("space-y-8 p-6", className)}>
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <TeddyLogo size="xl" animated className="justify-center" />
        <div>
          <h1 className="text-4xl font-heading font-bold bg-gradient-to-r from-primary via-primary-glow to-warning bg-clip-text text-transparent">
            Welcome back, Scholar!
          </h1>
          <p className="text-lg text-muted-foreground mt-2 font-body">
            Teddy is excited to help you learn today! 🎯
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <BrandCard 
              key={stat.id}
              variant="warm"
              className={cn(
                "cursor-pointer transition-all duration-300",
                activeCard === stat.id && "ring-2 ring-primary ring-offset-2"
              )}
              onMouseEnter={() => setActiveCard(stat.id)}
              onMouseLeave={() => setActiveCard(null)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={cn(
                    "p-2 rounded-lg bg-gradient-to-br",
                    stat.gradient
                  )}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <p className="text-3xl font-heading font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Heart className="h-3 w-3 text-primary" />
                    {stat.description}
                  </p>
                </div>
              </CardContent>
            </BrandCard>
          );
        })}
      </div>

      {/* Quick Actions */}
      <BrandCard variant="premium" className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-heading font-semibold">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <div key={index} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold text-sm">{action.title}</h3>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                  <EnhancedButton 
                    variant={action.variant} 
                    size="sm" 
                    className="w-full"
                    onClick={action.action}
                  >
                    Get Started
                  </EnhancedButton>
                </div>
              );
            })}
          </div>
        </div>
      </BrandCard>

      {/* Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BrandCard variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Study Goal</span>
                  <span className="font-semibold">20h / 25h</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-primary to-primary-glow h-2 rounded-full transition-all duration-1000" 
                    style={{ width: '80%' }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Star className="h-3 w-3 text-warning" />
                You're 80% there! Keep it up!
              </p>
            </div>
          </CardContent>
        </BrandCard>

        <BrandCard variant="warm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Achievement Badge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-3">
              <div className="text-4xl">🏆</div>
              <div>
                <h3 className="font-semibold">Study Streak Master</h3>
                <p className="text-sm text-muted-foreground">
                  12 days of consistent studying!
                </p>
              </div>
              <EnhancedButton variant="ghost" size="sm">
                View All Badges
              </EnhancedButton>
            </div>
          </CardContent>
        </BrandCard>
      </div>
    </div>
  );
};