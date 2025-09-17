import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square, SkipForward } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { cn } from '@/lib/utils';

interface StudyTimerProps {
  onSessionComplete?: (duration: number) => void;
  onSessionStart?: () => void;
  onSessionPause?: () => void;
  className?: string;
}

export const StudyTimer: React.FC<StudyTimerProps> = ({
  onSessionComplete,
  onSessionStart,
  onSessionPause,
  className
}) => {
  const [settings] = useState({
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    pomodorosUntilLongBreak: 4,
  });

  const timer = useTimer(settings);

  useEffect(() => {
    timer.setOnComplete(() => {
      // Play completion sound or notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(
          timer.currentPhase === 'work' ? 'Work session completed!' : 'Break time over!',
          {
            body: timer.currentPhase === 'work' 
              ? 'Time for a break! You did great!' 
              : 'Ready to get back to work?',
            icon: '/favicon.ico'
          }
        );
      }
      
      if (timer.currentPhase === 'work' && onSessionComplete) {
        onSessionComplete(settings.workDuration * 60);
      }
    });
  }, [timer, settings.workDuration, onSessionComplete]);

  const handleStart = () => {
    timer.start();
    onSessionStart?.();
  };

  const handlePause = () => {
    timer.pause();
    onSessionPause?.();
  };

  const handleStop = () => {
    timer.reset();
    onSessionPause?.();
  };

  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentPhaseText = timer.currentPhase === 'work' ? 'Study Time' : 
    timer.completedPomodoros % settings.pomodorosUntilLongBreak === 0 && timer.completedPomodoros > 0 ? 
    'Long Break' : 'Short Break';

  return (
    <Card className={cn("", className)}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="flex items-center justify-center gap-2">
          <div className={cn(
            "w-3 h-3 rounded-full",
            timer.isRunning ? "bg-green-500 animate-pulse" : "bg-gray-400"
          )} />
          {currentPhaseText}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timer Display */}
        <div className="text-center">
          <div className={cn(
            "text-6xl font-mono font-bold mb-2 transition-colors",
            timer.currentPhase === 'work' ? "text-primary" : "text-green-500"
          )}>
            {formatTime(timer.minutes, timer.seconds)}
          </div>
          <Progress 
            value={timer.progress} 
            className="h-2 mb-4"
          />
          <p className="text-sm text-muted-foreground">
            Session {timer.completedPomodoros + 1} • 
            {timer.currentPhase === 'work' ? ' Focus time' : ' Break time'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2">
          {!timer.isRunning ? (
            <Button
              onClick={handleStart}
              size="lg"
              className="flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              Start
            </Button>
          ) : (
            <Button
              onClick={handlePause}
              size="lg"
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Pause className="w-5 h-5" />
              Pause
            </Button>
          )}
          
          <Button
            onClick={handleStop}
            size="lg"
            variant="outline"
            className="flex items-center gap-2"
          >
            <Square className="w-4 h-4" />
            Stop
          </Button>
          
          <Button
            onClick={timer.skip}
            size="lg"
            variant="outline"
            className="flex items-center gap-2"
          >
            <SkipForward className="w-4 h-4" />
            Skip
          </Button>
        </div>

        {/* Pomodoro Counter */}
        <div className="flex justify-center gap-1">
          {[...Array(settings.pomodorosUntilLongBreak)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-3 h-3 rounded-full border-2",
                i < timer.completedPomodoros
                  ? "bg-primary border-primary"
                  : "bg-transparent border-muted"
              )}
            />
          ))}
        </div>

        {/* Study Tips */}
        <div className="text-center text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
          {timer.currentPhase === 'work' ? (
            "🎯 Stay focused! Eliminate distractions and concentrate on your task."
          ) : (
            "☕ Take a break! Step away, stretch, and recharge for the next session."
          )}
        </div>
      </CardContent>
    </Card>
  );
};