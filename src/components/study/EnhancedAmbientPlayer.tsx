import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw,
  Waves,
  CloudRain,
  Wind,
  Coffee,
  Flame,
  Mountain,
  Music,
  TreePine,
  Cloud,
  Headphones,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { audioService } from '@/services/audio-service';
import { SOUND_PRESETS } from '@/lib/sounds';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/services/logging/logger';

interface AmbientSound {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
}

const ambientSounds: AmbientSound[] = [
  {
    id: 'rain',
    name: 'Gentle Rain',
    icon: CloudRain,
    color: 'text-blue-500',
    gradient: 'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'
  },
  {
    id: 'ocean',
    name: 'Ocean Waves',
    icon: Waves,
    color: 'text-cyan-500',
    gradient: 'from-cyan-50 to-cyan-100 dark:from-cyan-950/20 dark:to-cyan-900/20'
  },
  {
    id: 'forest',
    name: 'Forest Birds',
    icon: TreePine,
    color: 'text-green-500',
    gradient: 'from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20'
  },
  {
    id: 'thunder',
    name: 'Distant Thunder',
    icon: Cloud,
    color: 'text-purple-500',
    gradient: 'from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20'
  },
  {
    id: 'cafe',
    name: 'Coffee Shop',
    icon: Coffee,
    color: 'text-amber-600',
    gradient: 'from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20'
  },
  {
    id: 'whitenoise',
    name: 'White Noise',
    icon: Headphones,
    color: 'text-gray-500',
    gradient: 'from-gray-50 to-gray-100 dark:from-gray-950/20 dark:to-gray-900/20'
  },
  {
    id: 'brownnoise',
    name: 'Brown Noise',
    icon: Mountain,
    color: 'text-stone-500',
    gradient: 'from-stone-50 to-stone-100 dark:from-stone-950/20 dark:to-stone-900/20'
  },
  {
    id: 'tibetanbowl',
    name: 'Tibetan Bowl',
    icon: Sparkles,
    color: 'text-indigo-500',
    gradient: 'from-indigo-50 to-indigo-100 dark:from-indigo-950/20 dark:to-indigo-900/20'
  }
];

