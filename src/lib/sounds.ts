import { logger } from '@/services/logging/logger';

/**
 * Sound Library
 * Free, open-source ambient sounds for the Pomodoro timer and focus sessions
 * All sounds are from royalty-free sources
 */

// Sound URLs from CDN-hosted free audio sources
export const SOUND_LIBRARY = {
  // Nature sounds
  rain: {
    url: 'https://cdn.freesound.org/previews/531/531947_7037-lq.mp3',
    name: 'Gentle Rain',
    description: 'Soft rain sounds for deep focus',
    license: 'CC0',
    duration: 180, // seconds
    loopable: true
  },
  ocean: {
    url: 'https://cdn.freesound.org/previews/450/450755_7037-lq.mp3', 
    name: 'Ocean Waves',
    description: 'Calming ocean waves',
    license: 'CC0',
    duration: 120,
    loopable: true
  },
  forest: {
    url: 'https://cdn.freesound.org/previews/569/569853_7037-lq.mp3',
    name: 'Forest Birds',
    description: 'Peaceful forest ambience with birds',
    license: 'CC0',
    duration: 240,
    loopable: true
  },
  thunder: {
    url: 'https://cdn.freesound.org/previews/360/360328_7037-lq.mp3',
    name: 'Distant Thunder',
    description: 'Soft thunder and rain',
    license: 'CC0',
    duration: 180,
    loopable: true
  },
  
  // Urban sounds
  cafe: {
    url: 'https://cdn.freesound.org/previews/564/564194_7037-lq.mp3',
    name: 'Coffee Shop',
    description: 'Bustling cafe atmosphere',
    license: 'CC0',
    duration: 150,
    loopable: true
  },
  
  // Focus sounds
  whitenoise: {
    url: 'https://cdn.freesound.org/previews/567/567269_7037-lq.mp3',
    name: 'White Noise',
    description: 'Pure white noise for concentration',
    license: 'CC0',
    duration: 60,
    loopable: true
  },
  brownnoise: {
    url: 'https://cdn.freesound.org/previews/567/567268_7037-lq.mp3',
    name: 'Brown Noise',
    description: 'Deep brown noise for focus',
    license: 'CC0',
    duration: 60,
    loopable: true
  },
  
  // Meditation sounds
  tibetanbowl: {
    url: 'https://cdn.freesound.org/previews/462/462271_7037-lq.mp3',
    name: 'Tibetan Bowl',
    description: 'Relaxing singing bowl',
    license: 'CC0',
    duration: 30,
    loopable: false
  },
  
  // Notification sounds for Pomodoro
  notification: {
    gentle: 'https://cdn.freesound.org/previews/411/411090_5858208-lq.mp3',
    bell: 'https://cdn.freesound.org/previews/484/484344_5858208-lq.mp3',
    chime: 'https://cdn.freesound.org/previews/442/442827_5858208-lq.mp3',
    success: 'https://cdn.freesound.org/previews/436/436668_5858208-lq.mp3'
  }
};

// Alternative CDN sources for fallback
export const FALLBACK_SOUNDS = {
  rain: 'https://www.soundjay.com/misc/rain-01.mp3',
  ocean: 'https://www.soundjay.com/misc/ocean-wave-1.mp3',
  forest: 'https://www.soundjay.com/misc/birds-1.mp3',
  whitenoise: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQQAAAA=', // Silent fallback
};

// Sound categories for organization
export const SOUND_CATEGORIES = {
  nature: ['rain', 'ocean', 'forest', 'thunder'],
  urban: ['cafe'],
  focus: ['whitenoise', 'brownnoise'],
  meditation: ['tibetanbowl']
};

// Presets for different moods
export const SOUND_PRESETS = {
  deepFocus: {
    name: 'Deep Focus',
    sounds: ['brownnoise'],
    volumes: { brownnoise: 0.3 }
  },
  relaxedStudy: {
    name: 'Relaxed Study',
    sounds: ['rain', 'cafe'],
    volumes: { rain: 0.4, cafe: 0.2 }
  },
  natureEscape: {
    name: 'Nature Escape',
    sounds: ['forest', 'ocean'],
    volumes: { forest: 0.5, ocean: 0.3 }
  },
  stormyFocus: {
    name: 'Stormy Focus',
    sounds: ['rain', 'thunder'],
    volumes: { rain: 0.5, thunder: 0.3 }
  }
};

// Volume recommendations
export const VOLUME_PRESETS = {
  background: 0.2,
  ambient: 0.4,
  focused: 0.6,
  immersive: 0.8
};

/**
 * Helper to get sound URL with fallback
 */
export function getSoundUrl(soundId: string): string {
  const sound = SOUND_LIBRARY[soundId as keyof typeof SOUND_LIBRARY];
  
  if (!sound) {
    logger.warn(`Sound ${soundId} not found`, 'Sounds');
    return '';
  }
  
  // For nested objects like notification sounds
  if (typeof sound === 'object' && 'url' in sound) {
    return sound.url;
  }
  
  // Fallback for sounds that might not load
  const fallback = FALLBACK_SOUNDS[soundId as keyof typeof FALLBACK_SOUNDS];
  return fallback || '';
}

/**
 * Get notification sound URL
 */
export function getNotificationSound(type: 'gentle' | 'bell' | 'chime' | 'success' = 'gentle'): string {
  return SOUND_LIBRARY.notification[type] || SOUND_LIBRARY.notification.gentle;
}