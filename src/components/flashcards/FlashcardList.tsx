import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, MoreVertical, Edit, Trash2, Brain, Clock, Eye } from 'lucide-react';
import { format } from 'date-fns';
import type { Flashcard } from '@/hooks/useFlashcards';

interface FlashcardListProps {
  flashcards: Flashcard[];
  onEdit: (flashcard: Flashcard) => void;
  onDelete: (flashcardId: string) => void;
  onStudy: (flashcards: Flashcard[]) => void;
  loading?: boolean;
}

export const FlashcardList = ({ flashcards, onEdit, onDelete, onStudy, loading }: FlashcardListProps) => {
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1: return 'secondary';
      case 2: return 'default';
      case 3: return 'destructive';
      default: return 'default';
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



  const filteredFlashcards = flashcards.filter(card => {
    const matchesSearch = card.front_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         card.back_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (card.subject && card.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSubject = subjectFilter === 'all' || card.subject === subjectFilter;
    const matchesDifficulty = difficultyFilter === 'all' || card.difficulty.toString() === difficultyFilter;
    
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  // Note: next_review field might not exist in simplified table, so we'll skip this for now
  const dueCards = filteredFlashcards;
  const subjects = [...new Set(flashcards.map(card => card.subject).filter(Boolean))];

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2 mb-4" />
              <div className="flex gap-2">
                <div className="h-6 bg-muted rounded w-16" />
                <div className="h-6 bg-muted rounded w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header with Study Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Flashcards</h2>
            <p className="text-muted-foreground">
              {dueCards.length} cards due for review
            </p>
          </div>
          {dueCards.length > 0 && (
            <Button onClick={() => onStudy(dueCards)} variant="gradient">
              <Brain className="h-4 w-4 mr-2" />
              Study Due Cards ({dueCards.length})
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search flashcards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject} value={subject!}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="1">Easy</SelectItem>
              <SelectItem value="2">Medium</SelectItem>
              <SelectItem value="3">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Flashcard Grid */}
        {filteredFlashcards.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Brain className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">No flashcards found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm || subjectFilter !== 'all' || difficultyFilter !== 'all' 
                      ? 'Try adjusting your filters'
                      : 'Create your first flashcard to start studying'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFlashcards.map((card) => (
              <Card key={card.id} className="study-flow-shadow-soft hover:shadow-md transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {card.subject && (
                          <Badge variant="outline" className="text-xs">
                            {card.subject}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-sm line-clamp-2">
                        {card.front_text}
                      </CardTitle>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(card)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStudy([card])}>
                          <Eye className="h-4 w-4 mr-2" />
                          Study
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteCardId(card.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {card.back_text}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <Badge variant={getDifficultyColor(card.difficulty)} className="text-xs">
                          {getDifficultyLabel(card.difficulty)}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground">
                        ID: {card.id.slice(-6)}
                      </span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Created: {format(new Date(card.created_at), 'MMM d, HH:mm')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteCardId} onOpenChange={() => setDeleteCardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flashcard</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this flashcard? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteCardId) {
                  onDelete(deleteCardId);
                  setDeleteCardId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};