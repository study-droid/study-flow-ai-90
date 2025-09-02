import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Clock, Target, TrendingUp, Plus } from "lucide-react";
import { useFlashcards } from "@/hooks/useFlashcards";
import { useNavigate } from "react-router-dom";

export const SpacedRepetition = () => {
  const navigate = useNavigate();
  const { flashcards, loading, getDueFlashcards } = useFlashcards();
  
  const dueCards = getDueFlashcards();
  const stats = {
    totalCards: flashcards.length,
    dueToday: dueCards.length,
    accuracy: flashcards.length > 0 ? Math.round(
      flashcards.reduce((acc, card) => acc + (card.correct_streak > 0 ? 1 : 0), 0) / flashcards.length * 100
    ) : 0,
    streak: Math.max(...flashcards.map(card => card.correct_streak), 0)
  };

  const handleStartReview = () => {
    navigate('/flashcards');
  };

  const handleCreateFlashcard = () => {
    navigate('/flashcards');
  };

  return (
    <Card className="study-flow-shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Spaced Repetition
        </CardTitle>
        <CardDescription>
          Smart flashcard reviews using spaced repetition
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{loading ? '...' : stats.totalCards}</div>
            <div className="text-xs text-muted-foreground">Total Cards</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-focus">{loading ? '...' : stats.dueToday}</div>
            <div className="text-xs text-muted-foreground">Due Today</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Study Streak</span>
            <Badge variant="outline" className="bg-achievement/10 text-achievement">
              {loading ? '...' : stats.streak} days
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Accuracy Rate</span>
              <span>{loading ? '...' : stats.accuracy}%</span>
            </div>
            <Progress value={stats.accuracy} className="h-2" />
          </div>

          {stats.dueToday > 0 ? (
            <Button className="w-full" variant="gradient" onClick={handleStartReview} disabled={loading}>
              <Brain className="h-4 w-4 mr-2" />
              Start Review ({stats.dueToday} cards)
            </Button>
          ) : (
            <Button className="w-full" variant="outline" onClick={handleCreateFlashcard} disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              {stats.totalCards === 0 ? 'Create First Flashcard' : 'All Caught Up!'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};