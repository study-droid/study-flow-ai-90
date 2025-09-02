/**
 * Global Timer Service
 * Manages Pomodoro/Focus timer state across the application
 */

import { logger } from '@/services/logging/logger';

export type TimerType = 'pomodoro' | 'deepwork' | 'sprint' | 'shortbreak' | 'longbreak' | 'custom';

export interface TimerSession {
  id: string;
  type: TimerType;
  name: string;
  duration: number; // in minutes
  elapsed: number; // in seconds
  isRunning: boolean;
  isPaused: boolean;
  startTime: Date | null;
  endTime: Date | null;
  subject?: string;
  task?: string;
}

export interface TimerPreset {
  type: TimerType;
  name: string;
  duration: number; // in minutes
  description: string;
  color: string;
  icon: string;
}

export const TIMER_PRESETS: TimerPreset[] = [
  {
    type: 'pomodoro',
    name: 'Pomodoro',
    duration: 25,
    description: 'Classic 25-minute focus session',
    color: 'bg-red-500',
    icon: '🍅'
  },
  {
    type: 'deepwork',
    name: 'Deep Work',
    duration: 90,
    description: '90-minute deep focus block',
    color: 'bg-purple-500',
    icon: '🧠'
  },
  {
    type: 'sprint',
    name: 'Sprint',
    duration: 15,
    description: 'Quick 15-minute sprint',
    color: 'bg-blue-500',
    icon: '⚡'
  },
  {
    type: 'shortbreak',
    name: 'Short Break',
    duration: 5,
    description: '5-minute rest',
    color: 'bg-green-500',
    icon: '☕'
  },
  {
    type: 'longbreak',
    name: 'Long Break',
    duration: 15,
    description: '15-minute extended break',
    color: 'bg-teal-500',
    icon: '🌴'
  }
];

class TimerService {
  private currentSession: TimerSession | null = null;
  private intervalId: number | null = null;
  private listeners: Set<(session: TimerSession | null) => void> = new Set();
  private storageKey = 'timer_session';

  constructor() {
    this.loadSession();
    this.startTicking();
    
    // Listen for storage changes (cross-tab sync)
    window.addEventListener('storage', this.handleStorageChange);
    
    // Save state before unload
    window.addEventListener('beforeunload', () => this.saveSession());
  }

  private handleStorageChange = (e: StorageEvent) => {
    if (e.key === this.storageKey) {
      this.loadSession();
      this.notifyListeners();
    }
  };

  private loadSession() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const session = JSON.parse(stored);
        // Restore dates
        if (session.startTime) session.startTime = new Date(session.startTime);
        if (session.endTime) session.endTime = new Date(session.endTime);
        
        // Calculate elapsed time if running
        if (session.isRunning && session.startTime) {
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - session.startTime.getTime()) / 1000);
          session.elapsed = Math.min(elapsed, session.duration * 60);
          
          // Check if timer has finished
          if (session.elapsed >= session.duration * 60) {
            session.isRunning = false;
            session.endTime = new Date();
            this.onTimerComplete(session);
          }
        }
        
        this.currentSession = session;
      }
    } catch (error) {
      logger.error('Failed to load timer session', 'TimerService', error);
    }
  }

  private saveSession() {
    try {
      if (this.currentSession) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.currentSession));
      } else {
        localStorage.removeItem(this.storageKey);
      }
    } catch (error) {
      logger.error('Failed to save timer session', 'TimerService', error);
    }
  }

  private startTicking() {
    if (this.intervalId) return;
    
    this.intervalId = window.setInterval(() => {
      if (this.currentSession?.isRunning && !this.currentSession.isPaused) {
        this.currentSession.elapsed += 1;
        
        // Check if timer completed
        if (this.currentSession.elapsed >= this.currentSession.duration * 60) {
          this.currentSession.isRunning = false;
          this.currentSession.endTime = new Date();
          this.onTimerComplete(this.currentSession);
        }
        
        this.saveSession();
        this.notifyListeners();
      }
    }, 1000);
  }

  private onTimerComplete(session: TimerSession) {
    // Play notification sound
    this.playNotificationSound();
    
    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Timer Complete! 🎉', {
        body: `Your ${session.name} session has ended.`,
        icon: '/favicon.ico',
        tag: 'timer-complete'
      });
    }
    
    // Save to history
    this.saveToHistory(session);
  }

  private playNotificationSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBS+Gy/DaiToIHGS56+GkUhELUKzm7rJgGwU3jdDy0H0vBCl+zPDWiTsKF12y6OyrWBUISpzd8sFuIAUqhMzw3Yo7CRxhufDipFAVC0yz6OyoThAKUKLi8LNlHAY2jdLy0HwvBSd+zPDWizsKGGS56+GjUREKS6nm7b');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }

  private saveToHistory(session: TimerSession) {
    try {
      const history = JSON.parse(localStorage.getItem('timer_history') || '[]');
      history.unshift({
        ...session,
        completedAt: new Date().toISOString()
      });
      // Keep only last 50 sessions
      localStorage.setItem('timer_history', JSON.stringify(history.slice(0, 50)));
    } catch (error) {
      logger.error('Failed to save timer history', 'TimerService', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentSession));
  }

  // Public API

  startTimer(preset: TimerPreset, options?: { subject?: string; task?: string }) {
    this.currentSession = {
      id: `timer-${Date.now()}`,
      type: preset.type,
      name: preset.name,
      duration: preset.duration,
      elapsed: 0,
      isRunning: true,
      isPaused: false,
      startTime: new Date(),
      endTime: null,
      subject: options?.subject,
      task: options?.task
    };
    
    this.saveSession();
    this.notifyListeners();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  pauseTimer() {
    if (this.currentSession && this.currentSession.isRunning) {
      this.currentSession.isPaused = true;
      this.saveSession();
      this.notifyListeners();
    }
  }

  resumeTimer() {
    if (this.currentSession && this.currentSession.isPaused) {
      this.currentSession.isPaused = false;
      this.saveSession();
      this.notifyListeners();
    }
  }

  stopTimer() {
    if (this.currentSession) {
      this.currentSession.isRunning = false;
      this.currentSession.endTime = new Date();
      this.saveToHistory(this.currentSession);
      this.currentSession = null;
      this.saveSession();
      this.notifyListeners();
    }
  }

  getCurrentSession(): TimerSession | null {
    return this.currentSession;
  }

  getTimeRemaining(): number {
    if (!this.currentSession) return 0;
    const totalSeconds = this.currentSession.duration * 60;
    return Math.max(0, totalSeconds - this.currentSession.elapsed);
  }

  getProgress(): number {
    if (!this.currentSession) return 0;
    const totalSeconds = this.currentSession.duration * 60;
    return Math.min(100, (this.currentSession.elapsed / totalSeconds) * 100);
  }

  subscribe(listener: (session: TimerSession | null) => void) {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.currentSession);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  getHistory(): any[] {
    try {
      return JSON.parse(localStorage.getItem('timer_history') || '[]');
    } catch {
      return [];
    }
  }

  clearHistory() {
    localStorage.removeItem('timer_history');
  }

  // Cleanup
  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    window.removeEventListener('storage', this.handleStorageChange);
    this.saveSession();
  }
}

// Create singleton instance
export const timerService = new TimerService();
export default timerService;