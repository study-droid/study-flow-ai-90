import rainSound from '@/assets/pomodoro/rain.mp3';
import oceanSound from '@/assets/pomodoro/ocean waves.mp3';
import forestSound from '@/assets/pomodoro/forest-ambience-296528.mp3';
import cafeSound from '@/assets/pomodoro/coffee_shop.mp3';
import fireplaceSound from '@/assets/pomodoro/fireplace.mp3';
import mountainSound from '@/assets/pomodoro/mountain_wind.mp3';
import { CloudRain, Waves, Wind, Coffee, Flame, Mountain } from 'lucide-react';
import { logger } from '@/services/logging/logger';

export interface AmbientSound {
  id: string;
  name: string;
  icon: any;
  color: string;
  gradient: string;
  audioFile: string;
}

export interface PlayingSound {
  id: string;
  name: string;
  icon: any;
  isPlaying: boolean;
}

class AmbientAudioService {
  private static instance: AmbientAudioService;
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private playingStates: Map<string, boolean> = new Map();
  private masterVolume: number = 0.75;
  private isEnabled: boolean = true;
  private listeners: Set<(states: PlayingSound[]) => void> = new Set();

  public readonly sounds: AmbientSound[] = [
    {
      id: 'rain',
      name: 'Rain',
      icon: CloudRain,
      color: 'text-blue-500',
      gradient: 'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20',
      audioFile: rainSound
    },
    {
      id: 'ocean',
      name: 'Ocean Waves',
      icon: Waves,
      color: 'text-cyan-500',
      gradient: 'from-cyan-50 to-cyan-100 dark:from-cyan-950/20 dark:to-cyan-900/20',
      audioFile: oceanSound
    },
    {
      id: 'forest',
      name: 'Forest',
      icon: Wind,
      color: 'text-green-500',
      gradient: 'from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20',
      audioFile: forestSound
    },
    {
      id: 'cafe',
      name: 'Coffee Shop',
      icon: Coffee,
      color: 'text-amber-600',
      gradient: 'from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20',
      audioFile: cafeSound
    },
    {
      id: 'fireplace',
      name: 'Fireplace',
      icon: Flame,
      color: 'text-orange-500',
      gradient: 'from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20',
      audioFile: fireplaceSound
    },
    {
      id: 'mountain',
      name: 'Mountain Wind',
      icon: Mountain,
      color: 'text-slate-500',
      gradient: 'from-slate-50 to-slate-100 dark:from-slate-950/20 dark:to-slate-900/20',
      audioFile: mountainSound
    }
  ];

  private constructor() {
    this.initializeAudioElements();
    this.loadState();
  }

  public static getInstance(): AmbientAudioService {
    if (!AmbientAudioService.instance) {
      AmbientAudioService.instance = new AmbientAudioService();
    }
    return AmbientAudioService.instance;
  }

  private initializeAudioElements() {
    // Only initialize playing states, not audio elements
    // Audio elements will be created on-demand when played
    this.sounds.forEach(sound => {
      this.playingStates.set(sound.id, false);
    });
  }

  private loadState() {
    try {
      const savedState = localStorage.getItem('ambientAudioState');
      if (savedState) {
        const state = JSON.parse(savedState);
        this.masterVolume = state.masterVolume ?? 0.75;
        this.isEnabled = state.isEnabled ?? true;
        
        // Don't auto-play sounds on page load to avoid unwanted downloads
        // Users can manually resume playing if desired
      }
    } catch (error) {
      logger.error('Failed to load ambient audio state:', error, 'AmbientAudioService');
    }
  }

  private saveState() {
    try {
      const playingSounds = Array.from(this.playingStates.entries())
        .filter(([_, isPlaying]) => isPlaying)
        .map(([id]) => id);

      const state = {
        masterVolume: this.masterVolume,
        isEnabled: this.isEnabled,
        playingSounds
      };

      localStorage.setItem('ambientAudioState', JSON.stringify(state));
    } catch (error) {
      logger.error('Failed to save ambient audio state:', error, 'AmbientAudioService');
    }
  }

