import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  HelpCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface PracticeQuestion {
  id: string;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  is_correct?: boolean;
  created_at: string;
}

export const PracticeHistory: React.FC = () => {
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to view your practice questions',
          variant: 'destructive'
        });
        return;
      }

      const { data, error } = await supabase
        .from('ai_tutor_practice_questions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading practice questions:', error);
        
        // Check if table doesn't exist
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          toast({
            title: 'Setup Required',
            description: 'Practice questions feature is being set up. Please try again in a moment.',
            variant: 'destructive'
          });
          setQuestions([]);
        } else {
          toast({
            title: 'Error Loading Practice Questions',
            description: error.message || 'Failed to load practice questions. Please try again.',
            variant: 'destructive'
          });
        }
        return;
      }

      setQuestions(data || []);
    } catch (error: any) {
      console.error('Error loading practice questions:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load practice questions',
        variant: 'destructive'
      });
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStats = () => {
    const total = questions.length;
    const answered = questions.filter(q => q.is_correct !== null).length;
    const correct = questions.filter(q => q.is_correct === true).length;
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

    return { total, answered, correct, accuracy };
  };

  const stats = getStats();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Practice History
        </CardTitle>
        <CardDescription>
          Your practice question performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Questions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.answered}</p>
            <p className="text-xs text-muted-foreground">Answered</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.correct}</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.accuracy}%</p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </div>
        </div>

        <Progress value={stats.accuracy} className="mb-6" />

        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {questions.map(question => (
              <Card key={question.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{question.subject}</Badge>
                        <Badge variant="secondary">{question.topic}</Badge>
                        <Badge 
                          variant={
                            question.difficulty === 'easy' ? 'default' :
                            question.difficulty === 'medium' ? 'secondary' :
                            'destructive'
                          }
                        >
                          {question.difficulty}
                        </Badge>
                      </div>
                      <p className="text-sm line-clamp-2">{question.question_text}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {question.is_correct !== null && (
                      question.is_correct ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};