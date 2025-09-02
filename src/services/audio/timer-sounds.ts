import { logger } from '@/services/logging/logger';

/**
 * Timer Sound Service
 * Provides audio feedback for timer events
 */

export class TimerSoundService {
  private static instance: TimerSoundService;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private gainNode: GainNode | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;
  
  private constructor() {
    this.initializeAudioContext();
    this.loadDefaultSounds();
  }
  
  static getInstance(): TimerSoundService {
    if (!TimerSoundService.instance) {
      TimerSoundService.instance = new TimerSoundService();
    }
    return TimerSoundService.instance;
  }
  
  /**
   * Initialize Web Audio API context
   */
  private initializeAudioContext() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.volume;
    } catch (error) {
      logger.warn('Web Audio API not supported:', error, 'TimerSounds');
    }
  }
  
  /**
   * Resume audio context if suspended (required for some browsers)
   */
  private async resumeAudioContext() {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
  
  /**
   * Load default timer sounds
   */
  private loadDefaultSounds() {
    // Generate synthetic sounds using Web Audio API
    this.generateBeepSound('start', 440, 0.2); // A4 note, 200ms
    this.generateBeepSound('pause', 330, 0.15); // E4 note, 150ms
    this.generateBeepSound('resume', 523, 0.15); // C5 note, 150ms
    this.generateChimeSound('complete'); // Pleasant completion chime
    this.generateTickSound('tick'); // Soft tick sound
    this.generateWarningSound('warning'); // Warning beep
  }
  
  /**
   * Generate a simple beep sound
   */
  private generateBeepSound(name: string, frequency: number, duration: number) {
    if (!this.audioContext) return;
    
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Generate sine wave with envelope
      const envelope = Math.min(1, 10 * t) * Math.exp(-5 * t);
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
    }
    
    this.sounds.set(name, buffer);
  }
  
  /**
   * Generate a pleasant chime sound for completion
   */
  private generateChimeSound(name: string) {
    if (!this.audioContext) return;
    
    const sampleRate = this.audioContext.sampleRate;
    const duration = 1.5;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);
    
    // Create a pleasant chime with multiple harmonics
    const frequencies = [523, 659, 784, 1047]; // C5, E5, G5, C6 (C major chord)
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        let sample = 0;
        
        frequencies.forEach((freq, index) => {
          const delay = index * 0.1;
          if (t > delay) {
            const localT = t - delay;
            const envelope = Math.exp(-2 * localT) * Math.min(1, 10 * localT);
            sample += Math.sin(2 * Math.PI * freq * localT) * envelope * 0.15;
          }
        });
        
        // Add some reverb-like effect
        if (channel === 1 && i > 1000) {
          sample += data[i - 1000] * 0.3;
        }
        
        data[i] = sample;
      }
    }
    
    this.sounds.set(name, buffer);
  }
  
  /**
   * Generate a soft tick sound
   */
  private generateTickSound(name: string) {
    if (!this.audioContext) return;
    
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.05;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // High frequency click with quick decay
      const envelope = Math.exp(-100 * t);
      data[i] = (Math.random() - 0.5) * envelope * 0.1;
    }
    
    this.sounds.set(name, buffer);
  }
  
  /**
   * Generate a warning sound
   */
  private generateWarningSound(name: string) {
    if (!this.audioContext) return;
    
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.5;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Two-tone warning beep
      const freq1 = 800;
      const freq2 = 600;
      const freq = t < 0.25 ? freq1 : freq2;
      const envelope = t < 0.25 ? 1 : (t < 0.3 ? 0 : 1);
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.2;
    }
    
    this.sounds.set(name, buffer);
  }
  
  /**
   * Play a sound by name
   */
  async playSound(soundName: string) {
    if (!this.enabled || !this.audioContext || !this.gainNode) return;
    
    await this.resumeAudioContext();
    
    const buffer = this.sounds.get(soundName);
    if (!buffer) {
      logger.warn(`Sound "${soundName}" not found`, 'TimerSounds');
      return;
    }
    
    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gainNode);
      source.start();
    } catch (error) {
      logger.error('Error playing sound:', error, 'TimerSounds');
    }
  }
  
  /**
   * Play timer start sound
   */
  async playStart() {
    await this.playSound('start');
  }
  
  /**
   * Play timer pause sound
   */
  async playPause() {
    await this.playSound('pause');
  }
  
  /**
   * Play timer resume sound
   */
  async playResume() {
    await this.playSound('resume');
  }
  
  /**
   * Play timer complete sound
   */
  async playComplete() {
    await this.playSound('complete');
  }
  
  /**
   * Play tick sound
   */
  async playTick() {
    await this.playSound('tick');
  }
  
  /**
   * Play warning sound (e.g., 1 minute remaining)
   */
  async playWarning() {
    await this.playSound('warning');
  }
  
  /**
   * Play a custom frequency beep
   */
  async playBeep(frequency: number = 440, duration: number = 0.2) {
    if (!this.enabled || !this.audioContext || !this.gainNode) return;
    
    await this.resumeAudioContext();
    
    const oscillator = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();
    
    oscillator.connect(envelope);
    envelope.connect(this.gainNode);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    const now = this.audioContext.currentTime;
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.3, now + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
  
  /**
   * Set volume (0 to 1)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }
  
  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }
  
  /**
   * Enable/disable sounds
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
  
  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Load custom sound from URL
   */
  async loadCustomSound(name: string, url: string) {
    if (!this.audioContext) return;
    
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sounds.set(name, audioBuffer);
    } catch (error) {
      logger.error(`Failed to load sound from ${url}:`, error, 'TimerSounds');
    }
  }
  
  /**
   * Test all sounds
   */
  async testAllSounds() {
    const sounds = ['start', 'pause', 'resume', 'complete', 'tick', 'warning'];
    
    for (const sound of sounds) {
      
      await this.playSound(sound);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export const timerSounds = TimerSoundService.getInstance();