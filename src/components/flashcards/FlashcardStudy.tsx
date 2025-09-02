import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, RotateCcw, Brain, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import type { Flashcard } from '@/hooks/useFlashcards';

interface FlashcardStudyProps {
  flashcards: Flashcard[];
  onReview: (cardId: string, isCorrect: boolean) => void;
  onFinish: () => void;
}

const FlashcardStudyComponent = ({ flashcards, onReview, onFinish }: FlashcardStudyProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    total: flashcards.length,
  });

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + (showAnswer ? 0.5 : 0)) / flashcards.length) * 100;

  const handleAnswer = useCallback((isCorrect: boolean) => {
    if (!showAnswer) return;

    onReview(currentCard.id, isCorrect);
    
    setSessionStats(prev => ({
      ...prev,
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
    }));

    // Move to next card or finish
    if (currentIndex + 1 < flashcards.length) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      // Session complete
      setTimeout(onFinish, 1000);
    }
  }, [showAnswer, currentCard.id, onReview, currentIndex, flashcards.length, onFinish]);

  const handleFlipCard = useCallback(() => {
    setShowAnswer(!showAnswer);
  }, [showAnswer]);

  const handleReset = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setSessionStats({
      correct: 0,
      incorrect: 0,
      total: flashcards.length,
    });
  };

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!showAnswer) {
        handleFlipCard();
      }
    } else if (e.code === 'ArrowRight' && showAnswer) {
      handleAnswer(true);
    } else if (e.code === 'ArrowLeft' && showAnswer) {
      handleAnswer(false);
    }
  }, [showAnswer, handleFlipCard, handleAnswer]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'text-progress';
      case 2: return 'text-focus';
      case 3: return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getDifficultyLabel = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'Easy';
      case 2: return 'Medium';
      case 3: return 'Hard';
      default: return 'Unknown';
    }
  };

  // Session complete
  if (currentIndex >= flashcards.length) {
    const accuracy = sessionStats.total > 0 ? (sessionStats.correct / sessionStats.total) * 100 : 0;
    
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="study-flow-shadow-soft text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-progress">
              <CheckCircle className="h-6 w-6" />
              Study Session Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-progress">{sessionStats.correct}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{sessionStats.incorrect}</div>
                <div className="text-sm text-muted-foreground">Incorrect</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{accuracy.toFixed(0)}%</div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button onClick={handleReset} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Study Again
              </Button>
              <Button onClick={onFinish} variant="gradient">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Flashcards
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onFinish}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-4">
            <Badge variant="outline">
              {currentIndex + 1} / {flashcards.length}
            </Badge>
            <Badge variant="outline" className={getDifficultyColor(currentCard.difficulty)}>
              {getDifficultyLabel(currentCard.difficulty)}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Flashcard */}
      <Card className="study-flow-shadow-soft min-h-[400px] cursor-pointer" onClick={handleFlipCard}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              {showAnswer ? 'Answer' : 'Question'}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleFlipCard(); }}>
              {showAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="min-h-[200px] flex items-center justify-center">
              <p className="text-lg leading-relaxed">
                {showAnswer ? currentCard.back_text : currentCard.front_text}
              </p>
            </div>
            
            {currentCard.subject && (
              <Badge variant="outline">
                {currentCard.subject}
              </Badge>
            )}
          </div>

          {!showAnswer ? (
            <div className="text-center">
              <Button onClick={handleFlipCard} variant="outline" size="lg">
                <Eye className="h-4 w-4 mr-2" />
                Show Answer (Space)
              </Button>
            </div>
          ) : (
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={() => handleAnswer(false)} 
                variant="destructive"
                size="lg"
                className="flex-1 max-w-[200px]"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Incorrect (←)
              </Button>
              <Button 
                onClick={() => handleAnswer(true)} 
                variant="default"
                size="lg"
                className="flex-1 max-w-[200px] bg-progress hover:bg-progress/90"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Correct (→)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Session Stats */}
      <Card className="study-flow-shadow-soft">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-semibold text-progress">{sessionStats.correct}</div>
              <div className="text-muted-foreground">Correct</div>
            </div>
            <div>
              <div className="font-semibold text-destructive">{sessionStats.incorrect}</div>
              <div className="text-muted-foreground">Incorrect</div>
            </div>
            <div>
              <div className="font-semibold">{flashcards.length - currentIndex - 1}</div>
              <div className="text-muted-foreground">Remaining</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard shortcuts hint */}
      <div className="text-center text-xs text-muted-foreground">
        Use Space to flip cards, ← for incorrect, → for correct
      </div>
    </div>
  );
};

export const FlashcardStudy = React.memo(FlashcardStudyComponent);