import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Brain,
  Timer,
  Target,
  Zap,
  Coffee,
  BookOpen,
  Star,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FocusMode = 'pomodoro' | 'deep-work' | 'sprint' | 'review';

interface FocusSession {
  id: string;
  mode: FocusMode;
  duration: number;
  completed: number;
  isActive: boolean;
  isPaused: boolean;
}

interface FocusModeConfig {
  name: string;
  duration: number;
  breakDuration: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgGradient: string;
}

const focusModes: Record<FocusMode, FocusModeConfig> = {
  pomodoro: {
    name: 'Pomodoro',
    duration: 25 * 60,
    breakDuration: 5 * 60,
    description: 'Classic 25min focus + 5min break',
    icon: Timer,
    color: 'text-red-500',
    bgGradient: 'from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20'
  },
  'deep-work': {
    name: 'Deep Work',
    duration: 90 * 60,
    breakDuration: 20 * 60,
    description: 'Extended 90min deep focus',
    icon: Brain,
    color: 'text-purple-500',
    bgGradient: 'from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20'
  },
  sprint: {
    name: 'Sprint',
    duration: 15 * 60,
    breakDuration: 3 * 60,
    description: 'Quick 15min bursts',
    icon: Zap,
    color: 'text-yellow-500',
    bgGradient: 'from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20'
  },
  review: {
    name: 'Review',
    duration: 45 * 60,
    breakDuration: 10 * 60,
    description: 'Study review & practice',
    icon: BookOpen,
    color: 'text-green-500',
    bgGradient: 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20'
  }
};

export const EnhancedFocusTimer: React.FC = () => {
  const [selectedMode, setSelectedMode] = useState<FocusMode>('pomodoro');
  const [session, setSession] = useState<FocusSession | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [isBreak, setIsBreak] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Timer effect
  useEffect(() => {
    if (session?.isActive && !session?.isPaused && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Session completed
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [session?.isActive, session?.isPaused, timeLeft]);

  const handleSessionComplete = () => {
    if (soundEnabled) {
      // Play completion sound (would be implemented with audio)
    }

    setCompletedSessions(prev => prev + 1);
    
    if (!isBreak) {
      // Start break
      setIsBreak(true);
      setTimeLeft(focusModes[selectedMode].breakDuration);
    } else {
      // End break, ready for next session
      setIsBreak(false);
      setSession(null);
      setTimeLeft(0);
    }
  };

  const startSession = () => {
    const mode = focusModes[selectedMode];
    const newSession: FocusSession = {
      id: Date.now().toString(),
      mode: selectedMode,
      duration: mode.duration,
      completed: 0,
      isActive: true,
      isPaused: false
    };
    
    setSession(newSession);
    setTimeLeft(mode.duration);
    setIsBreak(false);
  };

  const togglePause = () => {
    if (session) {
      setSession({
        ...session,
        isPaused: !session.isPaused
      });
    }
  };

  const stopSession = () => {
    setSession(null);
    setTimeLeft(0);
    setIsBreak(false);
  };

  const skipSession = () => {
    handleSessionComplete();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (): number => {
    if (!session || timeLeft === 0) return 0;
    const totalTime = isBreak ? focusModes[selectedMode].breakDuration : session.duration;
    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  const currentMode = focusModes[selectedMode];

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      {!session && (
        <Card className="study-flow-shadow-soft animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Choose Focus Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(focusModes).map(([key, mode]) => (
                <div
                  key={key}
                  className={cn(
                    "relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:scale-105",
                    `bg-gradient-to-br ${mode.bgGradient}`,
                    selectedMode === key 
                      ? "border-primary ring-2 ring-primary/20" 
                      : "border-transparent hover:border-primary/50"
                  )}
                  onClick={() => setSelectedMode(key as FocusMode)}
                >
                  <div className="flex items-start gap-3">
                    <mode.icon className={cn("h-6 w-6", mode.color)} />
                    <div className="flex-1">
                      <h3 className="font-medium">{mode.name}</h3>
                      <p className="text-sm text-muted-foreground">{mode.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {Math.floor(mode.duration / 60)}min
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {Math.floor(mode.breakDuration / 60)}min break
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-center">
              <Button 
                onClick={startSession}
                size="lg"
                className="bg-gradient-to-r from-primary to-primary-glow hover:shadow-lg transition-all duration-300"
              >
                <Play className="h-5 w-5 mr-2" />
                Start {currentMode.name} Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Session */}
      {session && (
        <Card className={cn(
          "study-flow-shadow-strong animate-scale-in",
          `bg-gradient-to-br ${currentMode.bgGradient} border-2`,
          isBreak ? "border-green-300" : "border-primary"
        )}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <currentMode.icon className={cn("h-6 w-6", currentMode.color)} />
                {isBreak ? 'Break Time' : `${currentMode.name} Session`}
                {isBreak && <Coffee className="h-5 w-5 text-green-500" />}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Timer Display */}
            <div className="text-center">
              <div className={cn(
                "text-6xl font-bold mb-4 transition-all duration-300",
                session.isPaused ? "text-muted-foreground" : "text-foreground",
                timeLeft <= 60 && !isBreak && "animate-glow-pulse text-red-500"
              )}>
                {formatTime(timeLeft)}
              </div>
              
              <Progress 
                value={getProgress()} 
                className={cn(
                  "h-3 mb-4 transition-all duration-300",
                  isBreak && "h-2"
                )}
              />
              
              <p className="text-muted-foreground">
                {isBreak 
                  ? "Take a break and recharge" 
                  : "Stay focused and avoid distractions"
                }
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={togglePause}
                disabled={timeLeft === 0}
              >
                {session.isPaused ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={stopSession}
                className="text-destructive hover:text-destructive"
              >
                <Square className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={skipSession}
                disabled={timeLeft === 0}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Session Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{completedSessions}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Completed
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-achievement">
                  {Math.floor((completedSessions * focusModes[selectedMode].duration) / 60)}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Minutes
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-xl font-bold text-yellow-500">
                    {completedSessions * 10}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Points
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Progress */}
      <Card className="study-flow-shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-progress" />
            Today's Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">{completedSessions}</div>
              <div className="text-sm text-muted-foreground">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-achievement mb-1">
                {Math.floor((completedSessions * 25) / 60)}h {(completedSessions * 25) % 60}m
              </div>
              <div className="text-sm text-muted-foreground">Focus Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-progress mb-1">3</div>
              <div className="text-sm text-muted-foreground">Streak Days</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-500 mb-1">{completedSessions * 10}</div>
              <div className="text-sm text-muted-foreground">Points</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};