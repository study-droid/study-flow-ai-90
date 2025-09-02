import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import type { FlashcardFormData } from '@/hooks/useFlashcards';
import { useSubjects } from '@/hooks/useSubjects';
import { validateFlashcardForm } from '@/lib/validation/flashcard-schema';
import { useToast } from '@/hooks/use-toast';

interface FlashcardFormProps {
  onSubmit: (data: FlashcardFormData) => Promise<{ success: boolean }>;
  onCancel: () => void;
  initialData?: Partial<FlashcardFormData>;
  isLoading?: boolean;
}

export const FlashcardForm = ({ onSubmit, onCancel, initialData, isLoading }: FlashcardFormProps) => {
  const { subjects } = useSubjects();
  const { toast } = useToast();
  const [formData, setFormData] = useState<FlashcardFormData>({
    front_text: initialData?.front_text || '',
    back_text: initialData?.back_text || '',
    subject: initialData?.subject || '',
    difficulty: initialData?.difficulty || 2, // 1=easy, 2=medium, 3=hard
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate using zod schema
    const validation = validateFlashcardForm(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: "Validation Error",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }
    
    await onSubmit(validation.data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          {initialData ? 'Edit Flashcard' : 'Create New Flashcard'}
        </CardTitle>
        <CardDescription>
          {initialData ? 'Update your flashcard content' : 'Add a new flashcard to your study deck'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="front_text">Front Side (Question) *</Label>
            <Textarea
              id="front_text"
              value={formData.front_text}
              onChange={(e) => setFormData(prev => ({ ...prev, front_text: e.target.value }))}
              placeholder="Enter the question or prompt..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="back_text">Back Side (Answer) *</Label>
            <Textarea
              id="back_text"
              value={formData.back_text}
              onChange={(e) => setFormData(prev => ({ ...prev, back_text: e.target.value }))}
              placeholder="Enter the answer or explanation..."
              rows={3}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select 
                value={formData.subject || ''} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.name}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Initial Difficulty</Label>
              <Select 
                value={formData.difficulty?.toString() || '2'} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Easy</SelectItem>
                  <SelectItem value="2">Medium</SelectItem>
                  <SelectItem value="3">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="gradient" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  {initialData ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                initialData ? 'Update Flashcard' : 'Create Flashcard'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};