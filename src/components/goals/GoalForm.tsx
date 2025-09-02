import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Target } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useStudyGoals, StudyGoalFormData } from '@/hooks/useStudyGoals';

interface GoalFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  noCard?: boolean;
}

export const GoalForm = ({ onSuccess, onCancel, noCard = false }: GoalFormProps) => {
  const { createGoal, submitting } = useStudyGoals();
  const [formData, setFormData] = useState<StudyGoalFormData>({
    title: '',
    description: '',
    target_value: 1,
    unit: 'hours',
    deadline: '',
  });
  const [deadline, setDeadline] = useState<Date>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deadline) {
      return;
    }

    const result = await createGoal({
      ...formData,
      deadline: deadline.toISOString(),
    });

    if (result.success) {
      setFormData({
        title: '',
        description: '',
        target_value: 1,
        unit: 'hours',
        deadline: '',
      });
      setDeadline(undefined);
      onSuccess?.();
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Goal Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Complete Math Course"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details about your goal..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target_value">Target Value</Label>
              <Input
                id="target_value"
                type="number"
                min="1"
                value={formData.target_value}
                onChange={(e) => setFormData(prev => ({ ...prev, target_value: parseInt(e.target.value) }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="unit">Unit</Label>
              <Select 
                value={formData.unit} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="sessions">Sessions</SelectItem>
                  <SelectItem value="chapters">Chapters</SelectItem>
                  <SelectItem value="pages">Pages</SelectItem>
                  <SelectItem value="exercises">Exercises</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Deadline</Label>
            <Popover modal={true}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !deadline && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, "PPP") : "Pick a deadline"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={submitting || !formData.title || !deadline}
              className="flex-1"
            >
              {submitting ? 'Creating...' : 'Create Goal'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
    </form>
  );

  if (noCard) {
    return formContent;
  }

  return (
    <Card className="study-flow-shadow-soft">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Create Study Goal</CardTitle>
            <CardDescription>Set a new goal to track your progress</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
};