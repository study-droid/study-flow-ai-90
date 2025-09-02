import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  code?: string;
  description?: string;
  color: string;
  credits: number;
  instructor?: string;
  room?: string;
  created_at: string;
  updated_at: string;
}

export interface SubjectFormData {
  name: string;
  code?: string;
  description?: string;
  color?: string;
  credits?: number;
  instructor?: string;
  room?: string;
}

export const useSubjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchSubjects();
    } else {
      setSubjects([]);
      setLoading(false);
    }
  }, [user]);

  const fetchSubjects = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error: unknown) {
      toast({
        title: "Error loading subjects",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSubject = async (data: SubjectFormData) => {
    if (!user) return { data: null, error: 'Not authenticated' };

    try {
      setSubmitting(true);
      const { data: newSubject, error } = await supabase
        .from('subjects')
        .insert([
          {
            ...data,
            user_id: user.id,
            color: data.color || '#3B82F6',
            credits: data.credits || 3,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setSubjects(prev => [...prev, newSubject]);
      toast({
        title: "Subject created",
        description: `${newSubject.name} has been added to your subjects.`,
      });

      return { data: newSubject, error: null };
    } catch (error: unknown) {
      toast({
        title: "Error creating subject",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error: error.message };
    } finally {
      setSubmitting(false);
    }
  };

  const updateSubject = async (id: string, data: Partial<SubjectFormData>) => {
    if (!user) return { data: null, error: 'Not authenticated' };

    try {
      setSubmitting(true);
      const { data: updatedSubject, error } = await supabase
        .from('subjects')
        .update(data)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setSubjects(prev =>
        prev.map(subject =>
          subject.id === id ? updatedSubject : subject
        )
      );

      toast({
        title: "Subject updated",
        description: `${updatedSubject.name} has been updated.`,
      });

      return { data: updatedSubject, error: null };
    } catch (error: unknown) {
      toast({
        title: "Error updating subject",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error: error.message };
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSubject = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSubjects(prev => prev.filter(subject => subject.id !== id));
      toast({
        title: "Subject deleted",
        description: "The subject has been removed from your list.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error deleting subject",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    subjects,
    loading,
    submitting,
    createSubject,
    updateSubject,
    deleteSubject,
    refetch: fetchSubjects,
  };
};