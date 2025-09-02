import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, BookOpen, TrendingUp, MoreHorizontal } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { useStudySessions } from '@/hooks/useStudySessions';

export const StudyStatistics = () => {
  const { 
    sessions, 
    loading, 
    getTodaysSessions, 
    getWeekSessions, 
    getTotalStudyTime, 
    getSessionsBySubject,
    getStudyStreak 
  } = useStudySessions();

  const todaysSessions = getTodaysSessions();
  const weekSessions = getWeekSessions();
  const todayTotal = getTotalStudyTime(todaysSessions);
  const weekTotal = getTotalStudyTime(weekSessions);
  const studyStreak = getStudyStreak();
  const subjectStats = getSessionsBySubject(weekSessions);

  // Weekly activity chart data
  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const weeklyActivity = weekDays.map(day => {
    const daySessions = sessions.filter(session => 
      isSameDay(new Date(session.completed_at), day)
    );
    return {
      day: format(day, 'EEE'),
      duration: getTotalStudyTime(daySessions),
      sessions: daySessions.length,
    };
  });

  const maxDayDuration = Math.max(...weeklyActivity.map(d => d.duration), 1);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-8 bg-muted rounded w-1/2 mb-4" />
              <div className="h-2 bg-muted rounded w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="study-flow-shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Study Time</p>
                <p className="text-2xl font-bold text-primary">
                  {Math.round(todayTotal / 60)}h {todayTotal % 60}m
                </p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="study-flow-shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sessions Today</p>
                <p className="text-2xl font-bold text-focus">{todaysSessions.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-focus" />
            </div>
          </CardContent>
        </Card>

        <Card className="study-flow-shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Study Streak</p>
                <p className="text-2xl font-bold text-achievement">{studyStreak} days</p>
              </div>
              <TrendingUp className="h-8 w-8 text-achievement" />
            </div>
          </CardContent>
        </Card>

        <Card className="study-flow-shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Weekly Total</p>
                <p className="text-2xl font-bold text-progress">
                  {Math.round(weekTotal / 60)}h {weekTotal % 60}m
                </p>
              </div>
              <Calendar className="h-8 w-8 text-progress" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Activity Chart */}
        <Card className="study-flow-shadow-soft">
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
            <CardDescription>Your study time over the past 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weeklyActivity.map((day, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{day.day}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {day.sessions} sessions
                      </span>
                      <span className="font-mono">
                        {Math.floor(day.duration / 60)}:{(day.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={(day.duration / maxDayDuration) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
            
            {weekTotal === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No study sessions this week</p>
                <p className="text-sm">Start a focus session to see your progress!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subject Breakdown */}
        <Card className="study-flow-shadow-soft">
          <CardHeader>
            <CardTitle>Subject Breakdown</CardTitle>
            <CardDescription>Time spent on different subjects this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subjectStats.length > 0 ? (
                subjectStats
                  .sort((a, b) => b.duration - a.duration)
                  .slice(0, 5)
                  .map((subject, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full bg-primary`} 
                               style={{ opacity: 1 - (index * 0.15) }} />
                          <span className="font-medium">{subject.subject}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{subject.count} sessions</span>
                          <span className="font-mono">
                            {Math.floor(subject.duration / 60)}h {subject.duration % 60}m
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={(subject.duration / weekTotal) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No subject data available</p>
                  <p className="text-sm">Complete study sessions to see subject breakdown</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card className="study-flow-shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Your latest study activities</CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {session.subject || 'Study Session'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(session.completed_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-1">
                      {session.session_type}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {session.duration_minutes} min
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No study sessions yet</p>
              <p className="text-sm">Start your first focus session to track your progress!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};