import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, Play, Pause, Square, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const TimerWidget: React.FC = () => {
  const navigate = useNavigate();
  const [time, setTime] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && time > 0) {
      interval = setInterval(() => {
        setTime(time => time - 1);
      }, 1000);
    } else if (time === 0) {
      setIsRunning(false);
      // Auto-switch mode when timer ends
      if (mode === 'work') {
        setMode('break');
        setTime(5 * 60); // 5 minutes break
      } else {
        setMode('work');
        setTime(25 * 60); // 25 minutes work
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, time, mode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTime(mode === 'work' ? 25 * 60 : 5 * 60);
  };

  const stopTimer = () => {
    setIsRunning(false);
    setTime(25 * 60);
    setMode('work');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Timer className="h-4 w-4" />
          Quick Timer
        </CardTitle>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => navigate('/pomodoro')}
          className="text-xs"
        >
          Full Timer
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold font-mono">
            {formatTime(time)}
          </div>
          <div className="text-xs text-muted-foreground capitalize">
            {mode} Session
          </div>
        </div>

        <div className="flex justify-center gap-2">
          <Button
            size="sm"
            onClick={toggleTimer}
            className="h-8"
          >
            {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={resetTimer}
            className="h-8"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={stopTimer}
            className="h-8"
          >
            <Square className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex gap-1">
          <Button
            size="sm"
            variant={mode === 'work' ? 'default' : 'outline'}
            onClick={() => {
              setMode('work');
              setTime(25 * 60);
              setIsRunning(false);
            }}
            className="flex-1 text-xs h-6"
          >
            Work
          </Button>
          <Button
            size="sm"
            variant={mode === 'break' ? 'default' : 'outline'}
            onClick={() => {
              setMode('break');
              setTime(5 * 60);
              setIsRunning(false);
            }}
            className="flex-1 text-xs h-6"
          >
            Break
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};