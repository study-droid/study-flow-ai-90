import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Plus, TrendingUp, AlertTriangle } from 'lucide-react';
import { useStudyGoals } from '@/hooks/useStudyGoals';
import { GoalCard } from './GoalCard';

interface GoalsListProps {
  onCreateGoal?: () => void;
}

export const GoalsList = ({ onCreateGoal }: GoalsListProps) => {
  const { goals, loading, getActiveGoals, getCompletedGoals, getOverdueGoals } = useStudyGoals();
  
  const activeGoals = getActiveGoals();
  const completedGoals = getCompletedGoals();
  const overdueGoals = getOverdueGoals();

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-4" />
              <div className="h-2 bg-muted rounded w-full mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const EmptyState = ({ title, description, icon: Icon }: { title: string; description: string; icon: any }) => (
    <div className="text-center py-12">
      <Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      {onCreateGoal && (
        <Button onClick={onCreateGoal}>
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Goal
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="study-flow-shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Goals</p>
                <p className="text-2xl font-bold text-primary">{activeGoals.length}</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="study-flow-shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedGoals.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="study-flow-shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueGoals.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals Lists */}
      <Card className="study-flow-shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Study Goals</CardTitle>
              <CardDescription>Track your learning objectives and progress</CardDescription>
            </div>
            {onCreateGoal && (
              <Button onClick={onCreateGoal}>
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <EmptyState 
              title="No study goals yet"
              description="Create your first goal to start tracking your learning progress"
              icon={Target}
            />
          ) : (
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="active">Active ({activeGoals.length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({completedGoals.length})</TabsTrigger>
                <TabsTrigger value="overdue">Overdue ({overdueGoals.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="active" className="space-y-4 mt-6">
                {activeGoals.length === 0 ? (
                  <EmptyState 
                    title="No active goals"
                    description="All your goals are either completed or paused"
                    icon={Target}
                  />
                ) : (
                  activeGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="completed" className="space-y-4 mt-6">
                {completedGoals.length === 0 ? (
                  <EmptyState 
                    title="No completed goals"
                    description="Complete some goals to see them here"
                    icon={TrendingUp}
                  />
                ) : (
                  completedGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="overdue" className="space-y-4 mt-6">
                {overdueGoals.length === 0 ? (
                  <EmptyState 
                    title="No overdue goals"
                    description="Great! All your goals are on track"
                    icon={TrendingUp}
                  />
                ) : (
                  overdueGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};