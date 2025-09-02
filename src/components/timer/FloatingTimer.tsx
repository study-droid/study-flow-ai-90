import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Square,
  Minimize2,
  Maximize2,
  Timer,
  Brain,
  Zap,
  Coffee,
  Target,
  Clock,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { timerService, type TimerSession, TIMER_PRESETS } from '@/services/timer/timerService';
import { useNavigate } from 'react-router-dom';

export const FloatingTimer: React.FC = () => {
  const [session, setSession] = useState<TimerSession | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: window.innerWidth - 320, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Subscribe to timer updates
  useEffect(() => {
    const unsubscribe = timerService.subscribe(setSession);
    return unsubscribe;
  }, []);

  // Handle drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      const startX = e.clientX - dragPosition.x;
      const startY = e.clientY - dragPosition.y;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        setDragPosition({
          x: moveEvent.clientX - startX,
          y: moveEvent.clientY - startY
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSessionIcon = (type: string) => {
    switch (type) {
      case 'pomodoro': return Timer;
      case 'deepwork': return Brain;
      case 'sprint': return Zap;
      case 'shortbreak': return Coffee;
      case 'longbreak': return Coffee;
      default: return Clock;
    }
  };

  const getSessionColor = (type: string) => {
    const preset = TIMER_PRESETS.find(p => p.type === type);
    return preset?.color || 'bg-gray-500';
  };

  if (!session || !session.isRunning) {
    return null;
  }

  const timeRemaining = timerService.getTimeRemaining();
  const progress = timerService.getProgress();
  const Icon = getSessionIcon(session.type);
  const color = getSessionColor(session.type);

  // Collapsed view (tiny bubble)
  if (isCollapsed) {
    return (
      <div
        ref={dragRef}
        className={cn(
          "fixed z-50 transition-all duration-300",
          isDragging && "cursor-move"
        )}
        style={{
          left: `${dragPosition.x}px`,
          top: `${dragPosition.y}px`,
        }}
        onMouseDown={handleMouseDown}
      >
        <Button
          onClick={() => setIsCollapsed(false)}
          className={cn(
            "drag-handle rounded-full h-14 w-14 p-0 shadow-lg relative",
            color,
            "hover:scale-110 transition-transform"
          )}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="3"
                fill="none"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                stroke="white"
                strokeWidth="3"
                fill="none"
                strokeDasharray={`${(progress / 100) * 150.8} 150.8`}
                className="transition-all duration-1000"
              />
            </svg>
            <Icon className="h-6 w-6 text-white z-10" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-background text-foreground rounded-full px-1.5 text-[10px] font-bold border shadow-sm">
            {Math.floor(timeRemaining / 60)}m
          </div>
        </Button>
      </div>
    );
  }

  // Minimized view
  if (isMinimized) {
    return (
      <div
        ref={dragRef}
        className={cn(
          "fixed z-50 bg-background border rounded-full shadow-lg transition-all duration-300 px-3 py-2",
          isDragging && "cursor-move"
        )}
        style={{
          left: `${dragPosition.x}px`,
          top: `${dragPosition.y}px`,
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="drag-handle flex items-center gap-2 cursor-move">
          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", color)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs font-medium">{session.name}</p>
              <p className="text-lg font-bold font-mono">{formatTime(timeRemaining)}</p>
            </div>
            <div className="flex items-center gap-1">
              {session.isPaused ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => timerService.resumeTimer()}
                >
                  <Play className="h-3 w-3" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => timerService.pauseTimer()}
                >
                  <Pause className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => timerService.stopTimer()}
              >
                <Square className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsMinimized(false)}
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsCollapsed(true)}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div
      ref={dragRef}
      className={cn(
        "fixed z-50 bg-background border rounded-lg shadow-2xl transition-all duration-300 w-80",
        isDragging && "cursor-move"
      )}
      style={{
        left: `${dragPosition.x}px`,
        top: `${dragPosition.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className={cn("drag-handle p-3 rounded-t-lg cursor-move", color)}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <span className="font-semibold">{session.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white hover:bg-white/20"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white hover:bg-white/20"
              onClick={() => setIsCollapsed(true)}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Timer Display */}
      <div className="p-4 space-y-4">
        <div className="text-center">
          <div className="text-4xl font-bold font-mono">
            {formatTime(timeRemaining)}
          </div>
          {session.subject && (
            <p className="text-sm text-muted-foreground mt-1">
              {session.subject}
            </p>
          )}
          {session.task && (
            <p className="text-xs text-muted-foreground">
              {session.task}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.floor(session.elapsed / 60)}m elapsed</span>
            <span>{session.duration}m total</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          {session.isPaused ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => timerService.resumeTimer()}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Resume
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => timerService.pauseTimer()}
              className="flex items-center gap-2"
            >
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => timerService.stopTimer()}
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Stop
          </Button>
        </div>

        {/* Navigate to Study Page */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => navigate('/study')}
        >
          <Target className="h-4 w-4 mr-2" />
          Go to Study Hub
        </Button>

        {/* Status */}
        {session.isPaused && (
          <div className="text-center">
            <Badge variant="secondary" className="animate-pulse">
              PAUSED
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};