export const EnhancedAmbientPlayer: React.FC = () => {
  const [playingSounds, setPlayingSounds] = useState<Set<string>>(new Set());
  const [masterVolume, setMasterVolume] = useState([75]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [visualizerData, setVisualizerData] = useState<number[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { toast } = useToast();

  // Update visualizer when sounds are playing
  useEffect(() => {
    if (playingSounds.size > 0 && isEnabled) {
      const interval = setInterval(() => {
        const data = audioService.getAnalyserData();
        if (data) {
          // Convert frequency data to smaller array for visualization
          const simplified = [];
          const step = Math.floor(data.length / 20);
          for (let i = 0; i < 20; i++) {
            const value = data[i * step] || 0;
            simplified.push((value / 255) * 100);
          }
          setVisualizerData(simplified);
        } else {
          // Fallback random visualization
          setVisualizerData(Array.from({ length: 20 }, () => Math.random() * 100));
        }
      }, 100);

      return () => clearInterval(interval);
    } else {
      setVisualizerData([]);
    }
  }, [playingSounds, isEnabled]);

  // Update master volume
  useEffect(() => {
    audioService.setMasterVolume(masterVolume[0] / 100);
  }, [masterVolume]);

  // Preload sounds on mount
  useEffect(() => {
    const soundIds = ambientSounds.map(s => s.id);
    audioService.preloadSounds(soundIds).catch(err => logger.error('Promise rejection', 'EnhancedAmbientPlayer', err));
  }, []);

  const toggleSound = async (soundId: string) => {
    if (!isEnabled) return;
    
    setIsLoading(soundId);
    try {
      await audioService.toggleSound(soundId, { volume: 0.5, loop: true });
      
      setPlayingSounds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(soundId)) {
          newSet.delete(soundId);
        } else {
          newSet.add(soundId);
        }
        return newSet;
      });
      
      // Clear preset selection if manually toggling sounds
      setSelectedPreset(null);
    } catch (error) {
      toast({
        title: "Playback Error",
        description: "Failed to play sound. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(null);
    }
  };

  const stopAllSounds = async () => {
    await audioService.stopAllSounds({ fadeOut: true });
    setPlayingSounds(new Set());
    setSelectedPreset(null);
  };

  const playPreset = async (presetKey: keyof typeof SOUND_PRESETS) => {
    setIsLoading('preset');
    try {
      await audioService.playPreset(presetKey);
      const preset = SOUND_PRESETS[presetKey];
      setPlayingSounds(new Set(preset.sounds));
      setSelectedPreset(presetKey);
      
      toast({
        title: "Preset Loaded",
        description: `Now playing: ${preset.name}`,
      });
    } catch (error) {
      toast({
        title: "Preset Error",
        description: "Failed to load preset. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleToggleEnabled = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      stopAllSounds();
    }
  };

  return (
    <Card className="study-flow-shadow-soft animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              Real Ambient Sounds
            </CardTitle>
            <CardDescription>
              High-quality ambient sounds for deep focus
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="sound-toggle" className="text-sm">
                {isEnabled ? 'On' : 'Off'}
              </Label>
              <Switch
                id="sound-toggle"
                checked={isEnabled}
                onCheckedChange={handleToggleEnabled}
              />
            </div>
            
            {playingSounds.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={stopAllSounds}
                className="text-destructive hover:text-destructive"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Stop All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Master Volume */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Master Volume</Label>
            <div className="flex items-center gap-2">
              {masterVolume[0] === 0 ? (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground w-8">
                {masterVolume[0]}%
              </span>
            </div>
          </div>
          <Slider
            value={masterVolume}
            onValueChange={setMasterVolume}
            max={100}
            step={5}
            className="w-full"
            disabled={!isEnabled}
          />
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quick Presets</Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(SOUND_PRESETS).map(([key, preset]) => (
              <Button
                key={key}
                variant={selectedPreset === key ? "default" : "outline"}
                size="sm"
                onClick={() => playPreset(key as keyof typeof SOUND_PRESETS)}
                disabled={!isEnabled || isLoading === 'preset'}
                className="justify-start"
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Audio Visualizer */}
        {visualizerData.length > 0 && (
          <div className="p-4 rounded-lg bg-muted/30 animate-fade-in">
            <div className="flex items-end justify-center gap-1 h-16">
              {visualizerData.map((height, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-t from-primary to-primary-glow rounded-sm transition-all duration-100 ease-out"
                  style={{
                    height: `${Math.max(height * 0.6, 8)}px`,
                    width: '4px',
                    opacity: 0.8 + (height / 500)
                  }}
                />
              ))}
            </div>
            <div className="text-center mt-2">
              <Badge variant="secondary" className="text-xs">
                {playingSounds.size} sound{playingSounds.size !== 1 ? 's' : ''} playing
              </Badge>
            </div>
          </div>
        )}

        {/* Sound Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ambientSounds.map((sound) => {
            const isPlaying = playingSounds.has(sound.id);
            const isLoadingThis = isLoading === sound.id;
            
            return (
              <div
                key={sound.id}
                className={cn(
                  "relative group cursor-pointer transition-all duration-200 hover:scale-105",
                  "p-3 rounded-lg border-2",
                  `bg-gradient-to-br ${sound.gradient}`,
                  isPlaying && isEnabled
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-transparent hover:border-primary/50",
                  !isEnabled && "opacity-50 cursor-not-allowed",
                  isLoadingThis && "animate-pulse"
                )}
                onClick={() => !isLoadingThis && toggleSound(sound.id)}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={cn(
                    "p-2 rounded-full transition-all duration-200",
                    isPlaying && isEnabled
                      ? "bg-primary/20 scale-110"
                      : "bg-background/50 group-hover:bg-primary/10"
                  )}>
                    <sound.icon className={cn(
                      "h-5 w-5 transition-colors duration-200",
                      isPlaying && isEnabled ? "text-primary" : sound.color
                    )} />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="font-medium text-xs">{sound.name}</h3>
                    
                    {isLoadingThis ? (
                      <span className="text-xs text-muted-foreground">Loading...</span>
                    ) : isPlaying && isEnabled ? (
                      <div className="flex items-center justify-center gap-1">
                        <Pause className="h-3 w-3 text-primary" />
                        <span className="text-xs text-primary">Playing</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Play className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Play</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Playing indicator */}
                {isPlaying && isEnabled && !isLoadingThis && (
                  <div className="absolute top-1 right-1">
                    <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Currently Playing */}
        {playingSounds.size > 0 && isEnabled && (
          <div className="space-y-3 pt-4 border-t animate-fade-in">
            <h4 className="font-medium text-sm text-muted-foreground">Currently Playing</h4>
            <div className="flex flex-wrap gap-2">
              {Array.from(playingSounds).map((soundId) => {
                const sound = ambientSounds.find(s => s.id === soundId);
                if (!sound) return null;
                
                return (
                  <Badge
                    key={soundId}
                    variant="secondary"
                    className="bg-primary/10 text-primary border border-primary/20"
                  >
                    <sound.icon className="h-3 w-3 mr-1" />
                    {sound.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Tips */}
        {playingSounds.size === 0 && isEnabled && (
          <div className="text-center p-6 text-muted-foreground">
            <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Select sounds or use presets to create your perfect study environment
            </p>
            <p className="text-xs mt-2 opacity-75">
              All sounds are high-quality, royalty-free audio
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};