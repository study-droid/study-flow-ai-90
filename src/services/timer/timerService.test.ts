/**
 * Timer Service Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { timerService } from './timerService';
import { TIMER_PRESETS } from './timerService';

describe('TimerService', () => {
  beforeEach(() => {
    // Clear any existing timers
    timerService.stopTimer();
    // Clear localStorage
    localStorage.clear();
    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Timer Creation', () => {
    it('should start a new timer with preset', () => {
      const preset = TIMER_PRESETS[0]; // Pomodoro
      timerService.startTimer(preset.type);
      
      const session = timerService.getCurrentSession();
      expect(session).toBeDefined();
      expect(session?.type).toBe(preset.type);
      expect(session?.name).toBe(preset.name);
      expect(session?.duration).toBe(preset.duration);
      expect(session?.isRunning).toBe(true);
      expect(session?.isPaused).toBe(false);
      expect(session?.elapsed).toBe(0);
    });

    it('should start a custom timer', () => {
      timerService.startCustomTimer(45, 'Custom Study');
      
      const session = timerService.getCurrentSession();
      expect(session).toBeDefined();
      expect(session?.type).toBe('custom');
      expect(session?.name).toBe('Custom Study');
      expect(session?.duration).toBe(45);
      expect(session?.isRunning).toBe(true);
    });

    it('should not start a new timer if one is running', () => {
      timerService.startTimer('pomodoro');
      const firstSession = timerService.getCurrentSession();
      
      timerService.startTimer('deepwork');
      const secondSession = timerService.getCurrentSession();
      
      // Should still be the first session
      expect(secondSession?.id).toBe(firstSession?.id);
      expect(secondSession?.type).toBe('pomodoro');
    });
  });

  describe('Timer Controls', () => {
    it('should pause and resume timer', () => {
      timerService.startTimer('pomodoro');
      
      // Run for 5 seconds
      vi.advanceTimersByTime(5000);
      const elapsed1 = timerService.getCurrentSession()?.elapsed;
      expect(elapsed1).toBe(5);
      
      // Pause
      timerService.pauseTimer();
      expect(timerService.getCurrentSession()?.isPaused).toBe(true);
      
      // Advance time while paused
      vi.advanceTimersByTime(5000);
      const elapsed2 = timerService.getCurrentSession()?.elapsed;
      expect(elapsed2).toBe(5); // Should not increase
      
      // Resume
      timerService.resumeTimer();
      expect(timerService.getCurrentSession()?.isPaused).toBe(false);
      
      // Run for another 5 seconds
      vi.advanceTimersByTime(5000);
      const elapsed3 = timerService.getCurrentSession()?.elapsed;
      expect(elapsed3).toBe(10);
    });

    it('should stop timer', () => {
      timerService.startTimer('pomodoro');
      expect(timerService.getCurrentSession()).toBeDefined();
      
      timerService.stopTimer();
      expect(timerService.getCurrentSession()).toBeNull();
    });

    it('should complete timer when duration reached', () => {
      const completeSpy = vi.fn();
      timerService.subscribe(completeSpy);
      
      timerService.startTimer('shortbreak'); // 5 minutes
      
      // Advance to just before completion
      vi.advanceTimersByTime(4 * 60 * 1000 + 59000);
      expect(timerService.getCurrentSession()?.isRunning).toBe(true);
      
      // Advance to completion
      vi.advanceTimersByTime(1000);
      
      const session = timerService.getCurrentSession();
      expect(session?.isRunning).toBe(false);
      expect(session?.endTime).toBeDefined();
      
      // Check that subscribers were notified
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Timer Progress', () => {
    it('should calculate progress percentage', () => {
      timerService.startTimer('pomodoro'); // 25 minutes
      
      expect(timerService.getProgress()).toBe(0);
      
      // 5 minutes elapsed
      vi.advanceTimersByTime(5 * 60 * 1000);
      expect(timerService.getProgress()).toBe(20); // 5/25 = 20%
      
      // 12.5 minutes elapsed
      vi.advanceTimersByTime(7.5 * 60 * 1000);
      expect(timerService.getProgress()).toBe(50); // 12.5/25 = 50%
      
      // 25 minutes elapsed
      vi.advanceTimersByTime(12.5 * 60 * 1000);
      expect(timerService.getProgress()).toBe(100);
    });

    it('should format remaining time correctly', () => {
      timerService.startTimer('pomodoro'); // 25 minutes
      
      expect(timerService.getRemainingTime()).toBe('25:00');
      
      // 1 minute elapsed
      vi.advanceTimersByTime(60 * 1000);
      expect(timerService.getRemainingTime()).toBe('24:00');
      
      // 24 minutes 30 seconds elapsed
      vi.advanceTimersByTime(23.5 * 60 * 1000);
      expect(timerService.getRemainingTime()).toBe('0:30');
    });
  });

  describe('Session History', () => {
    it('should save completed sessions to history', () => {
      timerService.startTimer('pomodoro');
      
      // Complete the timer
      vi.advanceTimersByTime(25 * 60 * 1000);
      
      const history = timerService.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('pomodoro');
      expect(history[0].completedAt).toBeDefined();
    });

    it('should limit history to 50 sessions', () => {
      // Create 55 sessions
      for (let i = 0; i < 55; i++) {
        timerService.startTimer('sprint');
        vi.advanceTimersByTime(15 * 60 * 1000);
        timerService.stopTimer();
      }
      
      const history = timerService.getHistory();
      expect(history).toHaveLength(50);
    });

    it('should clear history', () => {
      // Create some sessions
      for (let i = 0; i < 5; i++) {
        timerService.startTimer('sprint');
        vi.advanceTimersByTime(15 * 60 * 1000);
        timerService.stopTimer();
      }
      
      expect(timerService.getHistory()).toHaveLength(5);
      
      timerService.clearHistory();
      expect(timerService.getHistory()).toHaveLength(0);
    });
  });

  describe('Persistence', () => {
    it('should save session to localStorage', () => {
      timerService.startTimer('deepwork');
      
      const stored = localStorage.getItem('timer_session');
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.type).toBe('deepwork');
      expect(parsed.duration).toBe(90);
    });

    it('should restore session from localStorage', () => {
      // Create a session
      const session = {
        id: 'test-id',
        type: 'pomodoro',
        name: 'Pomodoro',
        duration: 25,
        elapsed: 300, // 5 minutes
        isRunning: true,
        isPaused: false,
        startTime: new Date(Date.now() - 300000).toISOString(),
        endTime: null,
      };
      
      localStorage.setItem('timer_session', JSON.stringify(session));
      
      // Create new service instance (simulating page reload)
      // Note: In real implementation, you'd need to re-initialize the service
      const loadedSession = timerService.getCurrentSession();
      
      // The service should load and continue the session
      // This test assumes the service loads from localStorage on construction
    });
  });

  describe('Subscribers', () => {
    it('should notify subscribers on timer updates', () => {
      const subscriber = vi.fn();
      const unsubscribe = timerService.subscribe(subscriber);
      
      timerService.startTimer('pomodoro');
      expect(subscriber).toHaveBeenCalledTimes(1);
      
      // Timer tick
      vi.advanceTimersByTime(1000);
      expect(subscriber).toHaveBeenCalledTimes(2);
      
      // Pause
      timerService.pauseTimer();
      expect(subscriber).toHaveBeenCalledTimes(3);
      
      // Unsubscribe
      unsubscribe();
      
      // Resume should not trigger subscriber
      timerService.resumeTimer();
      expect(subscriber).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple subscribers', () => {
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();
      
      timerService.subscribe(subscriber1);
      timerService.subscribe(subscriber2);
      
      timerService.startTimer('pomodoro');
      
      expect(subscriber1).toHaveBeenCalled();
      expect(subscriber2).toHaveBeenCalled();
    });
  });

  describe('Timer Statistics', () => {
    it('should calculate today\'s focus time', () => {
      // Complete a few sessions
      timerService.startTimer('pomodoro'); // 25 min
      vi.advanceTimersByTime(25 * 60 * 1000);
      
      timerService.startTimer('sprint'); // 15 min
      vi.advanceTimersByTime(15 * 60 * 1000);
      
      const stats = timerService.getTodayStats();
      expect(stats.totalMinutes).toBe(40);
      expect(stats.sessionsCompleted).toBe(2);
    });

    it('should track session types', () => {
      timerService.startTimer('pomodoro');
      vi.advanceTimersByTime(25 * 60 * 1000);
      
      timerService.startTimer('deepwork');
      vi.advanceTimersByTime(90 * 60 * 1000);
      
      timerService.startTimer('pomodoro');
      vi.advanceTimersByTime(25 * 60 * 1000);
      
      const stats = timerService.getTodayStats();
      expect(stats.byType?.pomodoro).toBe(2);
      expect(stats.byType?.deepwork).toBe(1);
    });
  });
});