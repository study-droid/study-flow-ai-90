import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Coffee, Brain, Zap, Timer, Star, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationSystem } from "@/hooks/useNotificationSystem";
import { useFocusSessions } from "@/hooks/useFocusSessions";

interface FocusSessionProps {
  className?: string;
}

export const FocusSession = ({ className }: FocusSessionProps) => {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [sessionType, setSessionType] = useState<"focus" | "break">("focus");
  const [currentSession, setCurrentSession] = useState(1);
  const [totalSessions] = useState(4);
  const { focus, success, info } = useNotificationSystem();
  const { createSession, getTodaysSessions, getSessionStats } = useFocusSessions();

  const todaysSessions = getTodaysSessions();
  const stats = getSessionStats();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = sessionType === "focus" 
    ? ((25 * 60 - timeLeft) / (25 * 60)) * 100
    : ((5 * 60 - timeLeft) / (5 * 60)) * 100;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Session completed
      setIsActive(false);
      if (sessionType === "focus") {
        // Save completed focus session to database
        createSession({
          session_type: 'focus',
          duration_minutes: 25,
          subject: 'Pomodoro Session',
          notes: `Focus session ${currentSession} completed`,
          completed_at: new Date().toISOString(),
          focus_score: Math.floor(Math.random() * 20) + 80, // Random score between 80-100
          interruptions: Math.floor(Math.random() * 3) // Random interruptions 0-2
        });

        if (currentSession < totalSessions) {
          setSessionType("break");
          setTimeLeft(5 * 60); // 5 minute break
          info("Focus session complete! Time for a break.", {
            description: "You've earned a 5-minute break. Great work!",
            duration: 6000
          });
        } else {
          // All sessions completed
          setTimeLeft(25 * 60);
          setCurrentSession(1);
          success("All Pomodoro sessions completed!", {
            description: "You've successfully completed all 4 focus sessions today.",
            duration: 8000
          });
        }
      } else {
        setSessionType("focus");
        setTimeLeft(25 * 60);
        setCurrentSession((prev) => prev + 1);
        focus("Break's over! Ready for another focus session?", {
          description: "Time to dive back into deep work.",
          duration: 5000
        });
      }
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, sessionType, currentSession, totalSessions, createSession, focus, info, success]);

  const toggleTimer = () => {
    const newActiveState = !isActive;
    setIsActive(newActiveState);
    
    if (newActiveState && sessionType === "focus") {
      focus("Focus session started!", {
        description: "You're now in deep work mode. Stay focused!",
        duration: 3000
      });
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(sessionType === "focus" ? 25 * 60 : 5 * 60);
  };

  return (
    <Card className={cn(
      "card-focus study-flow-shadow-soft overflow-hidden relative",
      isActive && "animate-pulse-glow border-focus/50",
      className
    )}>
      {/* Animated Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-focus/5 to-primary/5 opacity-50" />
      
      <CardHeader className="p-4 sm:p-6 pb-4 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={cn(
              "h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center transition-colors duration-300 flex-shrink-0",
              sessionType === "focus" ? "bg-focus/20" : "bg-achievement/20"
            )}>
              {sessionType === "focus" ? (
                <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-focus" />
              ) : (
                <Coffee className="h-4 w-4 sm:h-5 sm:w-5 text-achievement" />
              )}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg font-bold">
                Enhanced Pomodoro
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {sessionType === "focus" ? "Deep focus session" : "Mindful break time"}
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant="outline"
            className={cn(
              "transition-all duration-300 font-medium",
              sessionType === "focus" ? "bg-focus/10 text-focus border-focus/30" : "bg-achievement/10 text-achievement border-achievement/30"
            )}
          >
            <Timer className="h-3 w-3 mr-1" />
            {currentSession}/{totalSessions}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6 relative z-10">
        {/* Enhanced Timer Display */}
        <div className="text-center space-y-3 sm:space-y-4">
          <div className={cn(
            "text-5xl sm:text-6xl lg:text-7xl font-mono font-bold transition-colors duration-300 tracking-tight",
            sessionType === "focus" ? "text-focus" : "text-achievement"
          )}>
            {formatTime(timeLeft)}
          </div>
          
          <Progress 
            value={progress} 
            className={cn(
              "h-4 bg-muted/50 rounded-full overflow-hidden",
              sessionType === "focus" && "[&>div]:bg-gradient-to-r [&>div]:from-focus [&>div]:to-primary",
              sessionType === "break" && "[&>div]:bg-gradient-to-r [&>div]:from-achievement [&>div]:to-warning"
            )}
          />
          
          <p className="text-sm text-muted-foreground font-medium">
            {isActive ? 
              (sessionType === "focus" ? "Stay in the zone!" : "Relax and recharge") : 
              "Ready to focus?"
            }
          </p>
        </div>

        {/* Enhanced Session Indicators */}
        <div className="flex justify-center gap-3">
          {Array.from({ length: totalSessions }, (_, i) => (
            <div
              key={i}
              className={cn(
                "h-4 w-12 rounded-full transition-all duration-500 relative overflow-hidden",
                i < currentSession - 1 && "bg-progress shadow-md",
                i === currentSession - 1 && isActive && sessionType === "focus" && "bg-focus animate-pulse shadow-lg shadow-focus/50",
                i === currentSession - 1 && !isActive && "border-2 border-primary bg-primary/20",
                i >= currentSession && "bg-muted/50 border border-muted"
              )}
            >
              {i < currentSession - 1 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-slide-in-right" />
              )}
            </div>
          ))}
        </div>

        {/* Enhanced Controls */}
        <div className="flex items-center gap-3">
          <EnhancedButton
            onClick={toggleTimer}
            variant={isActive ? "secondary" : "warm"}
            className={cn(
              "flex-1 transition-all duration-300 font-semibold min-h-[44px]",
              !isActive && "hover:scale-105"
            )}
            size="default"
          >
            {isActive ? (
              <>
                <Pause className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="text-sm sm:text-base">Pause Focus</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="text-sm sm:text-base">{sessionType === "focus" ? "Start Focus" : "Start Break"}</span>
              </>
            )}
          </EnhancedButton>
          
          <Button
            onClick={resetTimer}
            variant="outline"
            size="icon"
            className="hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-all duration-300 min-h-[44px] min-w-[44px]"
          >
            <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>

        {/* Enhanced Stats */}
        <div className="card-warm p-3 sm:p-4 rounded-lg border space-y-3 sm:space-y-4">
          <h4 className="text-xs sm:text-sm font-semibold flex items-center gap-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            Today's Progress
          </h4>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="text-center">
              <div className="text-base sm:text-xl font-bold text-focus">{stats.sessionsToday}</div>
              <p className="text-xs text-muted-foreground">Sessions</p>
            </div>
            <div className="text-center">
              <div className="text-base sm:text-xl font-bold text-achievement">
                {Math.floor(stats.focusTimeToday / 60)}h {stats.focusTimeToday % 60}m
              </div>
              <p className="text-xs text-muted-foreground">Focus Time</p>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-progress">
                {stats.currentStreak}
              </div>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
          </div>
        </div>

        {/* Dynamic Motivation */}
        {sessionType === "focus" && isActive && (
          <div className="text-center p-4 bg-gradient-to-r from-focus/10 to-primary/10 rounded-lg border border-focus/20 animate-fade-in">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-focus" />
              <Star className="h-4 w-4 text-achievement" />
            </div>
            <p className="text-sm font-medium text-foreground">
              "Success is the sum of small efforts repeated day in and day out."
            </p>
            <p className="text-xs text-muted-foreground mt-1">— Robert Collier</p>
          </div>
        )}

        {/* Break Time Encouragement */}
        {sessionType === "break" && isActive && (
          <div className="text-center p-4 bg-gradient-to-r from-achievement/10 to-warning/10 rounded-lg border border-achievement/20 animate-fade-in">
            <Coffee className="h-5 w-5 text-achievement mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              Recharge your mind for the next session ✨
            </p>
            <p className="text-xs text-muted-foreground mt-1">Hydrate • Stretch • Breathe</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};