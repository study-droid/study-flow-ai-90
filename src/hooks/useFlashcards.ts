import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/types/errors';
import { log } from '@/lib/config';

export interface Flashcard {
  id: string;
  user_id: string;
  front_text: string;
  back_text: string;
  subject: string | null;
  difficulty: number;
  deck_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlashcardFormData {
  front_text: string;
  back_text: string;
  subject?: string;
  difficulty?: number;
  deck_id?: string | null;
}

export const useFlashcards = () => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchFlashcards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Handle table not exists error
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          log.warn('Flashcards table does not exist. Please run the database migration.');
          setFlashcards([]);
          return;
        }
        // Handle schema cache error
        if (error.message?.includes('schema cache')) {
          log.warn('Schema cache issue. Flashcards table may be updating.');
          setFlashcards([]);
          return;
        }
        throw error;
      }
      setFlashcards(data || []);
    } catch (error) {
      log.error('Error fetching flashcards:', error);
      toast({
        title: 'Error loading flashcards',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createFlashcard = async (data: FlashcardFormData) => {
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      // Debug: Log the raw input data
      log.debug('Raw form data received:', data);
      log.debug('Current user:', { id: user.id, email: user.email });

      // Ensure all required fields are provided
      if (!data.front_text || !data.front_text.trim()) {
        log.error('Front text validation failed:', data.front_text);
        throw new Error('Front text is required');
      }
      if (!data.back_text || !data.back_text.trim()) {
        log.error('Back text validation failed:', data.back_text);
        throw new Error('Back text is required');
      }

      const flashcardData = {
        user_id: user.id,
        front_text: data.front_text.trim(),
        back_text: data.back_text.trim(),
        subject: data.subject?.trim() || null,
        difficulty: data.difficulty || 2,
        deck_id: data.deck_id || null,
      };

      log.debug('Final flashcard data to insert:', flashcardData);
      log.debug('Data validation:', {
        hasUserId: !!flashcardData.user_id,
        hasFrontText: !!flashcardData.front_text,
        hasBackText: !!flashcardData.back_text,
        frontTextLength: flashcardData.front_text?.length,
        backTextLength: flashcardData.back_text?.length
      });

      const { data: newFlashcard, error } = await supabase
        .from('flashcards')
        .insert([flashcardData])
        .select()
        .single();

      // If the full insert fails, try a minimal insert as fallback
      if (error) {
        log.warn('Full insert failed, trying minimal insert:', error);
        
        const minimalData = {
          user_id: user.id,
          front_text: data.front_text.trim(),
          back_text: data.back_text.trim(),
        };
        
        log.debug('Attempting minimal insert with:', minimalData);
        
        const { data: minimalFlashcard, error: minimalError } = await supabase
          .from('flashcards')
          .insert([minimalData])
          .select()
          .single();
          
        if (minimalError) {
          log.error('Even minimal insert failed:', minimalError);
          throw error; // Throw the original error for debugging
        } else {
          log.debug('Minimal insert succeeded:', minimalFlashcard);
          setFlashcards(prev => [minimalFlashcard, ...prev]);
          toast({
            title: 'Success',
            description: 'Flashcard created successfully (minimal data)',
          });
          return { success: true };
        }
      }

      if (error) {
        log.error('Flashcard creation error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: error
        });
        
        if (error.message?.includes('schema cache')) {
          throw new Error('Database schema is updating. Please run the flashcard fix script in Supabase SQL Editor.');
        }
        if (error.message?.includes('back_text')) {
          throw new Error('Flashcard table schema issue. Please run URGENT_FLASHCARD_FIX.sql in Supabase dashboard.');
        }
        if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
          throw new Error('Flashcards table not found. Please run the database migration in Supabase SQL Editor.');
        }
        if (error.code === 'PGRST116') {
          throw new Error('Database connection issue. Please check Supabase project status.');
        }
        if (error.message?.includes('deck_id') && error.message?.includes('not-null')) {
          throw new Error('Database schema issue with deck_id. Please run SIMPLE_DECK_FIX.sql in Supabase SQL Editor.');
        }
        if (error.code === '23502') {
          const missingField = error.message?.match(/column "([^"]+)"/)?.[1] || 'unknown field';
          throw new Error(`Missing required field: ${missingField}. Please run QUICK_CONSTRAINT_FIX.sql in Supabase SQL Editor.`);
        }
        throw error;
      }

      setFlashcards(prev => [newFlashcard, ...prev]);
      toast({
        title: 'Success',
        description: 'Flashcard created successfully',
      });

      return { success: true };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast({
        title: 'Error creating flashcard',
        description: errorMessage,
        variant: 'destructive',
      });
      return { error: errorMessage };
    } finally {
      setSubmitting(false);
    }
  };

  const updateFlashcard = async (id: string, data: Partial<FlashcardFormData>) => {
    try {
      setSubmitting(true);
      const { data: updatedFlashcard, error } = await supabase
        .from('flashcards')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setFlashcards(prev => prev.map(card => 
        card.id === id ? { ...card, ...updatedFlashcard } : card
      ));

      toast({
        title: 'Success',
        description: 'Flashcard updated successfully',
      });

      return { success: true };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      toast({
        title: 'Error updating flashcard',
        description: errorMessage,
        variant: 'destructive',
      });
      return { error: errorMessage };
    } finally {
      setSubmitting(false);
    }
  };

  const deleteFlashcard = async (id: string) => {
    try {
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFlashcards(prev => prev.filter(card => card.id !== id));
      toast({
        title: 'Success',
        description: 'Flashcard deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error deleting flashcard',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  // Simple review function that only updates difficulty
  const reviewFlashcard = async (id: string, isCorrect: boolean) => {
    try {
      const card = flashcards.find(c => c.id === id);
      if (!card) return;

      let newDifficulty = card.difficulty;

      if (isCorrect) {
        // Decrease difficulty if answered correctly
        if (newDifficulty > 1) {
          newDifficulty -= 1;
        }
      } else {
        // Increase difficulty if answered incorrectly
        if (newDifficulty < 3) {
          newDifficulty += 1;
        }
      }

      const { error } = await supabase
        .from('flashcards')
        .update({ difficulty: newDifficulty })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setFlashcards(prev => prev.map(c => 
        c.id === id ? { ...c, difficulty: newDifficulty } : c
      ));

    } catch (error) {
      toast({
        title: 'Error updating review',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    }
  };

  const getDueFlashcards = () => {
    // Since we don't have next_review field, return all flashcards
    return flashcards;
  };

  const getFlashcardsBySubject = (subject: string) => {
    return flashcards.filter(card => card.subject === subject);
  };

  useEffect(() => {
    fetchFlashcards();
  }, []);

  return {
    flashcards,
    loading,
    submitting,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
    reviewFlashcard,
    getDueFlashcards,
    getFlashcardsBySubject,
    refetch: fetchFlashcards,
  };
};