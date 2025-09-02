import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Music,
  Volume2,
  VolumeX,
  X,
  ChevronUp,
  ChevronDown,
  Square
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ambientAudioService, type PlayingSound } from '@/services/ambientAudioService';
import { useAuth } from '@/hooks/useAuth';

export const EmbeddedAmbientPlayer: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [playingStates, setPlayingStates] = useState<PlayingSound[]>([]);
  const [volume, setVolume] = useState(ambientAudioService.getMasterVolume() * 100);
  const [isEnabled, setIsEnabled] = useState(ambientAudioService.getEnabled());
  const { user } = useAuth();

  useEffect(() => {
    // Subscribe to audio state changes
    const unsubscribe = ambientAudioService.subscribe((states) => {
      setPlayingStates(states);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Stop all sounds when user logs out
    if (!user) {
      ambientAudioService.stopAllSounds();
    }
  }, [user]);

  const playingSounds = playingStates.filter(s => s.isPlaying);
  const hasPlayingSounds = playingSounds.length > 0;

  // Don't render if no sounds are playing or user is not authenticated
  if (!hasPlayingSounds || !user) {
    return null;
  }

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume[0]);
    ambientAudioService.setMasterVolume(newVolume[0] / 100);
  };

  const handleStopAll = () => {
    ambientAudioService.stopAllSounds();
  };

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-40 transition-all duration-300",
      "bg-background/95 backdrop-blur-lg border rounded-lg shadow-2xl",
      isExpanded ? "w-80" : "w-64"
    )}>
      {/* Header Bar */}
      <div 
        className="flex items-center justify-between p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Music className="h-4 w-4 text-primary" />
            {hasPlayingSounds && (
              <div className="absolute -top-1 -right-1">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              </div>
            )}
          </div>
          <span className="text-sm font-medium">Ambient Player</span>
          <Badge variant="secondary" className="text-xs">
            {playingSounds.length}
          </Badge>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </Button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 space-y-3 animate-fade-in">
          {/* Playing Sounds List */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Now Playing
            </div>
            <div className="space-y-1">
              {playingSounds.map((sound) => {
                const Icon = sound.icon;
                return (
                  <div
                    key={sound.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                  >
                    <Icon className="h-3 w-3 text-primary" />
                    <span className="text-sm flex-1">{sound.name}</span>
                    <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {volume === 0 ? (
                  <VolumeX className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Volume2 className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">Volume</span>
              </div>
              <span className="text-xs text-muted-foreground">{Math.round(volume)}%</span>
            </div>
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Stop All Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleStopAll}
            className="w-full text-xs"
          >
            <Square className="h-3 w-3 mr-2" />
            Stop All Sounds
          </Button>
        </div>
      )}

      {/* Minimized View */}
      {!isExpanded && (
        <div className="px-3 pb-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex flex-wrap gap-1">
                {playingSounds.slice(0, 3).map((sound) => {
                  const Icon = sound.icon;
                  return (
                    <Badge
                      key={sound.id}
                      variant="secondary"
                      className="text-xs bg-primary/10 text-primary border-0"
                    >
                      <Icon className="h-2.5 w-2.5 mr-1" />
                      {sound.name}
                    </Badge>
                  );
                })}
                {playingSounds.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{playingSounds.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Mini Volume Slider */}
          <div className="mt-2 flex items-center gap-2">
            <Volume2 className="h-3 w-3 text-muted-foreground" />
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              max={100}
              step={5}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-8">
              {Math.round(volume)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};