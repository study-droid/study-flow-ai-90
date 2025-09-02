/**
 * Audio Service
 * Manages real audio playback for ambient sounds and notifications
 */

import { SOUND_LIBRARY, getSoundUrl, getNotificationSound, SOUND_PRESETS } from '@/lib/sounds';
import { log } from '@/lib/config';

export interface AudioInstance {
  id: string;
  audio: HTMLAudioElement;
  volume: number;
  isPlaying: boolean;
  fadeInterval?: number;
}

class AudioService {
  private audioInstances: Map<string, AudioInstance> = new Map();
  private masterVolume: number = 0.5;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isInitialized: boolean = false;

  constructor() {
    // Initialize on first user interaction
    if (typeof window !== 'undefined') {
      ['click', 'touchstart'].forEach(event => {
        window.addEventListener(event, () => this.initialize(), { once: true });
      });
    }
  }

  private async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Create AudioContext for advanced features
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
      }
      
      this.isInitialized = true;
      log.info('Audio service initialized');
    } catch (error) {
      log.error('Failed to initialize audio context:', error);
    }
  }

  /**
   * Play an ambient sound
   */
  async playSound(soundId: string, options: { volume?: number; loop?: boolean; fadeIn?: boolean } = {}) {
    await this.initialize();
    
    // Stop existing instance if playing
    if (this.audioInstances.has(soundId)) {
      await this.stopSound(soundId, { fadeOut: true });
    }

    const soundConfig = SOUND_LIBRARY[soundId as keyof typeof SOUND_LIBRARY];
    if (!soundConfig || typeof soundConfig !== 'object' || !('url' in soundConfig)) {
      log.error(`Sound ${soundId} not found`);
      return;
    }

    try {
      const audio = new Audio(soundConfig.url);
      audio.crossOrigin = 'anonymous';
      audio.loop = options.loop !== false && soundConfig.loopable;
      
      const targetVolume = (options.volume ?? 0.5) * this.masterVolume;
      audio.volume = options.fadeIn ? 0 : targetVolume;

      const instance: AudioInstance = {
        id: soundId,
        audio,
        volume: targetVolume,
        isPlaying: false
      };

      this.audioInstances.set(soundId, instance);

      // Connect to analyser if available
      if (this.audioContext && this.analyser) {
        try {
          const source = this.audioContext.createMediaElementSource(audio);
          const gainNode = this.audioContext.createGain();
          source.connect(gainNode);
          gainNode.connect(this.analyser);
          this.analyser.connect(this.audioContext.destination);
        } catch (e) {
          // Audio might already be connected
        }
      }

      // Play the audio
      await audio.play();
      instance.isPlaying = true;

      // Fade in if requested
      if (options.fadeIn) {
        this.fadeIn(soundId, targetVolume);
      }

      log.info(`Playing sound: ${soundId}`);
    } catch (error) {
      log.error(`Failed to play sound ${soundId}:`, error);
      this.audioInstances.delete(soundId);
      throw error;
    }
  }

  /**
   * Stop a playing sound
   */
  async stopSound(soundId: string, options: { fadeOut?: boolean } = {}) {
    const instance = this.audioInstances.get(soundId);
    if (!instance) return;

    if (options.fadeOut) {
      await this.fadeOut(soundId);
    } else {
      instance.audio.pause();
      instance.audio.currentTime = 0;
    }

    instance.isPlaying = false;
    this.audioInstances.delete(soundId);
    log.info(`Stopped sound: ${soundId}`);
  }

  /**
   * Stop all playing sounds
   */
  async stopAllSounds(options: { fadeOut?: boolean } = {}) {
    const promises = Array.from(this.audioInstances.keys()).map(soundId => 
      this.stopSound(soundId, options)
    );
    await Promise.all(promises);
  }

  /**
   * Toggle a sound on/off
   */
  async toggleSound(soundId: string, options?: { volume?: number; loop?: boolean }) {
    if (this.isPlaying(soundId)) {
      await this.stopSound(soundId, { fadeOut: true });
    } else {
      await this.playSound(soundId, { ...options, fadeIn: true });
    }
  }

  /**
   * Play multiple sounds (preset)
   */
  async playPreset(presetName: keyof typeof SOUND_PRESETS) {
    const preset = SOUND_PRESETS[presetName];
    if (!preset) return;

    // Stop all current sounds
    await this.stopAllSounds({ fadeOut: true });

    // Play all sounds in the preset
    for (const soundId of preset.sounds) {
      const volume = preset.volumes[soundId as keyof typeof preset.volumes] || 0.5;
      await this.playSound(soundId, { volume, loop: true, fadeIn: true });
    }
  }

  /**
   * Play a notification sound
   */
  async playNotification(type: 'gentle' | 'bell' | 'chime' | 'success' = 'gentle') {
    try {
      const url = getNotificationSound(type);
      const audio = new Audio(url);
      audio.volume = this.masterVolume * 0.7;
      await audio.play();
    } catch (error) {
      log.error('Failed to play notification:', error);
    }
  }

  /**
   * Set volume for a specific sound
   */
  setVolume(soundId: string, volume: number) {
    const instance = this.audioInstances.get(soundId);
    if (instance) {
      instance.volume = Math.max(0, Math.min(1, volume));
      instance.audio.volume = instance.volume * this.masterVolume;
    }
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    
    // Update all playing sounds
    this.audioInstances.forEach(instance => {
      instance.audio.volume = instance.volume * this.masterVolume;
    });
  }

  /**
   * Get master volume
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Check if a sound is playing
   */
  isPlaying(soundId: string): boolean {
    const instance = this.audioInstances.get(soundId);
    return instance?.isPlaying || false;
  }

  /**
   * Get all playing sounds
   */
  getPlayingSounds(): string[] {
    return Array.from(this.audioInstances.entries())
      .filter(([_, instance]) => instance.isPlaying)
      .map(([id]) => id);
  }

  /**
   * Get analyser data for visualizer
   */
  getAnalyserData(): Uint8Array | null {
    if (!this.analyser || !this.isInitialized) return null;
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  /**
   * Fade in effect
   */
  private fadeIn(soundId: string, targetVolume: number, duration: number = 1000) {
    const instance = this.audioInstances.get(soundId);
    if (!instance) return;

    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = targetVolume / steps;
    let currentStep = 0;

    if (instance.fadeInterval) {
      clearInterval(instance.fadeInterval);
    }

    instance.fadeInterval = window.setInterval(() => {
      currentStep++;
      const newVolume = Math.min(volumeStep * currentStep, targetVolume);
      instance.audio.volume = newVolume * this.masterVolume;

      if (currentStep >= steps) {
        clearInterval(instance.fadeInterval);
        instance.fadeInterval = undefined;
      }
    }, stepDuration);
  }

  /**
   * Fade out effect
   */
  private fadeOut(soundId: string, duration: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      const instance = this.audioInstances.get(soundId);
      if (!instance) {
        resolve();
        return;
      }

      const steps = 20;
      const stepDuration = duration / steps;
      const currentVolume = instance.audio.volume;
      const volumeStep = currentVolume / steps;
      let currentStep = 0;

      if (instance.fadeInterval) {
        clearInterval(instance.fadeInterval);
      }

      instance.fadeInterval = window.setInterval(() => {
        currentStep++;
        const newVolume = Math.max(currentVolume - (volumeStep * currentStep), 0);
        instance.audio.volume = newVolume;

        if (currentStep >= steps) {
          clearInterval(instance.fadeInterval);
          instance.fadeInterval = undefined;
          instance.audio.pause();
          instance.audio.currentTime = 0;
          resolve();
        }
      }, stepDuration);
    });
  }

  /**
   * Preload sounds for better performance
   */
  async preloadSounds(soundIds: string[]) {
    const promises = soundIds.map(async (soundId) => {
      const soundConfig = SOUND_LIBRARY[soundId as keyof typeof SOUND_LIBRARY];
      if (soundConfig && typeof soundConfig === 'object' && 'url' in soundConfig) {
        try {
          const audio = new Audio(soundConfig.url);
          audio.preload = 'auto';
          // Store for later use
          await new Promise((resolve, reject) => {
            audio.addEventListener('canplaythrough', resolve, { once: true });
            audio.addEventListener('error', reject, { once: true });
          });
        } catch (error) {
          log.warn(`Failed to preload sound ${soundId}:`, error);
        }
      }
    });
    
    await Promise.all(promises);
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    // Clear all fade intervals
    this.audioInstances.forEach(instance => {
      if (instance.fadeInterval) {
        clearInterval(instance.fadeInterval);
      }
      instance.audio.pause();
      instance.audio.src = '';
    });
    
    // Clear all instances
    this.audioInstances.clear();
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.isInitialized = false;
  }
}

// Export singleton instance
export const audioService = new AudioService();

// Auto-cleanup on module unload (browser environment)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    audioService.cleanup();
  });
}

// Export types
export type { AudioInstance };