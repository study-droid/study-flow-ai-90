import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types
export interface StudyEvent {
  id: string;
  title: string;
  description?: string;
  subject: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: 'study' | 'exam' | 'assignment' | 'break' | 'ai-session';
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  reminderSet: boolean;
  location?: string;
  notes?: string;
  aiTutorSessionId?: string;
}

export interface StudyGoal {
  id: string;
  title: string;
  description: string;
  targetHours: number;
  currentHours: number;
  deadline: Date;
  subject: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused';
  milestones: {
    id: string;
    title: string;
    completed: boolean;
    completedAt?: Date;
  }[];
}

export interface StudySession {
  id: string;
  subject: string;
  duration: number; // in minutes
  startTime: Date;
  endTime?: Date;
  notes?: string;
  rating?: number; // 1-5 stars
  focusLevel?: number; // 1-10
  completed: boolean;
  aiTutorUsed: boolean;
  topicsLearned: string[];
}

export interface UserPreferences {
  defaultStudyDuration: number;
  preferredStudyTimes: string[];
  breakFrequency: number; // minutes
  notificationsEnabled: boolean;
  studyReminders: boolean;
  theme: 'light' | 'dark' | 'auto';
  timeFormat: '12h' | '24h';
  weekStartsOn: 'sunday' | 'monday';
}

// Store interfaces
interface StudyStore {
  // State
  events: StudyEvent[];
  goals: StudyGoal[];
  sessions: StudySession[];
  preferences: UserPreferences;
  selectedDate: Date;
  isLoading: boolean;
  error: string | null;

  // Actions
  addEvent: (event: Omit<StudyEvent, 'id'>) => void;
  updateEvent: (id: string, updates: Partial<StudyEvent>) => void;
  deleteEvent: (id: string) => void;
  completeEvent: (id: string) => void;
  
  addGoal: (goal: Omit<StudyGoal, 'id'>) => void;
  updateGoal: (id: string, updates: Partial<StudyGoal>) => void;
  completeGoal: (id: string) => void;
  
  addSession: (session: Omit<StudySession, 'id'>) => void;
  endSession: (id: string, notes?: string, rating?: number) => void;
  
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  setSelectedDate: (date: Date) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed/derived data
  getEventsForDate: (date: Date) => StudyEvent[];
  getUpcomingEvents: (days?: number) => StudyEvent[];
  getActiveGoals: () => StudyGoal[];
  getTotalStudyHours: (period: 'today' | 'week' | 'month') => number;
  getStudyStreak: () => number;
}

// Default preferences
const defaultPreferences: UserPreferences = {
  defaultStudyDuration: 60,
  preferredStudyTimes: ['09:00', '14:00', '19:00'],
  breakFrequency: 25,
  notificationsEnabled: true,
  studyReminders: true,
  theme: 'auto',
  timeFormat: '12h',
  weekStartsOn: 'monday'
};

// Store implementation
export const useStudyStore = create<StudyStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        events: [],
        goals: [],
        sessions: [],
        preferences: defaultPreferences,
        selectedDate: new Date(),
        isLoading: false,
        error: null,

        // Event actions
        addEvent: (eventData) =>
          set((state) => {
            const newEvent: StudyEvent = {
              ...eventData,
              id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            };
            state.events.push(newEvent);
          }),

        updateEvent: (id, updates) =>
          set((state) => {
            const eventIndex = state.events.findIndex((e) => e.id === id);
            if (eventIndex !== -1) {
              Object.assign(state.events[eventIndex], updates);
            }
          }),

        deleteEvent: (id) =>
          set((state) => {
            state.events = state.events.filter((e) => e.id !== id);
          }),

        completeEvent: (id) =>
          set((state) => {
            const event = state.events.find((e) => e.id === id);
            if (event) {
              event.completed = true;
            }
          }),

        // Goal actions
        addGoal: (goalData) =>
          set((state) => {
            const newGoal: StudyGoal = {
              ...goalData,
              id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            };
            state.goals.push(newGoal);
          }),

        updateGoal: (id, updates) =>
          set((state) => {
            const goalIndex = state.goals.findIndex((g) => g.id === id);
            if (goalIndex !== -1) {
              Object.assign(state.goals[goalIndex], updates);
            }
          }),

        completeGoal: (id) =>
          set((state) => {
            const goal = state.goals.find((g) => g.id === id);
            if (goal) {
              goal.status = 'completed';
              goal.currentHours = goal.targetHours;
            }
          }),

        // Session actions
        addSession: (sessionData) =>
          set((state) => {
            const newSession: StudySession = {
              ...sessionData,
              id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            };
            state.sessions.push(newSession);
          }),

        endSession: (id, notes, rating) =>
          set((state) => {
            const session = state.sessions.find((s) => s.id === id);
            if (session) {
              session.endTime = new Date();
              session.completed = true;
              if (notes) session.notes = notes;
              if (rating) session.rating = rating;
            }
          }),

        // Preference actions
        updatePreferences: (updates) =>
          set((state) => {
            Object.assign(state.preferences, updates);
          }),

        setSelectedDate: (date) =>
          set((state) => {
            state.selectedDate = date;
          }),

        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
          }),

        // Computed/derived data
        getEventsForDate: (date) => {
          const { events } = get();
          return events.filter(
            (event) =>
              event.date.toDateString() === date.toDateString()
          );
        },

        getUpcomingEvents: (days = 7) => {
          const { events } = get();
          const now = new Date();
          const futureDate = new Date();
          futureDate.setDate(now.getDate() + days);

          return events
            .filter((event) => event.date >= now && event.date <= futureDate)
            .sort((a, b) => a.date.getTime() - b.date.getTime());
        },

        getActiveGoals: () => {
          const { goals } = get();
          return goals.filter((goal) => goal.status === 'active');
        },

        getTotalStudyHours: (period) => {
          const { sessions } = get();
          const now = new Date();
          let startDate: Date;

          switch (period) {
            case 'today':
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              break;
            case 'week':
              startDate = new Date(now);
              startDate.setDate(now.getDate() - 7);
              break;
            case 'month':
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              break;
            default:
              startDate = new Date(0);
          }

          return sessions
            .filter((session) => session.startTime >= startDate && session.completed)
            .reduce((total, session) => total + session.duration, 0) / 60; // Convert to hours
        },

        getStudyStreak: () => {
          const { sessions } = get();
          if (sessions.length === 0) return 0;

          const today = new Date();
          let streak = 0;
          let currentDate = new Date(today);

          while (true) {
            const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const sessionsOnDay = sessions.filter(
              (session) =>
                session.startTime >= dayStart &&
                session.startTime < dayEnd &&
                session.completed
            );

            if (sessionsOnDay.length > 0) {
              streak++;
              currentDate.setDate(currentDate.getDate() - 1);
            } else {
              break;
            }
          }

          return streak;
        },
      })),
      {
        name: 'study-teddy-store',
        partialize: (state) => ({
          events: state.events,
          goals: state.goals,
          sessions: state.sessions,
          preferences: state.preferences,
        }),
      }
    ),
    {
      name: 'study-store',
    }
  )
);