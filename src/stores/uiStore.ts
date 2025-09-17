import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// UI State Management
interface UIState {
  theme: 'light' | 'dark' | 'auto';
  colorTheme: 'teddy-orange' | 'ocean-blue' | 'forest-green';
  sidebarCollapsed: boolean;
  sidebarOpen: boolean;
  currentPage: string;
  loading: {
    global: boolean;
    navigation: boolean;
    data: Record<string, boolean>;
  };
  modals: {
    aiTutor: boolean;
    settings: boolean;
    eventCreator: boolean;
    goalCreator: boolean;
  };
  notifications: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
  }[];
  preferences: {
    animations: boolean;
    soundEffects: boolean;
    aiPersonality: 'friendly' | 'professional' | 'casual';
    studyReminders: boolean;
    autoSave: boolean;
  };
}

interface UIActions {
  // Theme management
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setColorTheme: (colorTheme: 'teddy-orange' | 'ocean-blue' | 'forest-green') => void;
  toggleTheme: () => void;
  
  // Sidebar management
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  
  // Page management
  setCurrentPage: (page: string) => void;
  
  // Loading states
  setGlobalLoading: (loading: boolean) => void;
  setNavigationLoading: (loading: boolean) => void;
  setDataLoading: (key: string, loading: boolean) => void;
  
  // Modal management
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
  closeAllModals: () => void;
  
  // Notification management
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  // Preferences
  updatePreferences: (preferences: Partial<UIState['preferences']>) => void;
}

export const useUIStore = create<UIState & UIActions>()(
  devtools(
    immer((set) => ({
      // Initial state
      theme: 'auto',
      colorTheme: 'teddy-orange',
      sidebarCollapsed: false,
      sidebarOpen: false,
      currentPage: '/dashboard',
      loading: {
        global: false,
        navigation: false,
        data: {}
      },
      modals: {
        aiTutor: false,
        settings: false,
        eventCreator: false,
        goalCreator: false
      },
      notifications: [],
      preferences: {
        animations: true,
        soundEffects: true,
        aiPersonality: 'friendly',
        studyReminders: true,
        autoSave: true
      },

      // Actions
      setTheme: (theme) => set((state) => {
        state.theme = theme;
      }),

      setColorTheme: (colorTheme) => set((state) => {
        state.colorTheme = colorTheme;
      }),

      toggleTheme: () => set((state) => {
        const currentTheme = state.theme;
        if (currentTheme === 'light') {
          state.theme = 'dark';
        } else if (currentTheme === 'dark') {
          state.theme = 'auto';
        } else {
          state.theme = 'light';
        }
      }),

      setSidebarCollapsed: (collapsed) => set((state) => {
        state.sidebarCollapsed = collapsed;
      }),

      setSidebarOpen: (open) => set((state) => {
        state.sidebarOpen = open;
      }),

      toggleSidebar: () => set((state) => {
        state.sidebarOpen = !state.sidebarOpen;
      }),

      setCurrentPage: (page) => set((state) => {
        state.currentPage = page;
      }),

      setGlobalLoading: (loading) => set((state) => {
        state.loading.global = loading;
      }),

      setNavigationLoading: (loading) => set((state) => {
        state.loading.navigation = loading;
      }),

      setDataLoading: (key, loading) => set((state) => {
        state.loading.data[key] = loading;
      }),

      openModal: (modal) => set((state) => {
        state.modals[modal] = true;
      }),

      closeModal: (modal) => set((state) => {
        state.modals[modal] = false;
      }),

      closeAllModals: () => set((state) => {
        Object.keys(state.modals).forEach((key) => {
          state.modals[key as keyof typeof state.modals] = false;
        });
      }),

      addNotification: (notification) => set((state) => {
        const newNotification = {
          ...notification,
          id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          read: false
        };
        state.notifications.unshift(newNotification);
        
        // Keep only last 50 notifications
        if (state.notifications.length > 50) {
          state.notifications = state.notifications.slice(0, 50);
        }
      }),

      markNotificationRead: (id) => set((state) => {
        const notification = state.notifications.find(n => n.id === id);
        if (notification) {
          notification.read = true;
        }
      }),

      clearNotifications: () => set((state) => {
        state.notifications = [];
      }),

      updatePreferences: (preferences) => set((state) => {
        Object.assign(state.preferences, preferences);
      })
    })),
    {
      name: 'ui-store'
    }
  )
);

// Selectors for optimized access
export const useTheme = () => useUIStore((state) => state.theme);
export const useSidebar = () => useUIStore((state) => ({
  collapsed: state.sidebarCollapsed,
  open: state.sidebarOpen,
  setCollapsed: state.setSidebarCollapsed,
  setOpen: state.setSidebarOpen,
  toggle: state.toggleSidebar
}));
export const useLoading = () => useUIStore((state) => state.loading);
export const useModals = () => useUIStore((state) => ({
  modals: state.modals,
  open: state.openModal,
  close: state.closeModal,
  closeAll: state.closeAllModals
}));
export const useNotifications = () => useUIStore((state) => ({
  notifications: state.notifications,
  add: state.addNotification,
  markRead: state.markNotificationRead,
  clear: state.clearNotifications
}));
