import { logger } from '@/services/logging/logger';

/**
 * Global Audio Service
 * Manages ambient sound playback with persistence across sessions and tabs
 */

export interface AudioSession {
  soundId: string;
  soundType: 'real' | 'generated';
  soundName: string;
  volume: number;
  isPlaying: boolean;
  timestamp: number;
  audioFile?: string;
}

class AudioService {
  private static instance: AudioService;
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private currentSession: AudioSession | null = null;
  private listeners: Set<(session: AudioSession | null) => void> = new Set();
  private storageKey = 'ambient_audio_session';
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;

  private constructor() {
    this.loadSession();
    this.setupStorageListener();
    this.setupVisibilityListener();
  }

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  // Initialize audio context (Web Audio API)
  private initAudioContext() {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        this.masterGainNode = this.audioContext.createGain();
        this.masterGainNode.connect(this.audioContext.destination);
      }
    }
    return this.audioContext;
  }

  // Load session from localStorage
  private loadSession() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const session = JSON.parse(stored) as AudioSession;
        
        // Check if session is not too old (24 hours)
        const now = Date.now();
        if (now - session.timestamp < 24 * 60 * 60 * 1000) {
          this.currentSession = session;
          
          // Auto-resume if it was playing
          if (session.isPlaying && session.audioFile) {
            this.resumeAudio(session);
          }
        } else {
          // Clear old session
          localStorage.removeItem(this.storageKey);
        }
      }
    } catch (error) {
      logger.error('Failed to load audio session:', error, 'AudioService');
    }
  }

  // Save session to localStorage
  private saveSession() {
    try {
      if (this.currentSession) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.currentSession));
      } else {
        localStorage.removeItem(this.storageKey);
      }
    } catch (error) {
      logger.error('Failed to save audio session:', error, 'AudioService');
    }
  }

  // Setup storage event listener for cross-tab sync
  private setupStorageListener() {
    window.addEventListener('storage', (e) => {
      if (e.key === this.storageKey) {
        if (e.newValue) {
          try {
            const session = JSON.parse(e.newValue) as AudioSession;
            this.handleCrossTabUpdate(session);
          } catch (error) {
            logger.error('Failed to parse storage event:', error, 'AudioService');
          }
        } else {
          // Session was cleared in another tab
          this.stopAll();
        }
      }
    });
  }

  // Handle visibility change (pause when tab is hidden, resume when visible)
  private setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Tab is hidden - keep playing but reduce volume slightly
        this.audioElements.forEach(audio => {
          if (!audio.paused) {
            audio.volume = audio.volume * 0.8;
          }
        });
      } else {
        // Tab is visible - restore volume
        this.audioElements.forEach(audio => {
          if (!audio.paused && this.currentSession) {
            audio.volume = this.currentSession.volume;
          }
        });
      }
    });
  }

  // Handle updates from other tabs
  private handleCrossTabUpdate(session: AudioSession) {
    // Stop current playback if different sound
    if (this.currentSession?.soundId !== session.soundId) {
      this.stopAll();
    }

    this.currentSession = session;
    
    if (session.isPlaying && session.audioFile) {
      this.resumeAudio(session);
    } else if (!session.isPlaying) {
      this.pauseAll();
    }

    this.notifyListeners();
  }

  // Resume audio playback
  private resumeAudio(session: AudioSession) {
    if (session.audioFile) {
      let audio = this.audioElements.get(session.soundId);
      
      if (!audio) {
        audio = new Audio(session.audioFile);
        audio.loop = true;
        this.audioElements.set(session.soundId, audio);
      }

      audio.volume = session.volume;
      
      // Use promise to handle autoplay policies
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            
          })
          .catch(error => {
            logger.error('Audio playback failed:', error, 'AudioService');
            // Update session to reflect playback failure
            if (this.currentSession) {
              this.currentSession.isPlaying = false;
              this.saveSession();
              this.notifyListeners();
            }
          });
      }
    }
  }

  // Public API

  // Play audio with a file path
  playAudio(soundId: string, soundName: string, audioFile: string, volume: number = 0.5) {
    // Stop any current playback
    this.stopAll();

    // Create or get audio element
    let audio = this.audioElements.get(soundId);
    
    if (!audio) {
      audio = new Audio(audioFile);
      audio.loop = true;
      this.audioElements.set(soundId, audio);
    }

    audio.volume = volume;
    
    // Create session
    this.currentSession = {
      soundId,
      soundType: 'real',
      soundName,
      volume,
      isPlaying: true,
      timestamp: Date.now(),
      audioFile
    };

    // Play audio
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.saveSession();
          this.notifyListeners();
        })
        .catch(error => {
          logger.error('Audio playback failed:', error, 'AudioService');
          this.currentSession = null;
          this.notifyListeners();
        });
    }

    return this.currentSession;
  }

  // Play generated sound (Web Audio API)
  playGeneratedSound(soundId: string, soundName: string, frequencies: number[], volume: number = 0.5) {
    this.stopAll();

    const context = this.initAudioContext();
    if (!context || !this.masterGainNode) return null;

    // Create session
    this.currentSession = {
      soundId,
      soundType: 'generated',
      soundName,
      volume,
      isPlaying: true,
      timestamp: Date.now()
    };

    // Store oscillators for later cleanup
    const oscillators: OscillatorNode[] = [];
    
    frequencies.forEach(freq => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      gain.gain.value = volume / frequencies.length;
      
      oscillator.connect(gain);
      gain.connect(this.masterGainNode!);
      
      oscillator.start();
      oscillators.push(oscillator);
    });

    // Store oscillators for cleanup
    (this.currentSession as any).oscillators = oscillators;

    this.saveSession();
    this.notifyListeners();

    return this.currentSession;
  }

  // Pause current playback
  pause() {
    this.audioElements.forEach(audio => {
      if (!audio.paused) {
        audio.pause();
      }
    });

    if (this.currentSession) {
      this.currentSession.isPlaying = false;
      this.saveSession();
      this.notifyListeners();
    }
  }

  // Resume current playback
  resume() {
    if (this.currentSession && this.currentSession.audioFile) {
      const audio = this.audioElements.get(this.currentSession.soundId);
      if (audio && audio.paused) {
        audio.play().catch(err => logger.error('Promise rejection', 'AudioService', err));
        this.currentSession.isPlaying = true;
        this.saveSession();
        this.notifyListeners();
      }
    }
  }

  // Stop all playback
  stopAll() {
    // Stop HTML audio elements
    this.audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });

    // Stop Web Audio oscillators
    if (this.currentSession && (this.currentSession as any).oscillators) {
      const oscillators = (this.currentSession as any).oscillators as OscillatorNode[];
      oscillators.forEach(osc => {
        try {
          osc.stop();
        } catch (e) {
          // Already stopped
        }
      });
    }

    this.currentSession = null;
    this.saveSession();
    this.notifyListeners();
  }

  // Pause all audio elements (internal use)
  private pauseAll() {
    this.audioElements.forEach(audio => {
      if (!audio.paused) {
        audio.pause();
      }
    });
  }

  // Set volume
  setVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    // Update HTML audio elements
    this.audioElements.forEach(audio => {
      audio.volume = clampedVolume;
    });

    // Update Web Audio gain
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = clampedVolume;
    }

    // Update session
    if (this.currentSession) {
      this.currentSession.volume = clampedVolume;
      this.saveSession();
      this.notifyListeners();
    }
  }

  // Get current session
  getCurrentSession(): AudioSession | null {
    return this.currentSession;
  }

  // Subscribe to session changes
  subscribe(listener: (session: AudioSession | null) => void) {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.currentSession);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentSession));
  }

  // Check if any audio is playing
  isPlaying(): boolean {
    return this.currentSession?.isPlaying || false;
  }

  // Get playback info
  getPlaybackInfo() {
    if (!this.currentSession) return null;

    return {
      soundId: this.currentSession.soundId,
      soundName: this.currentSession.soundName,
      volume: this.currentSession.volume,
      isPlaying: this.currentSession.isPlaying,
      duration: this.getDuration(),
      currentTime: this.getCurrentTime()
    };
  }

  // Get audio duration (for HTML audio only)
  private getDuration(): number {
    if (this.currentSession?.audioFile) {
      const audio = this.audioElements.get(this.currentSession.soundId);
      return audio?.duration || 0;
    }
    return 0;
  }

  // Get current playback time (for HTML audio only)
  private getCurrentTime(): number {
    if (this.currentSession?.audioFile) {
      const audio = this.audioElements.get(this.currentSession.soundId);
      return audio?.currentTime || 0;
    }
    return 0;
  }

  // Clean up resources
  destroy() {
    this.stopAll();
    
    // Remove event listeners
    window.removeEventListener('storage', this.setupStorageListener);
    document.removeEventListener('visibilitychange', this.setupVisibilityListener);
    
    // Clear audio elements
    this.audioElements.clear();
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(err => logger.error('Promise rejection', 'AudioService', err));
    }
    
    // Clear listeners
    this.listeners.clear();
  }
}

// Export singleton instance
export const audioService = AudioService.getInstance();
export default audioService;