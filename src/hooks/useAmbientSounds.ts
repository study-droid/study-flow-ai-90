import { useState, useRef, useCallback, useEffect } from 'react';
import { log } from '@/lib/config';

export interface AmbientSound {
  id: string;
  name: string;
  icon: string;
  frequencies: number[];
  type: 'nature' | 'urban' | 'focus';
  description: string;
}

export const AMBIENT_SOUNDS: AmbientSound[] = [
  {
    id: 'rain',
    name: 'Rain',
    icon: '🌧️',
    frequencies: [200, 400, 800, 1600],
    type: 'nature',
    description: 'Gentle rain sounds for deep focus'
  },
  {
    id: 'ocean',
    name: 'Ocean Waves',
    icon: '🌊',
    frequencies: [100, 300, 600, 1200],
    type: 'nature',
    description: 'Rhythmic ocean waves for relaxation'
  },
  {
    id: 'fire',
    name: 'Crackling Fire',
    icon: '🔥',
    frequencies: [150, 350, 700, 1400],
    type: 'nature',
    description: 'Warm crackling fire for cozy studying'
  },
  {
    id: 'forest',
    name: 'Forest',
    icon: 'tree',
    frequencies: [300, 600, 1200, 2400],
    type: 'nature',
    description: 'Peaceful forest ambience'
  },
  {
    id: 'cafe',
    name: 'Coffee Shop',
    icon: 'coffee',
    frequencies: [250, 500, 1000, 2000],
    type: 'urban',
    description: 'Bustling coffee shop atmosphere'
  },
  {
    id: 'library',
    name: 'Library',
    icon: 'book',
    frequencies: [100, 200, 400, 800],
    type: 'focus',
    description: 'Quiet library ambience'
  },
  {
    id: 'white-noise',
    name: 'White Noise',
    icon: 'radio',
    frequencies: [200, 400, 800, 1600, 3200],
    type: 'focus',
    description: 'Pure white noise for concentration'
  },
  {
    id: 'brown-noise',
    name: 'Brown Noise',
    icon: 'music',
    frequencies: [100, 200, 400, 800],
    type: 'focus',
    description: 'Deep brown noise for focus'
  }
];

