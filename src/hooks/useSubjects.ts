import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

type Subject = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_archived: boolean | null;
  created_at: string;
  updated_at: string;
};

export const useSubjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchSubjects();
    }
  }, [user]);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_archived', false)
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({
        title: "Error",
        description: "Failed to load subjects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSubject = async (subjectData: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    is_archived?: boolean;
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert([{
          name: subjectData.name,
          description: subjectData.description || null,
          color: subjectData.color || '#3B82F6',
          icon: subjectData.icon || null,
          is_archived: subjectData.is_archived || false,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      setSubjects(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Subject created!",
      });

      return data;
    } catch (error) {
      console.error('Error creating subject:', error);
      toast({
        title: "Error",
        description: "Failed to create subject",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateSubject = async (id: string, updates: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    is_archived?: boolean;
  }) => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setSubjects(prev => prev.map(subject => subject.id === id ? data : subject));
      toast({
        title: "Success",
        description: "Subject updated!",
      });

      return data;
    } catch (error) {
      console.error('Error updating subject:', error);
      toast({
        title: "Error",
        description: "Failed to update subject",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteSubject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;

      setSubjects(prev => prev.filter(subject => subject.id !== id));
      toast({
        title: "Success",
        description: "Subject archived",
      });
    } catch (error) {
      console.error('Error archiving subject:', error);
      toast({
        title: "Error",
        description: "Failed to archive subject",
        variant: "destructive",
      });
    }
  };

  return {
    subjects,
    loading,
    createSubject,
    updateSubject,
    deleteSubject,
    refreshSubjects: fetchSubjects,
  };
};