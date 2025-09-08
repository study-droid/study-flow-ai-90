/**
 * Global Search Service
 * Indexes and searches across all app content
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/logging/logger';

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'subject' | 'assignment' | 'flashcard' | 'quiz' | 'note' | 'material' | 'goal' | 'session' | 'page';
  route: string;
  icon?: string;
  metadata?: {
    subject?: string;
    dueDate?: string;
    progress?: number;
    tags?: string[];
  };
  relevance: number;
}

export interface SearchIndex {
  id: string;
  type: SearchResult['type'];
  title: string;
  content: string;
  keywords: string[];
  route: string;
  metadata?: any;
}

class SearchService {
  private searchIndex: SearchIndex[] = [];
  private searchHistory: string[] = [];
  private popularSearches: string[] = [];
  private appPages: SearchIndex[] = [];

  constructor() {
    this.initializeAppPages();
    this.loadSearchHistory();
    this.buildSearchIndex();
  }

  // Initialize static app pages
  private initializeAppPages() {
    this.appPages = [
      {
        id: 'page-dashboard',
        type: 'page',
        title: 'Dashboard',
        content: 'Main dashboard overview home page statistics',
        keywords: ['dashboard', 'home', 'overview', 'main'],
        route: '/'
      },
      {
        id: 'page-subjects',
        type: 'page',
        title: 'Subjects',
        content: 'Manage subjects courses materials study content',
        keywords: ['subjects', 'courses', 'materials', 'content'],
        route: '/subjects'
      },
      {
        id: 'page-assignments',
        type: 'page',
        title: 'Assignments',
        content: 'View manage assignments homework tasks due dates',
        keywords: ['assignments', 'homework', 'tasks', 'due'],
        route: '/tasks'
      },
      {
        id: 'page-study',
        type: 'page',
        title: 'Study & Focus Hub',
        content: 'Study focus timer pomodoro ambient sounds concentration',
        keywords: ['study', 'focus', 'timer', 'pomodoro', 'sounds', 'ambient'],
        route: '/study'
      },
      {
        id: 'page-quiz',
        type: 'page',
        title: 'Quiz & Exam Prep',
        content: 'Quiz exam test preparation practice questions flashcards',
        keywords: ['quiz', 'exam', 'test', 'practice', 'questions'],
        route: '/flashcards'
      },
      {
        id: 'page-flashcards',
        type: 'page',
        title: 'Flashcards',
        content: 'Flashcards study cards memorization spaced repetition',
        keywords: ['flashcards', 'cards', 'memorization', 'repetition'],
        route: '/flashcards'
      },
      {
        id: 'page-goals',
        type: 'page',
        title: 'Goals',
        content: 'Goals targets objectives milestones achievements',
        keywords: ['goals', 'targets', 'objectives', 'milestones'],
        route: '/goals'
      },
      {
        id: 'page-ai-tutor',
        type: 'page',
        title: 'AI Tutor',
        content: 'AI tutor assistant help chatbot study help',
        keywords: ['ai', 'tutor', 'assistant', 'help', 'chatbot'],
        route: '/ai-tutor'
      },
      {
        id: 'page-analytics',
        type: 'page',
        title: 'Analytics',
        content: 'Analytics statistics progress reports performance',
        keywords: ['analytics', 'statistics', 'progress', 'reports'],
        route: '/analytics'
      },
      {
        id: 'page-settings',
        type: 'page',
        title: 'Settings',
        content: 'Settings preferences configuration profile account',
        keywords: ['settings', 'preferences', 'config', 'profile'],
        route: '/settings'
      }
    ];
  }

  // Load search history from localStorage
  private loadSearchHistory() {
    try {
      const history = localStorage.getItem('search_history');
      if (history) {
        this.searchHistory = JSON.parse(history);
      }

      const popular = localStorage.getItem('popular_searches');
      if (popular) {
        this.popularSearches = JSON.parse(popular);
      } else {
        // Default popular searches
        this.popularSearches = [
          'mathematics',
          'physics',
          'assignments',
          'quiz',
          'flashcards',
          'study timer'
        ];
      }
    } catch (error) {
      logger.error('Failed to load search history:', 'SearchService', error);
    }
  }

  // Save search history
  private saveSearchHistory() {
    try {
      localStorage.setItem('search_history', JSON.stringify(this.searchHistory.slice(0, 10)));
    } catch (error) {
      logger.error('Failed to save search history:', 'SearchService', error);
    }
  }

  // Build search index from database
  async buildSearchIndex() {
    this.searchIndex = [...this.appPages];
    
    try {
      // Index subjects
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('*');
      
      if (subjectsError) {
        console.error('Error fetching subjects for search index:', subjectsError);
      }
      
      if (subjects) {
        subjects.forEach(subject => {
          this.searchIndex.push({
            id: `subject-${subject.id}`,
            type: 'subject',
            title: subject.name,
            content: `${subject.name} ${subject.description || ''} ${subject.professor || ''}`,
            keywords: [subject.name?.toLowerCase() || '', 'subject', 'course'].filter(Boolean),
            route: `/subjects?id=${subject.id}`,
            metadata: {
              professor: subject.professor,
              credits: subject.credits
            }
          });
        });
      }

      // Index assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*');
      
      if (assignmentsError) {
        console.error('Error fetching assignments for search index:', assignmentsError);
      }
      
      if (assignments) {
        assignments.forEach(assignment => {
          this.searchIndex.push({
            id: `assignment-${assignment.id}`,
            type: 'assignment',
            title: assignment.title,
            content: `${assignment.title} ${assignment.description || ''}`,
            keywords: [assignment.title?.toLowerCase() || '', 'assignment', 'homework'].filter(Boolean),
            route: `/tasks?id=${assignment.id}`,
            metadata: {
              dueDate: assignment.due_date,
              subject: assignment.subject_id,
              completed: assignment.completed
            }
          });
        });
      }

      // Index flashcards
      const { data: flashcards, error: flashcardsError } = await supabase
        .from('flashcards')
        .select('*');
      
      if (flashcardsError) {
        console.error('Error fetching flashcards for search index:', flashcardsError);
      }
      
      if (flashcards) {
        flashcards.forEach(card => {
          this.searchIndex.push({
            id: `flashcard-${card.id}`,
            type: 'flashcard',
            title: card.front,
            content: `${card.front} ${card.back}`,
            keywords: [card.front?.toLowerCase() || '', 'flashcard', 'card'].filter(Boolean),
            route: `/flashcards?id=${card.id}`,
            metadata: {
              subject: card.subject_id,
              mastery: card.mastery_level
            }
          });
        });
      }

      // Index goals
      const { data: goals } = await supabase
        .from('goals')
        .select('*');
      
      if (goals) {
        goals.forEach(goal => {
          this.searchIndex.push({
            id: `goal-${goal.id}`,
            type: 'goal',
            title: goal.title,
            content: `${goal.title} ${goal.description || ''}`,
            keywords: [goal.title?.toLowerCase() || '', 'goal', 'target'].filter(Boolean),
            route: `/goals?id=${goal.id}`,
            metadata: {
              progress: goal.progress,
              deadline: goal.deadline
            }
          });
        });
      }

    } catch (error) {
      logger.error('Failed to build search index:', 'SearchService', error);
    }
  }

  // Perform search
  search(query: string, limit: number = 10): SearchResult[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    const results: SearchResult[] = [];

    // Add to search history
    if (!this.searchHistory.includes(query)) {
      this.searchHistory.unshift(query);
      this.saveSearchHistory();
    }

    // Search through index
    this.searchIndex.forEach(item => {
      let relevance = 0;
      const titleLower = (item.title || '').toLowerCase();
      const contentLower = (item.content || '').toLowerCase();

      // Check for exact matches
      if (titleLower === query.toLowerCase()) {
        relevance += 100;
      } else if (titleLower.includes(query.toLowerCase())) {
        relevance += 50;
      }

      // Check each search term
      searchTerms.forEach(term => {
        if (titleLower.includes(term)) {
          relevance += 20;
        }
        if (contentLower.includes(term)) {
          relevance += 10;
        }
        if (item.keywords.some(keyword => keyword.includes(term))) {
          relevance += 15;
        }
      });

      if (relevance > 0) {
        results.push({
          id: item.id,
          title: item.title,
          description: this.getDescription(item),
          type: item.type,
          route: item.route,
          metadata: item.metadata,
          relevance
        });
      }
    });

    // Sort by relevance and limit results
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  // Get description for search result
  private getDescription(item: SearchIndex): string {
    switch (item.type) {
      case 'subject':
        return `Course • ${item.metadata?.professor || 'No professor'}`;
      case 'assignment':
        return `Due ${item.metadata?.dueDate ? new Date(item.metadata.dueDate).toLocaleDateString() : 'No date'}`;
      case 'flashcard':
        return `Flashcard • Mastery: ${item.metadata?.mastery || 0}%`;
      case 'quiz':
        return 'Quiz & Practice';
      case 'goal':
        return `Goal • Progress: ${item.metadata?.progress || 0}%`;
      case 'page':
        return 'Navigate to page';
      default:
        return item.content.substring(0, 100);
    }
  }

  // Get search suggestions
  getSuggestions(query: string): string[] {
    if (!query) {
      return [...this.popularSearches];
    }

    const queryLower = query.toLowerCase();
    const suggestions = new Set<string>();

    // Add from search history
    this.searchHistory
      .filter(term => term.toLowerCase().includes(queryLower))
      .forEach(term => suggestions.add(term));

    // Add from popular searches
    this.popularSearches
      .filter(term => term.toLowerCase().includes(queryLower))
      .forEach(term => suggestions.add(term));

    // Add from index titles
    this.searchIndex
      .filter(item => item.title.toLowerCase().includes(queryLower))
      .slice(0, 5)
      .forEach(item => suggestions.add(item.title));

    return Array.from(suggestions).slice(0, 8);
  }

  // Get recent searches
  getRecentSearches(): string[] {
    return this.searchHistory.slice(0, 5);
  }

  // Clear search history
  clearHistory() {
    this.searchHistory = [];
    localStorage.removeItem('search_history');
  }

  // Refresh index (call when data changes)
  async refreshIndex() {
    await this.buildSearchIndex();
  }
}

// Create singleton instance
export const searchService = new SearchService();
export default searchService;