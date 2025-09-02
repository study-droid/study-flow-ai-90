import { logger } from '@/services/logging/logger';

/**
 * Calendar Service
 * Manages calendar events across the application
 */

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'study' | 'assignment' | 'exam' | 'quiz' | 'flashcard' | 'reminder';
  time?: string;
  subject?: string;
  route?: string;
  description?: string;
  color?: string;
  recurring?: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
}

class CalendarService {
  private events: CalendarEvent[] = [];
  private listeners: Set<(events: CalendarEvent[]) => void> = new Set();

  constructor() {
    this.loadEvents();
  }

  // Load events from localStorage
  private loadEvents() {
    try {
      const stored = localStorage.getItem('calendar_events');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.events = parsed.map((e: any) => ({
          ...e,
          date: new Date(e.date)
        }));
      }
    } catch (error) {
      logger.error('Failed to load calendar events:', error, 'CalendarService');
    }
  }

  // Save events to localStorage
  private saveEvents() {
    try {
      localStorage.setItem('calendar_events', JSON.stringify(this.events));
      this.notifyListeners();
    } catch (error) {
      logger.error('Failed to save calendar events:', error, 'CalendarService');
    }
  }

  // Notify all listeners of changes
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.events));
  }

  // Subscribe to calendar changes
  subscribe(listener: (events: CalendarEvent[]) => void) {
    this.listeners.add(listener);
    // Immediately call with current events
    listener(this.events);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Get all events
  getEvents(): CalendarEvent[] {
    return [...this.events];
  }

  // Get events for a specific date
  getEventsForDate(date: Date): CalendarEvent[] {
    return this.events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  }

  // Get events for a date range
  getEventsInRange(startDate: Date, endDate: Date): CalendarEvent[] {
    return this.events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }

  // Add a new event
  addEvent(event: Omit<CalendarEvent, 'id'>): CalendarEvent {
    const newEvent: CalendarEvent = {
      ...event,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.events.push(newEvent);
    this.saveEvents();
    
    return newEvent;
  }

  // Update an existing event
  updateEvent(id: string, updates: Partial<CalendarEvent>): CalendarEvent | null {
    const index = this.events.findIndex(e => e.id === id);
    if (index === -1) return null;
    
    this.events[index] = {
      ...this.events[index],
      ...updates,
      id // Ensure ID doesn't change
    };
    
    this.saveEvents();
    return this.events[index];
  }

  // Delete an event
  deleteEvent(id: string): boolean {
    const index = this.events.findIndex(e => e.id === id);
    if (index === -1) return false;
    
    this.events.splice(index, 1);
    this.saveEvents();
    return true;
  }

  // Add assignment to calendar
  addAssignment(assignment: {
    title: string;
    dueDate: Date;
    subject?: string;
    description?: string;
  }) {
    return this.addEvent({
      title: assignment.title,
      date: assignment.dueDate,
      type: 'assignment',
      subject: assignment.subject,
      description: assignment.description,
      route: '/assignments',
      color: 'bg-yellow-500'
    });
  }

  // Add exam to calendar
  addExam(exam: {
    title: string;
    date: Date;
    time?: string;
    subject?: string;
    description?: string;
  }) {
    return this.addEvent({
      title: exam.title,
      date: exam.date,
      time: exam.time,
      type: 'exam',
      subject: exam.subject,
      description: exam.description,
      route: '/quiz',
      color: 'bg-red-500'
    });
  }

  // Add study session to calendar
  addStudySession(session: {
    title: string;
    date: Date;
    time?: string;
    duration?: number;
    subject?: string;
  }) {
    return this.addEvent({
      title: session.title,
      date: session.date,
      time: session.time,
      type: 'study',
      subject: session.subject,
      description: session.duration ? `Duration: ${session.duration} minutes` : undefined,
      route: '/study',
      color: 'bg-blue-500'
    });
  }

  // Add quiz to calendar
  addQuiz(quiz: {
    title: string;
    date: Date;
    time?: string;
    subject?: string;
  }) {
    return this.addEvent({
      title: quiz.title,
      date: quiz.date,
      time: quiz.time,
      type: 'quiz',
      subject: quiz.subject,
      route: '/quiz',
      color: 'bg-purple-500'
    });
  }

  // Add flashcard review session
  addFlashcardReview(review: {
    title: string;
    date: Date;
    deckName?: string;
  }) {
    return this.addEvent({
      title: review.title,
      date: review.date,
      type: 'flashcard',
      subject: review.deckName,
      route: '/flashcards',
      color: 'bg-indigo-500'
    });
  }

  // Clear all events (for testing)
  clearAllEvents() {
    this.events = [];
    this.saveEvents();
  }
}

// Create singleton instance
export const calendarService = new CalendarService();

// Export for use in components
export default calendarService;