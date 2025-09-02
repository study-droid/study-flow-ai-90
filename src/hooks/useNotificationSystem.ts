import { toast } from 'sonner';
import { useCallback } from 'react';
import { log } from '@/lib/config';

// Modern notification sounds using Web Audio API
class NotificationSounds {
  private audioContext: AudioContext | null = null;

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  private createTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    const ctx = this.initAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  success() {
    // Pleasant ascending chime
    this.createTone(523.25, 0.2); // C5
    setTimeout(() => this.createTone(659.25, 0.2), 100); // E5
    setTimeout(() => this.createTone(783.99, 0.3), 200); // G5
  }

  error() {
    // Low warning tone
    this.createTone(220, 0.3, 'square');
    setTimeout(() => this.createTone(196, 0.4, 'square'), 150);
  }

  warning() {
    // Double beep
    this.createTone(440, 0.15);
    setTimeout(() => this.createTone(440, 0.15), 200);
  }

  info() {
    // Gentle notification tone
    this.createTone(349.23, 0.25); // F4
    setTimeout(() => this.createTone(392, 0.25), 100); // G4
  }

  focus() {
    // Zen-like tone for focus mode
    this.createTone(256, 0.4, 'triangle');
  }

  achievement() {
    // Celebration sequence
    this.createTone(523.25, 0.15); // C5
    setTimeout(() => this.createTone(659.25, 0.15), 80); // E5
    setTimeout(() => this.createTone(783.99, 0.15), 160); // G5
    setTimeout(() => this.createTone(1046.5, 0.3), 240); // C6
  }
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'focus' | 'achievement';

interface NotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  playSound?: boolean;
}

export const useNotificationSystem = () => {
  const sounds = new NotificationSounds();

  const notify = useCallback((
    type: NotificationType,
    message: string,
    options: NotificationOptions = {}
  ) => {
    const { 
      title, 
      description, 
      duration = 4000, 
      action, 
      playSound = true 
    } = options;

    // Play sound effect
    if (playSound) {
      try {
        sounds[type]();
      } catch (error) {
        log.warn('Could not play notification sound:', error);
      }
    }

    // Show toast notification with enhanced styling
    const toastOptions: any = {
      duration,
      className: `notification-${type}`,
    };

    if (action) {
      toastOptions.action = {
        label: action.label,
        onClick: action.onClick,
      };
    }

    if (description) {
      toastOptions.description = description;
    }

    switch (type) {
      case 'success':
        toast.success(title || message, toastOptions);
        break;
      case 'error':
        toast.error(title || message, toastOptions);
        break;
      case 'warning':
        toast.warning(title || message, toastOptions);
        break;
      case 'info':
        toast.info(title || message, toastOptions);
        break;
      case 'focus':
        toast(title || message, {
          ...toastOptions,
          icon: '⚡',
        });
        break;
      case 'achievement':
        toast(title || message, {
          ...toastOptions,
          icon: '⭐',
        });
        break;
      default:
        toast(title || message, toastOptions);
    }

    // Browser notifications for important types
    if (['achievement', 'focus', 'warning'].includes(type) && 'Notification' in window) {
      // Use specific icons for different notification types
      let notificationIcon = '/src/assets/app_icon.png'; // Default app icon
      if (type === 'focus') {
        notificationIcon = '/src/assets/focus_study.png'; // Focus session icon
      }

      if (Notification.permission === 'granted') {
        new Notification(title || message, {
          body: description,
          icon: notificationIcon,
          tag: type,
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(title || message, {
              body: description,
              icon: notificationIcon,
              tag: type,
            });
          }
        });
      }
    }
  }, []);

  // Enhanced convenience methods with better defaults
  const success = useCallback((message: string, options?: NotificationOptions) => 
    notify('success', message, {
      title: 'Success!',
      ...options
    }), [notify]);
  
  const error = useCallback((message: string, options?: NotificationOptions) => 
    notify('error', message, {
      title: 'Error',
      ...options
    }), [notify]);
  
  const warning = useCallback((message: string, options?: NotificationOptions) => 
    notify('warning', message, {
      title: 'Warning',
      ...options
    }), [notify]);
  
  const info = useCallback((message: string, options?: NotificationOptions) => 
    notify('info', message, {
      title: 'Info',
      ...options
    }), [notify]);
  
  const focus = useCallback((message: string, options?: NotificationOptions) => 
    notify('focus', message, {
      title: 'Focus Mode',
      ...options
    }), [notify]);
  
  const achievement = useCallback((message: string, options?: NotificationOptions) => 
    notify('achievement', message, {
      title: 'Achievement Unlocked!',
      ...options
    }), [notify]);

  // Request notification permission on hook initialization
  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  return {
    notify,
    success,
    error,
    warning,
    info,
    focus,
    achievement,
    requestPermission,
  };
};