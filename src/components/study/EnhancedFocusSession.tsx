import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, Pause, Square, Coffee, Brain, Zap, Timer, Volume2, VolumeX,
  Settings, BarChart3, Target, Award, Music, Headphones, Trees, Book, Radio
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationSystem } from "@/hooks/useNotificationSystem";
import { useAmbientSounds, AMBIENT_SOUNDS } from "@/hooks/useAmbientSounds";
import { useStudySessions } from "@/hooks/useStudySessions";

interface EnhancedFocusSessionProps {
  className?: string;
}

type SessionType = "focus" | "short-break" | "long-break";
type TimerMode = "pomodoro" | "custom" | "flow";

const SESSION_CONFIGS = {
  pomodoro: {
    focus: 25,
    'short-break': 5,
    'long-break': 15,
    cycles: 4
  },
  custom: {
    focus: 50,
    'short-break': 10,
    'long-break': 20,
    cycles: 3
  },
  flow: {
    focus: 90,
    'short-break': 15,
    'long-break': 30,
    cycles: 2
  }
};

// Helper function to get icon component by name
const getIconComponent = (iconName: string) => {
  const iconMap: { [key: string]: React.FC<{ className?: string }> } = {
    'tree': Trees,
    'coffee': Coffee,
    'book': Book,
    'radio': Radio,
    'music': Music,
  };
  return iconMap[iconName] || Music;
};

