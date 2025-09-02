import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw,
  Music
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ambientAudioService, type PlayingSound } from '@/services/ambientAudioService';

export const AmbientSoundPlayer: React.FC = () => {
  const [playingStates, setPlayingStates] = useState<PlayingSound[]>([]);
  const [masterVolume, setMasterVolume] = useState([ambientAudioService.getMasterVolume() * 100]);
  const [isEnabled, setIsEnabled] = useState(ambientAudioService.getEnabled());
  const [visualizerData, setVisualizerData] = useState<number[]>([]);

  const sounds = ambientAudioService.sounds;

  useEffect(() => {
    // Subscribe to audio state changes
    const unsubscribe = ambientAudioService.subscribe((states) => {
      setPlayingStates(states);
    });

    return unsubscribe;
  }, []);

  // Simulate audio visualizer data
  useEffect(() => {
    const hasPlayingSounds = playingStates.some(s => s.isPlaying);
    
    if (hasPlayingSounds && isEnabled) {
      const interval = setInterval(() => {
        const newData = Array.from({ length: 20 }, () => Math.random() * 100);
        setVisualizerData(newData);
      }, 100);

      return () => clearInterval(interval);
    } else {
      setVisualizerData([]);
    }
  }, [playingStates, isEnabled]);

  const toggleSound = (soundId: string) => {
    
    const result = ambientAudioService.toggleSound(soundId);
    
  };

  const stopAllSounds = () => {
    ambientAudioService.stopAllSounds();
  };

  const handleVolumeChange = (value: number[]) => {
    setMasterVolume(value);
    ambientAudioService.setMasterVolume(value[0] / 100);
  };

  const handleEnabledChange = (enabled: boolean) => {
    setIsEnabled(enabled);
    ambientAudioService.setEnabled(enabled);
  };

  const playingSounds = sounds.filter(sound => 
    playingStates.find(s => s.id === sound.id)?.isPlaying
  );

  return (
    <Card className="study-flow-shadow-soft animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              Ambient Sounds
            </CardTitle>
            <CardDescription>
              Create the perfect study atmosphere - sounds continue playing across all tabs
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
                onCheckedChange={handleEnabledChange}
              />
            </div>
            
            {playingSounds.length > 0 && (
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
            onValueChange={handleVolumeChange}
            max={100}
            step={5}
            className="w-full"
            disabled={!isEnabled}
          />
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
                    animationDelay: `${index * 50}ms`
                  }}
                />
              ))}
            </div>
            <div className="text-center mt-2">
              <Badge variant="secondary" className="text-xs">
                {playingSounds.length} sound{playingSounds.length !== 1 ? 's' : ''} playing
              </Badge>
            </div>
          </div>
        )}

        {/* Sound Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {sounds.map((sound) => {
            const isPlaying = playingStates.find(s => s.id === sound.id)?.isPlaying || false;
            const Icon = sound.icon;
            
            return (
              <div
                key={sound.id}
                className={cn(
                  "relative group cursor-pointer transition-all duration-200 hover:scale-105",
                  "p-4 rounded-lg border-2",
                  `bg-gradient-to-br ${sound.gradient}`,
                  isPlaying && isEnabled
                    ? "border-primary ring-2 ring-primary/20 animate-glow-pulse"
                    : "border-transparent hover:border-primary/50",
                  !isEnabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => isEnabled && toggleSound(sound.id)}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={cn(
                    "p-3 rounded-full transition-all duration-200",
                    isPlaying && isEnabled
                      ? "bg-primary/20 scale-110"
                      : "bg-background/50 group-hover:bg-primary/10"
                  )}>
                    <Icon className={cn(
                      "h-6 w-6 transition-colors duration-200",
                      isPlaying && isEnabled ? "text-primary" : sound.color
                    )} />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm">{sound.name}</h3>
                    
                    {isPlaying && isEnabled ? (
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
                {isPlaying && isEnabled && (
                  <div className="absolute top-2 right-2">
                    <div className="h-2 w-2 bg-primary rounded-full animate-bounce-gentle" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Currently Playing */}
        {playingSounds.length > 0 && isEnabled && (
          <div className="space-y-3 pt-4 border-t animate-fade-in">
            <h4 className="font-medium text-sm text-muted-foreground">Currently Playing</h4>
            <div className="flex flex-wrap gap-2">
              {playingSounds.map((sound) => {
                const Icon = sound.icon;
                return (
                  <Badge
                    key={sound.id}
                    variant="secondary"
                    className="bg-primary/10 text-primary border border-primary/20"
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {sound.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Tips */}
        {playingSounds.length === 0 && isEnabled && (
          <div className="text-center p-6 text-muted-foreground">
            <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Select ambient sounds to create your perfect study environment
            </p>
            <p className="text-xs mt-2 text-muted-foreground/70">
              Sounds will continue playing when you navigate to other tabs
            </p>
          </div>
        )}

        {/* Background Play Notice */}
        {playingSounds.length > 0 && (
          <div className="text-center text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
            <Music className="h-3 w-3 inline mr-1" />
            Sounds are playing in the background and will continue across all tabs
          </div>
        )}
      </CardContent>
    </Card>
  );
};