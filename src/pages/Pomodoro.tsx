import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Play, Pause, Square, Settings, Volume2, VolumeX, Coffee, Clock } from "lucide-react";

const Pomodoro = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedSound, setSelectedSound] = useState("forest");

  const sounds = [
    { id: "forest", name: "Forest Ambience", icon: "🌲" },
    { id: "rain", name: "Rain Sounds", icon: "🌧️" },
    { id: "coffee", name: "Coffee Shop", icon: "☕" },
    { id: "ocean", name: "Ocean Waves", icon: "🌊" },
    { id: "fire", name: "Fireplace", icon: "🔥" },
    { id: "wind", name: "Mountain Wind", icon: "🏔️" },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Timer finished
      setIsActive(false);
      if (!isBreak) {
        setSessionsCompleted(prev => prev + 1);
        setIsBreak(true);
        setTimeLeft(breakDuration * 60);
      } else {
        setIsBreak(false);
        setTimeLeft(workDuration * 60);
      }
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, isBreak, workDuration, breakDuration]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsActive(true);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(workDuration * 60);
  };

  const handleWorkDurationChange = (value: number[]) => {
    setWorkDuration(value[0]);
    if (!isActive && !isBreak) {
      setTimeLeft(value[0] * 60);
    }
  };

  const handleBreakDurationChange = (value: number[]) => {
    setBreakDuration(value[0]);
    if (!isActive && isBreak) {
      setTimeLeft(value[0] * 60);
    }
  };

  const getProgressPercentage = () => {
    const totalTime = isBreak ? breakDuration * 60 : workDuration * 60;
    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Pomodoro Timer 🍅</h1>
          <p className="text-muted-foreground">Focus with Teddy's structured study sessions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timer */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                {isBreak ? <Coffee className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                {isBreak ? "Break Time!" : "Focus Time"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-8">
              <div className="relative">
                <div className="text-8xl font-mono font-bold text-primary mb-4">
                  {formatTime(timeLeft)}
                </div>
                <div className="w-full bg-secondary rounded-full h-3 mb-6">
                  <div 
                    className="bg-primary h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
                {isBreak ? (
                  <Badge variant="secondary" className="text-lg py-2 px-4">
                    🧸 Take a break! Stretch, hydrate, or just relax
                  </Badge>
                ) : (
                  <Badge className="text-lg py-2 px-4">
                    🧸 Focus time! You've got this!
                  </Badge>
                )}
              </div>
              
              <div className="flex justify-center gap-4">
                {!isActive ? (
                  <Button size="lg" onClick={handleStart} className="gap-2">
                    <Play className="h-5 w-5" />
                    Start
                  </Button>
                ) : (
                  <Button size="lg" variant="secondary" onClick={handlePause} className="gap-2">
                    <Pause className="h-5 w-5" />
                    Pause
                  </Button>
                )}
                <Button size="lg" variant="outline" onClick={handleReset} className="gap-2">
                  <Square className="h-5 w-5" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Controls and Stats */}
          <div className="space-y-6">
            {/* Session Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5" />
                  Today's Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{sessionsCompleted}</div>
                  <p className="text-sm text-muted-foreground">Sessions Completed</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Daily Goal</span>
                    <span>{sessionsCompleted}/8</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${Math.min((sessionsCompleted / 8) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timer Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timer Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Work Duration: {workDuration} minutes
                  </label>
                  <Slider
                    value={[workDuration]}
                    onValueChange={handleWorkDurationChange}
                    max={60}
                    min={5}
                    step={5}
                    disabled={isActive}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Break Duration: {breakDuration} minutes
                  </label>
                  <Slider
                    value={[breakDuration]}
                    onValueChange={handleBreakDurationChange}
                    max={30}
                    min={1}
                    step={1}
                    disabled={isActive}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Ambient Sounds */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  Ambient Sounds
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {sounds.map((sound) => (
                    <Button
                      key={sound.id}
                      variant={selectedSound === sound.id ? "default" : "outline"}
                      size="sm"
                      className="h-auto p-2 flex flex-col gap-1"
                      onClick={() => setSelectedSound(sound.id)}
                    >
                      <span className="text-lg">{sound.icon}</span>
                      <span className="text-xs">{sound.name}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Break Suggestions */}
        {isBreak && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coffee className="h-5 w-5" />
                Break Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">🧘</div>
                  <h3 className="font-medium">Stretch & Breathe</h3>
                  <p className="text-sm text-muted-foreground">Take deep breaths and stretch your body</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">💧</div>
                  <h3 className="font-medium">Hydrate</h3>
                  <p className="text-sm text-muted-foreground">Drink some water to stay refreshed</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">👀</div>
                  <h3 className="font-medium">Rest Your Eyes</h3>
                  <p className="text-sm text-muted-foreground">Look away from the screen and blink</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Pomodoro;