export const EnhancedFocusSession = ({ className }: EnhancedFocusSessionProps) => {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [sessionType, setSessionType] = useState<SessionType>("focus");
  const [timerMode, setTimerMode] = useState<TimerMode>("pomodoro");
  const [currentCycle, setCurrentCycle] = useState(1);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [subject, setSubject] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  
  const { focus, success, info, achievement } = useNotificationSystem();
  const { 
    currentSound, 
    isPlaying: isSoundPlaying, 
    volume, 
    availableSounds, 
    toggleSound, 
    adjustVolume, 
    stopSound,
    getAnalyserData 
  } = useAmbientSounds();
  const { createSession } = useStudySessions();
  
  const sessionStartTime = useRef<Date | null>(null);
  const actualStudyTime = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  const config = SESSION_CONFIGS[timerMode];
  const totalCycles = config.cycles;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentSessionDuration = () => {
    return config[sessionType] * 60;
  };

  const progress = ((getCurrentSessionDuration() - timeLeft) / getCurrentSessionDuration()) * 100;

  // Audio visualizer
  useEffect(() => {
    if (!isSoundPlaying || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const analyserData = getAnalyserData();
      if (!analyserData) return;

      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      
      ctx.clearRect(0, 0, width, height);
      
      const barWidth = width / analyserData.length * 2;
      let x = 0;
      
      for (let i = 0; i < analyserData.length; i += 2) {
        const barHeight = (analyserData[i] / 255) * height * 0.8;
        
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, `hsl(${259 + i * 0.5}, 83%, 67%)`);
        gradient.addColorStop(1, `hsl(${275 + i * 0.3}, 100%, 84%)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        
        x += barWidth;
      }
      
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    animationFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSoundPlaying, getAnalyserData]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => {
          if (sessionType === "focus") {
            actualStudyTime.current += 1;
          }
          return time - 1;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      handleSessionComplete();
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, sessionType]);

  const handleSessionComplete = async () => {
    setIsActive(false);
    
    if (sessionType === "focus") {
      // Record the study session
      if (sessionStartTime.current) {
        await createSession({
          session_type: timerMode,
          subject: subject || undefined,
          duration_minutes: Math.floor(actualStudyTime.current / 60),
          notes: sessionNotes || undefined,
        });
      }

      if (currentCycle < totalCycles) {
        // Determine break type
        const isLongBreak = currentCycle % 4 === 0 && timerMode === "pomodoro";
        const nextSessionType: SessionType = isLongBreak ? "long-break" : "short-break";
        
        setSessionType(nextSessionType);
        setTimeLeft(config[nextSessionType] * 60);
        
        info("Focus session complete! Time for a break.", {
          title: "Great work!",
          description: `You've earned a ${config[nextSessionType]}-minute break.`,
          duration: 6000
        });
      } else {
        // All cycles completed
        setCompletedCycles(prev => prev + 1);
        setCurrentCycle(1);
        setTimeLeft(config.focus * 60);
        
        achievement("Study session completed!", {
          title: "Incredible Focus!",
          description: `You've completed ${totalCycles} focus cycles using ${timerMode} mode.`,
          duration: 8000
        });
      }
    } else {
      // Break completed
      setSessionType("focus");
      setTimeLeft(config.focus * 60);
      setCurrentCycle(prev => prev + 1);
      
      focus("Break's over! Ready for another focus session?", {
        title: "Back to Focus",
        description: "Time to dive back into deep work.",
        duration: 5000
      });
    }
  };

  const toggleTimer = () => {
    const newActiveState = !isActive;
    setIsActive(newActiveState);
    
    if (newActiveState) {
      if (sessionType === "focus") {
        sessionStartTime.current = new Date();
        focus("Focus session started!", {
          title: "Deep Work Mode Activated",
          description: "You're now in deep work mode. Stay focused!",
          duration: 3000
        });
      }
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(getCurrentSessionDuration());
    actualStudyTime.current = 0;
    sessionStartTime.current = null;
  };

  const resetAllSessions = () => {
    setIsActive(false);
    setSessionType("focus");
    setCurrentCycle(1);
    setTimeLeft(config.focus * 60);
    actualStudyTime.current = 0;
    sessionStartTime.current = null;
  };

  const changeTimerMode = (newMode: TimerMode) => {
    setTimerMode(newMode);
    resetAllSessions();
    setTimeLeft(SESSION_CONFIGS[newMode].focus * 60);
  };

  return (
    <EnhancedCard variant="glow" hover className={cn("w-full max-w-2xl mx-auto", className)}>
      <EnhancedCardHeader>
        <div className="flex items-center justify-between">
          <EnhancedCardTitle className="flex items-center gap-2">
            {sessionType === "focus" ? (
              <Brain className="h-6 w-6 text-focus" />
            ) : (
              <Coffee className="h-6 w-6 text-warning" />
            )}
            Enhanced Focus Session
          </EnhancedCardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {timerMode.toUpperCase()}
            </Badge>
            <Badge 
              variant={sessionType === "focus" ? "default" : "secondary"}
              className={cn(
                sessionType === "focus" && "bg-focus text-focus-foreground",
                sessionType !== "focus" && "bg-warning text-warning-foreground"
              )}
            >
              {sessionType === "focus" ? "Focus" : sessionType.replace('-', ' ')}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Advanced pomodoro timer with ambient sounds and detailed tracking
        </CardDescription>
      </EnhancedCardHeader>

      <EnhancedCardContent>
        <Tabs defaultValue="timer" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timer">Timer</TabsTrigger>
            <TabsTrigger value="sounds">Sounds</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="timer" className="space-y-6 mt-6">
            {/* Progress Overview */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{currentCycle}</div>
                <p className="text-xs text-muted-foreground">Current Cycle</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-achievement">{completedCycles}</div>
                <p className="text-xs text-muted-foreground">Completed Sessions</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-progress">
                  {Math.floor(actualStudyTime.current / 60)}m
                </div>
                <p className="text-xs text-muted-foreground">Active Study Time</p>
              </div>
            </div>

            {/* Timer Display */}
            <div className="text-center space-y-4">
              <div className="text-7xl font-mono font-bold text-primary animate-pulse-glow">
                {formatTime(timeLeft)}
              </div>
              
              <Progress 
                value={progress} 
                className={cn(
                  "h-4 study-flow-transition-all",
                  sessionType === "focus" && "[&>div]:bg-gradient-to-r [&>div]:from-focus [&>div]:to-primary-glow",
                  sessionType !== "focus" && "[&>div]:bg-gradient-to-r [&>div]:from-warning [&>div]:to-amber-light"
                )}
              />
            </div>

            {/* Cycle Progress */}
            <div className="flex justify-center gap-3">
              {Array.from({ length: totalCycles }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-4 w-4 rounded-full border-2 study-flow-transition-all",
                    i < currentCycle - 1 && "bg-progress border-progress shadow-lg",
                    i === currentCycle - 1 && isActive && sessionType === "focus" && "bg-focus border-focus animate-pulse",
                    i === currentCycle - 1 && !isActive && "border-primary",
                    i >= currentCycle && "border-muted-foreground/30"
                  )}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <EnhancedButton
                onClick={toggleTimer}
                variant={isActive ? "outline" : "glow"}
                className="flex-1"
                size="lg"
                animation="pulse"
              >
                {isActive ? (
                  <>
                    <Pause className="h-5 w-5 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Start
                  </>
                )}
              </EnhancedButton>
              
              <EnhancedButton
                onClick={resetTimer}
                variant="outline"
                size="lg"
              >
                <Square className="h-5 w-5" />
              </EnhancedButton>
            </div>

            {/* Motivation Quote */}
            {sessionType === "focus" && (
              <div className="glass-card p-4 border border-primary/20">
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">
                      "The ability to concentrate single-mindedly on your most important task is the key to great results."
                    </p>
                    <p className="text-xs text-muted-foreground">- Brian Tracy</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sounds" className="space-y-6 mt-6">
            {/* Volume Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Volume
                </label>
                <span className="text-sm text-muted-foreground">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <Slider
                value={[volume]}
                onValueChange={([newVolume]) => adjustVolume(newVolume)}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Audio Visualizer */}
            {isSoundPlaying && (
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="w-full h-20 bg-gradient-to-r from-primary/5 to-primary-glow/5 rounded-lg border border-primary/20"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <Headphones className="h-4 w-4" />
                    {currentSound?.name}
                  </div>
                </div>
              </div>
            )}

            {/* Sound Categories */}
            <div className="space-y-4">
              {['nature', 'urban', 'focus'].map(category => (
                <div key={category}>
                  <h4 className="text-sm font-medium mb-3 capitalize flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    {category} Sounds
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {availableSounds
                      .filter(sound => sound.type === category)
                      .map(sound => (
                        <EnhancedButton
                          key={sound.id}
                          onClick={() => toggleSound(sound)}
                          variant={currentSound?.id === sound.id && isSoundPlaying ? "glow" : "outline"}
                          size="sm"
                          className="justify-start"
                        >
                          {(() => {
                            const IconComponent = getIconComponent(sound.icon);
                            return <IconComponent className="h-4 w-4 mr-2" />;
                          })()}
                          {sound.name}
                        </EnhancedButton>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            {isSoundPlaying && (
              <EnhancedButton
                onClick={stopSound}
                variant="destructive"
                className="w-full"
              >
                <VolumeX className="h-4 w-4 mr-2" />
                Stop All Sounds
              </EnhancedButton>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 mt-6">
            {/* Timer Mode */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Timer Mode</label>
              <Select value={timerMode} onValueChange={changeTimerMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pomodoro">
                    Pomodoro (25/5/15 min)
                  </SelectItem>
                  <SelectItem value="custom">
                    Extended (50/10/20 min)
                  </SelectItem>
                  <SelectItem value="flow">
                    Flow State (90/15/30 min)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subject Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Study Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What are you studying?"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
              />
            </div>

            {/* Session Notes */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Session Notes</label>
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Add notes about your session..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none"
              />
            </div>

            {/* Reset All */}
            <EnhancedButton
              onClick={resetAllSessions}
              variant="outline"
              className="w-full"
            >
              <Target className="h-4 w-4 mr-2" />
              Reset All Sessions
            </EnhancedButton>
          </TabsContent>
        </Tabs>
      </EnhancedCardContent>
    </EnhancedCard>
  );
};