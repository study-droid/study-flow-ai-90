import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calendarService } from '@/services/calendar/calendarService';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/services/logging/logger';

/**
 * Hook to automatically sync calendar with database events
 * Fetches assignments, tasks, study sessions, and other events
 */
export function useCalendarSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { user } = useAuth();

  // Sync all events from database
  const syncCalendarEvents = async () => {
    if (!user) return;
    
    setIsSyncing(true);
    try {
      // Clear existing events first to avoid duplicates
      calendarService.clearAllEvents();

      // Fetch and add tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .not('due_date', 'is', null);
      
      if (tasksError) {
        console.error('Error fetching tasks for calendar sync:', tasksError);
      }

      if (tasks) {
        tasks.forEach(task => {
          calendarService.addEvent({
            title: task.title,
            date: new Date(task.due_date),
            type: 'reminder',
            description: task.description,
            route: '/tasks'
          });
        });
      }

      // Fetch and add assignments (handle missing table)
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', user.id);
      
      if (assignmentsError) {
        console.error('Error fetching assignments for calendar sync:', assignmentsError);
      }

      if (assignments) {
        assignments.forEach(assignment => {
          calendarService.addAssignment({
            title: assignment.title,
            dueDate: new Date(assignment.due_date),
            subject: assignment.subject_id,
            description: assignment.description
          });
        });
      }

      // Fetch and add study sessions
      const { data: studySessions } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id);

      if (studySessions) {
        studySessions.forEach(session => {
          calendarService.addStudySession({
            title: `Study: ${session.subject || 'General'}`,
            date: new Date(session.start_time),
            duration: session.duration,
            subject: session.subject
          });
        });
      }

      // Fetch and add quizzes (handle missing table)
      const { data: quizzes, error: quizzesError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('user_id', user.id);
      
      if (quizzesError) {
        console.error('Error fetching quizzes for calendar sync:', quizzesError);
      }

      if (quizzes) {
        quizzes.forEach(quiz => {
          if (quiz.scheduled_date) {
            calendarService.addQuiz({
              title: quiz.title,
              date: new Date(quiz.scheduled_date),
              subject: quiz.subject_id
            });
          }
        });
      }

      // Fetch and add goals with deadlines (fix filter syntax)
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .is('deadline', 'not.null'); // Correct Supabase syntax for NOT NULL
      
      if (goalsError) {
        console.error('Error fetching goals for calendar sync:', goalsError);
      }

      if (goals) {
        goals.forEach(goal => {
          calendarService.addEvent({
            title: `Goal: ${goal.title}`,
            date: new Date(goal.deadline),
            type: 'reminder',
            description: goal.description,
            route: '/goals'
          });
        });
      }

      // Fetch and add flashcard review sessions (handle missing table)
      const { data: flashcardSessions, error: flashcardError } = await supabase
        .from('flashcard_sessions')
        .select('*')
        .eq('user_id', user.id);
      
      if (flashcardError) {
        console.error('Error fetching flashcard sessions for calendar sync:', flashcardError);
      }

      if (flashcardSessions) {
        flashcardSessions.forEach(session => {
          if (session.next_review_date) {
            calendarService.addFlashcardReview({
              title: 'Flashcard Review',
              date: new Date(session.next_review_date),
              deckName: session.deck_name
            });
          }
        });
      }

      // Fetch and add exams (handle missing table)
      const { data: exams, error: examsError } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', user.id);
      
      if (examsError) {
        console.error('Error fetching exams for calendar sync:', examsError);
      }

      if (exams) {
        exams.forEach(exam => {
          calendarService.addExam({
            title: exam.title,
            date: new Date(exam.date),
            time: exam.time,
            subject: exam.subject_id,
            description: exam.description
          });
        });
      }

      setLastSyncTime(new Date());
    } catch (error) {
      logger.error('Failed to sync calendar events:', error, 'UseCalendarSync');
    } finally {
      setIsSyncing(false);
    }
  };

  // Initial sync on mount
  useEffect(() => {
    if (user) {
      syncCalendarEvents();
    }
  }, [user]);

  // Set up real-time listeners for changes
  useEffect(() => {
    if (!user) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Listen for task changes
    const tasksChannel = supabase
      .channel('calendar_tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          handleDatabaseChange('task', payload);
        }
      )
      .subscribe();
    channels.push(tasksChannel);

    // Listen for assignment changes
    const assignmentsChannel = supabase
      .channel('calendar_assignments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assignments',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          handleDatabaseChange('assignment', payload);
        }
      )
      .subscribe();
    channels.push(assignmentsChannel);

    // Listen for study session changes
    const sessionsChannel = supabase
      .channel('calendar_sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_sessions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          handleDatabaseChange('study_session', payload);
        }
      )
      .subscribe();
    channels.push(sessionsChannel);

    // Listen for quiz changes
    const quizzesChannel = supabase
      .channel('calendar_quizzes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quizzes',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          handleDatabaseChange('quiz', payload);
        }
      )
      .subscribe();
    channels.push(quizzesChannel);

    // Listen for goal changes
    const goalsChannel = supabase
      .channel('calendar_goals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          handleDatabaseChange('goal', payload);
        }
      )
      .subscribe();
    channels.push(goalsChannel);

    // Cleanup - properly unsubscribe from all channels
    return () => {
      channels.forEach(channel => {
        channel.unsubscribe();
      });
    };
  }, [user]);

  // Handle real-time database changes
  const handleDatabaseChange = (type: string, payload: unknown) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        addEventToCalendar(type, newRecord);
        break;
      case 'UPDATE':
        updateCalendarEvent(type, newRecord, oldRecord);
        break;
      case 'DELETE':
        removeEventFromCalendar(type, oldRecord);
        break;
    }
  };

  // Add new event to calendar
  const addEventToCalendar = (type: string, record: unknown) => {
    switch (type) {
      case 'task':
        if (record.due_date) {
          calendarService.addEvent({
            title: record.title,
            date: new Date(record.due_date),
            type: 'reminder',
            description: record.description,
            route: '/tasks'
          });
        }
        break;
      case 'assignment':
        if (record.due_date) {
          calendarService.addAssignment({
            title: record.title,
            dueDate: new Date(record.due_date),
            subject: record.subject_id,
            description: record.description
          });
        }
        break;
      case 'study_session':
        if (record.start_time) {
          calendarService.addStudySession({
            title: `Study: ${record.subject || 'General'}`,
            date: new Date(record.start_time),
            duration: record.duration,
            subject: record.subject
          });
        }
        break;
      case 'quiz':
        if (record.scheduled_date) {
          calendarService.addQuiz({
            title: record.title,
            date: new Date(record.scheduled_date),
            subject: record.subject_id
          });
        }
        break;
      case 'goal':
        if (record.deadline) {
          calendarService.addEvent({
            title: `Goal: ${record.title}`,
            date: new Date(record.deadline),
            type: 'reminder',
            description: record.description,
            route: '/goals'
          });
        }
        break;
    }
  };

  // Update existing calendar event
  const updateCalendarEvent = (type: string, newRecord: unknown, oldRecord: unknown) => {
    // For simplicity, remove old and add new
    removeEventFromCalendar(type, oldRecord);
    addEventToCalendar(type, newRecord);
  };

  // Remove event from calendar
  const removeEventFromCalendar = (type: string, record: unknown) => {
    // Find and remove the event
    const events = calendarService.getEvents();
    const eventToRemove = events.find(event => {
      // Match based on title and type
      if (type === 'task' && event.type === 'reminder') {
        return event.title === record.title;
      }
      if (type === 'assignment' && event.type === 'assignment') {
        return event.title === record.title;
      }
      if (type === 'study_session' && event.type === 'study') {
        return event.title.includes(record.subject || 'General');
      }
      if (type === 'quiz' && event.type === 'quiz') {
        return event.title === record.title;
      }
      if (type === 'goal' && event.type === 'reminder') {
        return event.title === `Goal: ${record.title}`;
      }
      return false;
    });

    if (eventToRemove) {
      calendarService.deleteEvent(eventToRemove.id);
    }
  };

  return {
    syncCalendarEvents,
    isSyncing,
    lastSyncTime
  };
}