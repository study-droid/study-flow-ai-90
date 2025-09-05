/**
 * Study session state store
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  StudySession, 
  Task, 
  Subject, 
  StudyGoal, 
  StudyStats 
} from '@/shared/types';

interface StudyStore {
  // State
  currentSession: StudySession | null;
  sessions: StudySession[];
  tasks: Task[];
  subjects: Subject[];
  goals: StudyGoal[];
  stats: StudyStats | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentSession: (session: StudySession | null) => void;
  addSession: (session: StudySession) => void;
  updateSession: (id: string, updates: Partial<StudySession>) => void;
  removeSession: (id: string) => void;
  setSessions: (sessions: StudySession[]) => void;

  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  setTasks: (tasks: Task[]) => void;

  addSubject: (subject: Subject) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  removeSubject: (id: string) => void;
  setSubjects: (subjects: Subject[]) => void;

  addGoal: (goal: StudyGoal) => void;
  updateGoal: (id: string, updates: Partial<StudyGoal>) => void;
  removeGoal: (id: string) => void;
  setGoals: (goals: StudyGoal[]) => void;

  setStats: (stats: StudyStats | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentSession: null,
  sessions: [],
  tasks: [],
  subjects: [],
  goals: [],
  stats: null,
  isLoading: false,
  error: null,
};

export const useStudyStore = create<StudyStore>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,

        setCurrentSession: (session) =>
          set((state) => {
            state.currentSession = session;
          }),

        addSession: (session) =>
          set((state) => {
            state.sessions.push(session);
          }),

        updateSession: (id, updates) =>
          set((state) => {
            const index = state.sessions.findIndex((s) => s.id === id);
            if (index !== -1) {
              Object.assign(state.sessions[index], updates);
            }
            if (state.currentSession?.id === id) {
              Object.assign(state.currentSession, updates);
            }
          }),

        removeSession: (id) =>
          set((state) => {
            state.sessions = state.sessions.filter((s) => s.id !== id);
            if (state.currentSession?.id === id) {
              state.currentSession = null;
            }
          }),

        setSessions: (sessions) =>
          set((state) => {
            state.sessions = sessions;
          }),

        addTask: (task) =>
          set((state) => {
            state.tasks.push(task);
          }),

        updateTask: (id, updates) =>
          set((state) => {
            const index = state.tasks.findIndex((t) => t.id === id);
            if (index !== -1) {
              Object.assign(state.tasks[index], updates);
            }
          }),

        removeTask: (id) =>
          set((state) => {
            state.tasks = state.tasks.filter((t) => t.id !== id);
          }),

        setTasks: (tasks) =>
          set((state) => {
            state.tasks = tasks;
          }),

        addSubject: (subject) =>
          set((state) => {
            state.subjects.push(subject);
          }),

        updateSubject: (id, updates) =>
          set((state) => {
            const index = state.subjects.findIndex((s) => s.id === id);
            if (index !== -1) {
              Object.assign(state.subjects[index], updates);
            }
          }),

        removeSubject: (id) =>
          set((state) => {
            state.subjects = state.subjects.filter((s) => s.id !== id);
          }),

        setSubjects: (subjects) =>
          set((state) => {
            state.subjects = subjects;
          }),

        addGoal: (goal) =>
          set((state) => {
            state.goals.push(goal);
          }),

        updateGoal: (id, updates) =>
          set((state) => {
            const index = state.goals.findIndex((g) => g.id === id);
            if (index !== -1) {
              Object.assign(state.goals[index], updates);
            }
          }),

        removeGoal: (id) =>
          set((state) => {
            state.goals = state.goals.filter((g) => g.id !== id);
          }),

        setGoals: (goals) =>
          set((state) => {
            state.goals = goals;
          }),

        setStats: (stats) =>
          set((state) => {
            state.stats = stats;
          }),

        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
          }),

        reset: () =>
          set((state) => {
            Object.assign(state, initialState);
          }),
      })),
      {
        name: 'study-store',
        partialize: (state) => ({
          currentSession: state.currentSession,
          sessions: state.sessions,
          tasks: state.tasks,
          subjects: state.subjects,
          goals: state.goals,
        }),
      }
    ),
    { name: 'StudyStore' }
  )
);