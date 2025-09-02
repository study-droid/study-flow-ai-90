import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface TimetableEntry {
  id: string;
  user_id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  subject?: {
    name: string;
    code: string;
    color: string;
  };
}

export interface TimetableEntryFormData {
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room?: string;
  notes?: string;
}

export const useTimetable = () => {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTimetable();
    } else {
      setEntries([]);
      setLoading(false);
    }
  }, [user]);

  const fetchTimetable = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('timetable_entries')
        .select(`
          *,
          subject:subjects(name, code, color)
        `)
        .eq('user_id', user.id)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      setEntries(data || []);
    } catch (error: unknown) {
      toast({
        title: "Error loading timetable",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createEntry = async (data: TimetableEntryFormData) => {
    if (!user) return { data: null, error: 'Not authenticated' };

    try {
      setSubmitting(true);
      const { data: newEntry, error } = await supabase
        .from('timetable_entries')
        .insert([
          {
            ...data,
            user_id: user.id,
          },
        ])
        .select(`
          *,
          subject:subjects(name, code, color)
        `)
        .single();

      if (error) throw error;

      setEntries(prev => [...prev, newEntry]);
      toast({
        title: "Timetable entry created",
        description: "The entry has been added to your timetable.",
      });

      return { data: newEntry, error: null };
    } catch (error: unknown) {
      toast({
        title: "Error creating timetable entry",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error: error.message };
    } finally {
      setSubmitting(false);
    }
  };

  const updateEntry = async (id: string, data: Partial<TimetableEntryFormData>) => {
    if (!user) return { data: null, error: 'Not authenticated' };

    try {
      setSubmitting(true);
      const { data: updatedEntry, error } = await supabase
        .from('timetable_entries')
        .update(data)
        .eq('id', id)
        .eq('user_id', user.id)
        .select(`
          *,
          subject:subjects(name, code, color)
        `)
        .single();

      if (error) throw error;

      setEntries(prev =>
        prev.map(entry =>
          entry.id === id ? updatedEntry : entry
        )
      );

      toast({
        title: "Timetable entry updated",
        description: "The entry has been updated.",
      });

      return { data: updatedEntry, error: null };
    } catch (error: unknown) {
      toast({
        title: "Error updating timetable entry",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error: error.message };
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('timetable_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setEntries(prev => prev.filter(entry => entry.id !== id));
      toast({
        title: "Timetable entry deleted",
        description: "The entry has been removed from your timetable.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error deleting timetable entry",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getEntriesByDay = (dayOfWeek: number) => {
    return entries.filter(entry => entry.day_of_week === dayOfWeek);
  };

  return {
    entries,
    loading,
    submitting,
    createEntry,
    updateEntry,
    deleteEntry,
    getEntriesByDay,
    refetch: fetchTimetable,
  };
};