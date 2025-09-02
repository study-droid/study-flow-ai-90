import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Target,
  Trophy,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Edit2,
  Trash2,
  Star,
  Flag,
  Clock,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGoals } from '@/hooks/useGoals';
import { format } from 'date-fns';

interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'academic' | 'personal' | 'career' | 'health' | 'skill';
  priority: 'low' | 'medium' | 'high';
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  deadline?: Date;
  milestones: Milestone[];
  createdAt: Date;
  updatedAt: Date;
}

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: Date;
}

export const GoalsSection: React.FC = () => {
  const { goals, createGoal, updateGoal, deleteGoal } = useGoals();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'academic': return '📚';
      case 'personal': return '🌟';
      case 'career': return '💼';
      case 'health': return '💪';
      case 'skill': return '🎯';
      default: return '🎯';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'academic': return 'bg-blue-500';
      case 'personal': return 'bg-purple-500';
      case 'career': return 'bg-green-500';
      case 'health': return 'bg-red-500';
      case 'skill': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const filteredGoals = selectedCategory === 'all' 
    ? goals 
    : goals.filter(g => g.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Goals & Achievements
          </h2>
          <p className="text-muted-foreground">Track your progress and achieve your dreams</p>
        </div>
        <Button
          onClick={() => setIsCreating(!isCreating)}
          className="bg-gradient-to-r from-primary to-primary-glow"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Goal
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="study-flow-shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Goals</p>
                <p className="text-2xl font-bold">{goals.length}</p>
              </div>
              <Target className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="study-flow-shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">
                  {goals.filter(g => g.status === 'in_progress').length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="study-flow-shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">
                  {goals.filter(g => g.status === 'completed').length}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="study-flow-shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">
                  {goals.length > 0 
                    ? Math.round((goals.filter(g => g.status === 'completed').length / goals.length) * 100)
                    : 0}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'academic', 'personal', 'career', 'health', 'skill'].map(category => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="capitalize"
          >
            {category !== 'all' && getCategoryIcon(category)} {category}
          </Button>
        ))}
      </div>

      {/* Goals Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Goals</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-6">
          {filteredGoals
            .filter(g => g.status === 'in_progress')
            .map(goal => (
              <GoalCard key={goal.id} goal={goal} onUpdate={updateGoal} onDelete={deleteGoal} />
            ))}
          {filteredGoals.filter(g => g.status === 'in_progress').length === 0 && (
            <Card className="p-8 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active goals. Create one to get started!</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4 mt-6">
          {filteredGoals
            .filter(g => g.status === 'not_started')
            .map(goal => (
              <GoalCard key={goal.id} goal={goal} onUpdate={updateGoal} onDelete={deleteGoal} />
            ))}
          {filteredGoals.filter(g => g.status === 'not_started').length === 0 && (
            <Card className="p-8 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No upcoming goals</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-6">
          {filteredGoals
            .filter(g => g.status === 'completed')
            .map(goal => (
              <GoalCard key={goal.id} goal={goal} onUpdate={updateGoal} onDelete={deleteGoal} />
            ))}
          {filteredGoals.filter(g => g.status === 'completed').length === 0 && (
            <Card className="p-8 text-center">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No completed goals yet</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Goal Form */}
      {isCreating && (
        <Card className="study-flow-shadow-medium">
          <CardHeader>
            <CardTitle>Create New Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateGoalForm onSubmit={createGoal} onCancel={() => setIsCreating(false)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Goal Card Component
const GoalCard: React.FC<{
  goal: Goal;
  onUpdate: (goal: Goal) => void;
  onDelete: (id: string) => void;
}> = ({ goal, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Card className="study-flow-shadow-soft hover:study-flow-shadow-medium transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center text-white",
              getCategoryColor(goal.category)
            )}>
              <span className="text-lg">{getCategoryIcon(goal.category)}</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{goal.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Flag className={cn("h-4 w-4", getPriorityColor(goal.priority))} />
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(goal.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">{goal.progress}%</span>
          </div>
          <Progress value={goal.progress} className="h-2" />
        </div>

        {/* Deadline */}
        {goal.deadline && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Calendar className="h-4 w-4" />
            <span>Deadline: {format(goal.deadline, 'MMM dd, yyyy')}</span>
          </div>
        )}

        {/* Milestones */}
        {goal.milestones.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Milestones</p>
            {goal.milestones.slice(0, 3).map(milestone => (
              <div key={milestone.id} className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const updatedMilestones = goal.milestones.map(m =>
                      m.id === milestone.id ? { ...m, completed: !m.completed } : m
                    );
                    const completedCount = updatedMilestones.filter(m => m.completed).length;
                    const progress = Math.round((completedCount / updatedMilestones.length) * 100);
                    onUpdate({ ...goal, milestones: updatedMilestones, progress });
                  }}
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  {milestone.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                  <span className={milestone.completed ? 'line-through text-muted-foreground' : ''}>
                    {milestone.title}
                  </span>
                </button>
              </div>
            ))}
            {goal.milestones.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{goal.milestones.length - 3} more milestones
              </p>
            )}
          </div>
        )}

        {/* Status Badge */}
        <div className="flex items-center justify-between mt-4">
          <Badge variant={
            goal.status === 'completed' ? 'default' :
            goal.status === 'in_progress' ? 'secondary' : 'outline'
          }>
            {goal.status.replace('_', ' ')}
          </Badge>
          <Button variant="ghost" size="sm">
            View Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Create Goal Form Component
const CreateGoalForm: React.FC<{
  onSubmit: (goal: Partial<Goal>) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Goal>>({
    title: '',
    description: '',
    category: 'academic',
    priority: 'medium',
    status: 'not_started',
    progress: 0,
    milestones: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Goal Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter your goal..."
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe your goal..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value as Goal['category'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="academic">Academic</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="career">Career</SelectItem>
              <SelectItem value="health">Health</SelectItem>
              <SelectItem value="skill">Skill</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => setFormData({ ...formData, priority: value as Goal['priority'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="deadline">Deadline (Optional)</Label>
        <Input
          id="deadline"
          type="date"
          onChange={(e) => setFormData({ ...formData, deadline: new Date(e.target.value) })}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Goal
        </Button>
      </div>
    </form>
  );
};

function getCategoryColor(category: string): string {
  switch (category) {
    case 'academic': return 'bg-blue-500';
    case 'personal': return 'bg-purple-500';
    case 'career': return 'bg-green-500';
    case 'health': return 'bg-red-500';
    case 'skill': return 'bg-yellow-500';
    default: return 'bg-gray-500';
  }
}

function getCategoryIcon(category: string): string {
  switch (category) {
    case 'academic': return '📚';
    case 'personal': return '🌟';
    case 'career': return '💼';
    case 'health': return '💪';
    case 'skill': return '🎯';
    default: return '🎯';
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'text-red-500';
    case 'medium': return 'text-yellow-500';
    case 'low': return 'text-green-500';
    default: return 'text-gray-500';
  }
}