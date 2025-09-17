import { useState, useEffect, useRef, useCallback } from 'react';

interface TimerState {
  minutes: number;
  seconds: number;
  isRunning: boolean;
  isBreak: boolean;
  completedPomodoros: number;
}

interface TimerSettings {
  workDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  pomodorosUntilLongBreak: number;
}

export const useTimer = (settings: TimerSettings) => {
  const [state, setState] = useState<TimerState>({
    minutes: settings.workDuration,
    seconds: 0,
    isRunning: false,
    isBreak: false,
    completedPomodoros: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef<(() => void) | null>(null);

  const totalSeconds = state.minutes * 60 + state.seconds;
  const currentDuration = state.isBreak 
    ? (state.completedPomodoros % settings.pomodorosUntilLongBreak === 0 && state.completedPomodoros > 0)
      ? settings.longBreakDuration * 60
      : settings.shortBreakDuration * 60
    : settings.workDuration * 60;

  const progress = ((currentDuration - totalSeconds) / currentDuration) * 100;

  const tick = useCallback(() => {
    setState(prevState => {
      const newTotalSeconds = prevState.minutes * 60 + prevState.seconds - 1;
      
      if (newTotalSeconds <= 0) {
        // Timer completed
        const newCompletedPomodoros = prevState.isBreak 
          ? prevState.completedPomodoros 
          : prevState.completedPomodoros + 1;
        
        const shouldTakeLongBreak = newCompletedPomodoros % settings.pomodorosUntilLongBreak === 0 && newCompletedPomodoros > 0;
        const nextIsBreak = !prevState.isBreak;
        
        let nextDuration: number;
        if (nextIsBreak) {
          nextDuration = shouldTakeLongBreak ? settings.longBreakDuration : settings.shortBreakDuration;
        } else {
          nextDuration = settings.workDuration;
        }

        // Call completion callback
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }

        return {
          minutes: nextDuration,
          seconds: 0,
          isRunning: false,
          isBreak: nextIsBreak,
          completedPomodoros: newCompletedPomodoros,
        };
      }

      return {
        ...prevState,
        minutes: Math.floor(newTotalSeconds / 60),
        seconds: newTotalSeconds % 60,
      };
    });
  }, [settings]);

  useEffect(() => {
    if (state.isRunning) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRunning, tick]);

  const start = () => {
    setState(prev => ({ ...prev, isRunning: true }));
  };

  const pause = () => {
    setState(prev => ({ ...prev, isRunning: false }));
  };

  const reset = () => {
    setState({
      minutes: settings.workDuration,
      seconds: 0,
      isRunning: false,
      isBreak: false,
      completedPomodoros: 0,
    });
  };

  const skip = () => {
    setState(prevState => {
      const newCompletedPomodoros = prevState.isBreak 
        ? prevState.completedPomodoros 
        : prevState.completedPomodoros + 1;
      
      const shouldTakeLongBreak = newCompletedPomodoros % settings.pomodorosUntilLongBreak === 0 && newCompletedPomodoros > 0;
      const nextIsBreak = !prevState.isBreak;
      
      let nextDuration: number;
      if (nextIsBreak) {
        nextDuration = shouldTakeLongBreak ? settings.longBreakDuration : settings.shortBreakDuration;
      } else {
        nextDuration = settings.workDuration;
      }

      return {
        minutes: nextDuration,
        seconds: 0,
        isRunning: false,
        isBreak: nextIsBreak,
        completedPomodoros: newCompletedPomodoros,
      };
    });
  };

  const setOnComplete = (callback: () => void) => {
    onCompleteRef.current = callback;
  };

  return {
    ...state,
    progress,
    totalSeconds,
    currentPhase: state.isBreak ? 'break' : 'work',
    start,
    pause,
    reset,
    skip,
    setOnComplete,
  };
};