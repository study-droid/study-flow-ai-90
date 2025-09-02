import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Star, 
  Target, 
  Flame, 
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Zap,
  BookOpen,
  CheckCircle,
  Medal,
  Crown,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAchievements } from '@/hooks/useAchievements';
import { useFocusSessions } from '@/hooks/useFocusSessions';

// Types are now imported from useAchievements hook

export const AchievementSystem: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'completed' | 'in-progress'>('all');
  // Get real data from hooks
  const { achievements = [], streaks = [], totalPoints = 0, level = 1, loading } = useAchievements();
  const { sessions = [] } = useFocusSessions();

  // Track Pomodoro sessions (25-minute sessions)
  const pomodoroCount = sessions.filter(s => s?.duration_minutes === 25).length;

  const filteredAchievements = achievements.filter(achievement => {
    switch (selectedCategory) {
      case 'completed':
        return achievement.completed;
      case 'in-progress':
        return !achievement.completed && achievement.progress > 0;
      default:
        return true;
    }
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50 dark:bg-gray-900/20';
      case 'rare': return 'border-blue-300 bg-blue-50 dark:bg-blue-900/20';
      case 'epic': return 'border-purple-300 bg-purple-50 dark:bg-purple-900/20';
      case 'legendary': return 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
      case 'rare': return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'epic': return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100';
      case 'legendary': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const nextLevelPoints = level * 1000;
  const progressToNextLevel = ((totalPoints % 1000) / 1000) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="study-flow-shadow-soft animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Achievement Progress
          </CardTitle>
          <CardDescription>
            Track your learning milestones and build study habits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Level */}
            <div className="text-center">
              <div className="relative">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-r from-primary to-primary-glow flex items-center justify-center">
                  <Crown className="h-8 w-8 text-white" />
                </div>
                <Badge className="absolute -top-1 -right-1 bg-yellow-500 text-black font-bold">
                  {level}
                </Badge>
              </div>
              <div className="text-sm font-medium">Level {level}</div>
              <div className="text-xs text-muted-foreground">
                {totalPoints % 1000}/{1000} XP
              </div>
              <Progress value={progressToNextLevel} className="mt-2 h-2" />
            </div>

            {/* Total Points */}
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">{totalPoints}</div>
              <div className="text-sm font-medium">Total Points</div>
              <div className="text-xs text-muted-foreground">All achievements</div>
            </div>

            {/* Completed Achievements */}
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {achievements.filter(a => a.completed).length}
              </div>
              <div className="text-sm font-medium">Completed</div>
              <div className="text-xs text-muted-foreground">
                of {achievements.length} achievements
              </div>
            </div>

            {/* Current Streak */}
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500 mb-1">
                {streaks[0]?.current || 0}
              </div>
              <div className="text-sm font-medium">Study Streak</div>
              <div className="text-xs text-muted-foreground">
                Best: {streaks[0]?.best || 0} days
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streaks */}
      <Card className="study-flow-shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Current Streaks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {streaks.map((streak, index) => (
              <div key={index} className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <streak.icon className={cn("h-6 w-6", streak.color)} />
                  <div>
                    <div className="font-medium">{streak.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Current: {streak.current} | Best: {streak.best}
                    </div>
                  </div>
                </div>
                <Progress value={streak.best > 0 ? (streak.current / streak.best) * 100 : 0} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievement Filters */}
      <Card className="study-flow-shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Achievements
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Button>
              <Button
                variant={selectedCategory === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('completed')}
              >
                Completed
              </Button>
              <Button
                variant={selectedCategory === 'in-progress' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('in-progress')}
              >
                In Progress
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map((achievement, index) => (
              <div
                key={achievement.id}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 animate-fade-in",
                  getRarityColor(achievement.rarity),
                  achievement.completed ? "ring-2 ring-green-500" : ""
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        achievement.completed 
                          ? "bg-green-100 dark:bg-green-900/20" 
                          : "bg-muted"
                      )}>
                        <achievement.icon className={cn(
                          "h-6 w-6",
                          achievement.completed ? "text-green-600" : achievement.color
                        )} />
                      </div>
                      <div>
                        <h3 className="font-medium">{achievement.title}</h3>
                        <Badge className={cn("text-xs", getRarityBadgeColor(achievement.rarity))}>
                          {achievement.rarity}
                        </Badge>
                      </div>
                    </div>
                    
                    {achievement.completed && (
                      <div className="flex items-center gap-1">
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-bold text-primary">
                          +{achievement.points}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground">
                    {achievement.description}
                  </p>

                  {/* Progress */}
                  {!achievement.completed && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {achievement.progress}/{achievement.maxProgress}
                        </span>
                      </div>
                      <Progress 
                        value={(achievement.progress / achievement.maxProgress) * 100} 
                        className="h-2"
                      />
                    </div>
                  )}

                  {/* Points */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Reward</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">{achievement.points} XP</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};