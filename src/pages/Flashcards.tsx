import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FlashcardForm } from '@/components/flashcards/FlashcardForm';
import { FlashcardList } from '@/components/flashcards/FlashcardList';
import { FlashcardStudy } from '@/components/flashcards/FlashcardStudy';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useFlashcards, type Flashcard } from '@/hooks/useFlashcards';

type View = 'list' | 'form' | 'study';

const Flashcards = () => {
  const [currentView, setCurrentView] = useState<View>('list');
  const [editingFlashcard, setEditingFlashcard] = useState<Flashcard | null>(null);
  const [studyCards, setStudyCards] = useState<Flashcard[]>([]);
  
  const {
    flashcards,
    loading,
    submitting,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
    reviewFlashcard,
  } = useFlashcards();

  const handleCreate = () => {
    setEditingFlashcard(null);
    setCurrentView('form');
  };

  const handleEdit = (flashcard: Flashcard) => {
    setEditingFlashcard(flashcard);
    setCurrentView('form');
  };

  const handleStudy = (cards: Flashcard[]) => {
    setStudyCards(cards);
    setCurrentView('study');
  };

  const handleFormSubmit = async (data: any) => {
    if (editingFlashcard) {
      const result = await updateFlashcard(editingFlashcard.id, data);
      if (result.success) {
        setCurrentView('list');
        setEditingFlashcard(null);
      }
    } else {
      const result = await createFlashcard(data);
      if (result.success) {
        setCurrentView('list');
      }
    }
  };

  const handleFormCancel = () => {
    setCurrentView('list');
    setEditingFlashcard(null);
  };

  const handleStudyComplete = () => {
    setCurrentView('list');
    setStudyCards([]);
  };

  const renderHeader = () => {
    switch (currentView) {
      case 'form':
        return null; // Form has its own header
      case 'study':
        return null; // Study has its own header
      default:
        return (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Flashcards</h1>
              <p className="text-muted-foreground">
                Create and study flashcards with spaced repetition
              </p>
            </div>
            <Button onClick={handleCreate} variant="gradient">
              <Plus className="h-4 w-4 mr-2" />
              Create Flashcard
            </Button>
          </div>
        );
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'form':
        return (
          <FlashcardForm
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            initialData={editingFlashcard || undefined}
            isLoading={submitting}
          />
        );
      case 'study':
        return (
          <FlashcardStudy
            flashcards={studyCards}
            onReview={reviewFlashcard}
            onFinish={handleStudyComplete}
          />
        );
      default:
        return (
          <FlashcardList
            flashcards={flashcards}
            onEdit={handleEdit}
            onDelete={deleteFlashcard}
            onStudy={handleStudy}
            loading={loading}
          />
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {renderHeader()}
        {renderContent()}
      </div>
    </DashboardLayout>
  );
};

export default Flashcards;