class AmbientSoundGenerator {
  private audioContext: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gainNodes: GainNode[] = [];
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  private initAudioContext() {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      } else {
        throw new Error('AudioContext is not supported in this browser');
      }
      this.masterGain = this.audioContext.createGain();
      this.analyser = this.audioContext.createAnalyser();
      
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.3;
    }
    return this.audioContext;
  }

  private generateNoiseBuffer(length: number, type: 'white' | 'pink' | 'brown' = 'white'): AudioBuffer {
    const ctx = this.initAudioContext();
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      
      for (let i = 0; i < length; i++) {
        let sample = 0;
        
        switch (type) {
          case 'white':
            sample = Math.random() * 2 - 1;
            break;
          case 'pink': {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            sample = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            sample *= 0.11;
            b6 = white * 0.115926;
            break;
          }
          case 'brown': {
            const white2 = Math.random() * 2 - 1;
            sample = (b0 + (0.02 * white2)) / 1.02;
            b0 = sample;
            sample *= 3.5;
            break;
          }
        }
        
        channelData[i] = Math.max(-1, Math.min(1, sample));
      }
    }
    
    return buffer;
  }

  play(sound: AmbientSound) {
    this.stop();
    const ctx = this.initAudioContext();
    
    switch (sound.id) {
      case 'white-noise':
      case 'brown-noise':
        this.playNoiseSound(sound);
        break;
      default:
        this.playTonalAmbient(sound);
        break;
    }
  }

  private playNoiseSound(sound: AmbientSound) {
    const ctx = this.initAudioContext();
    const bufferLength = ctx.sampleRate * 2; // 2 seconds loop
    const noiseType = sound.id === 'brown-noise' ? 'brown' : 'white';
    const buffer = this.generateNoiseBuffer(bufferLength, noiseType);
    
    const playNoise = () => {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = 0.4;
      
      source.connect(gain);
      gain.connect(this.masterGain!);
      
      source.start();
      this.oscillators.push(source as OscillatorNode);
      this.gainNodes.push(gain);
    };
    
    playNoise();
  }

  private playTonalAmbient(sound: AmbientSound) {
    const ctx = this.initAudioContext();
    
    sound.frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      // Configure oscillator based on sound type
      oscillator.type = this.getOscillatorType(sound.id, index);
      oscillator.frequency.value = freq + (Math.random() * 10 - 5); // Slight randomization
      
      // Configure filter for more natural sound
      filter.type = 'lowpass';
      filter.frequency.value = freq * 2;
      filter.Q.value = 0.5;
      
      // Configure gain with subtle modulation
      gain.gain.value = 0.1 / sound.frequencies.length;
      
      // Add subtle LFO for natural variation
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.1 + Math.random() * 0.2;
      lfoGain.gain.value = 0.02;
      
      // Connect the chain
      oscillator.connect(filter);
      filter.connect(gain);
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      gain.connect(this.masterGain!);
      
      oscillator.start();
      lfo.start();
      
      this.oscillators.push(oscillator);
      this.oscillators.push(lfo);
      this.gainNodes.push(gain);
      this.gainNodes.push(lfoGain);
    });
  }

  private getOscillatorType(soundId: string, index: number): OscillatorType {
    switch (soundId) {
      case 'rain':
        return index % 2 === 0 ? 'sawtooth' : 'triangle';
      case 'ocean':
        return 'sine';
      case 'fire':
        return index < 2 ? 'sawtooth' : 'square';
      case 'forest':
        return 'triangle';
      case 'cafe':
        return index % 3 === 0 ? 'square' : 'sawtooth';
      case 'library':
        return 'sine';
      default:
        return 'sine';
    }
  }

  stop() {
    this.oscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Oscillator might already be stopped
      }
    });
    this.oscillators = [];
    this.gainNodes = [];
  }

  setVolume(volume: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  getVolume(): number {
    return this.masterGain?.gain.value || 0;
  }

  getAnalyserData(): Uint8Array | null {
    if (!this.analyser) return null;
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  // Clean up and dispose of audio resources
  dispose() {
    this.stop();
    
    // Disconnect and clean up audio nodes
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {
        // Ignore errors during cleanup
      });
      this.audioContext = null;
    }
    
    // Clear all references
    this.oscillators = [];
    this.gainNodes = [];
  }
}

export const useAmbientSounds = () => {
  const [currentSound, setCurrentSound] = useState<AmbientSound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const soundGenerator = useRef(new AmbientSoundGenerator());

  const playSound = useCallback((sound: AmbientSound) => {
    try {
      soundGenerator.current.play(sound);
      setCurrentSound(sound);
      setIsPlaying(true);
    } catch (error) {
      log.error('Failed to play ambient sound:', error);
    }
  }, []);

  const stopSound = useCallback(() => {
    soundGenerator.current.stop();
    setCurrentSound(null);
    setIsPlaying(false);
  }, []);

  const toggleSound = useCallback((sound: AmbientSound) => {
    if (isPlaying && currentSound?.id === sound.id) {
      stopSound();
    } else {
      playSound(sound);
    }
  }, [isPlaying, currentSound, playSound, stopSound]);

  const adjustVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    soundGenerator.current.setVolume(clampedVolume);
  }, []);

  const getAnalyserData = useCallback(() => {
    return soundGenerator.current.getAnalyserData();
  }, []);

  // Clean up on unmount
  useEffect(() => {
    const generator = soundGenerator.current;
    
    return () => {
      // Stop all sounds and dispose of resources
      generator.dispose();
    };
  }, []);

  return {
    currentSound,
    isPlaying,
    volume,
    availableSounds: AMBIENT_SOUNDS,
    playSound,
    stopSound,
    toggleSound,
    adjustVolume,
    getAnalyserData,
  };
};