  public toggleSound(soundId: string): boolean {
    if (!this.isEnabled) return false;

    const isCurrentlyPlaying = this.playingStates.get(soundId) || false;

    if (isCurrentlyPlaying) {
      this.pauseSound(soundId);
    } else {
      this.playSound(soundId);
    }

    return !isCurrentlyPlaying;
  }

  private playSound(soundId: string) {
    if (!this.isEnabled) return;
    
    let audio = this.audioElements.get(soundId);
    
    // Create audio element on-demand if it doesn't exist
    if (!audio) {
      const sound = this.sounds.find(s => s.id === soundId);
      if (!sound) {
        logger.error(`Sound with ID ${soundId} not found`, 'AmbientAudioService');
        return;
      }

      audio = new Audio();
      audio.src = sound.audioFile;
      audio.loop = true;
      audio.volume = this.masterVolume;
      audio.preload = 'none'; // Don't preload to avoid downloads
      audio.crossOrigin = 'anonymous'; // Handle CORS if needed
      
      // Add event listeners for debugging
      audio.addEventListener('error', (e) => {
        logger.error(`Audio error for ${soundId}:`, e, 'AmbientAudioService');
      });
      
      this.audioElements.set(soundId, audio);
    }

    // Handle browser autoplay policy
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        
        this.playingStates.set(soundId, true);
        this.notifyListeners();
        this.saveState();
      }).catch(err => {
        logger.error(`Error playing audio ${soundId}:`, err, 'AmbientAudioService');
        
        // Handle autoplay policy errors
        if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
          logger.warn(`Autoplay blocked for ${soundId}. User interaction required.`, 'AmbientAudioService');
          // Show user notification that they need to interact with page first
          alert(`Please interact with the page first to enable audio playback for ${soundId}`);
        }
        
        // Reset playing state on error
        this.playingStates.set(soundId, false);
        this.notifyListeners();
      });
    }
  }

  private pauseSound(soundId: string) {
    const audio = this.audioElements.get(soundId);
    if (!audio) {
      
      return;
    }

    audio.pause();
    this.playingStates.set(soundId, false);
    this.notifyListeners();
    this.saveState();
  }

  public stopAllSounds() {
    this.audioElements.forEach((audio, soundId) => {
      audio.pause();
      audio.currentTime = 0;
      this.playingStates.set(soundId, false);
    });
    this.notifyListeners();
    this.saveState();
  }

  public setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    // Only update volume for existing audio elements
    this.audioElements.forEach(audio => {
      audio.volume = this.masterVolume * (this.isEnabled ? 1 : 0);
    });
    this.saveState();
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    
    if (!enabled) {
      // Only pause existing audio elements
      this.audioElements.forEach((audio, soundId) => {
        audio.pause();
        this.playingStates.set(soundId, false);
      });
    } else {
      // Only update volume for existing audio elements
      this.audioElements.forEach(audio => {
        audio.volume = this.masterVolume;
      });
    }
    
    this.notifyListeners();
    this.saveState();
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public getPlayingStates(): PlayingSound[] {
    return this.sounds.map(sound => ({
      id: sound.id,
      name: sound.name,
      icon: sound.icon,
      isPlaying: this.playingStates.get(sound.id) || false
    }));
  }

  public getPlayingSounds(): AmbientSound[] {
    return this.sounds.filter(sound => 
      this.playingStates.get(sound.id) === true
    );
  }

  public isPlaying(soundId: string): boolean {
    return this.playingStates.get(soundId) || false;
  }

  public subscribe(callback: (states: PlayingSound[]) => void) {
    this.listeners.add(callback);
    // Immediately call with current state
    callback(this.getPlayingStates());
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    const states = this.getPlayingStates();
    this.listeners.forEach(callback => callback(states));
  }
}

export const ambientAudioService = AmbientAudioService.getInstance();
export default ambientAudioService;