import { useState, useEffect, useCallback } from 'react';
import { searchService, type SearchResult } from '@/services/search/searchService';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/logging/logger';

export function useSearch() {
  const [isIndexing, setIsIndexing] = useState(false);

  // Rebuild search index when component mounts
  useEffect(() => {
    rebuildIndex();
  }, []);

  // Rebuild the search index
  const rebuildIndex = useCallback(async () => {
    setIsIndexing(true);
    try {
      await searchService.refreshIndex();
    } catch (error) {
      logger.error('Failed to rebuild search index:', error, 'UseSearch');
    } finally {
      setIsIndexing(false);
    }
  }, []);

  // Perform a search
  const search = useCallback((query: string, limit?: number): SearchResult[] => {
    return searchService.search(query, limit);
  }, []);

  // Get search suggestions
  const getSuggestions = useCallback((query: string): string[] => {
    return searchService.getSuggestions(query);
  }, []);

  // Get recent searches
  const getRecentSearches = useCallback((): string[] => {
    return searchService.getRecentSearches();
  }, []);

  // Clear search history
  const clearHistory = useCallback(() => {
    searchService.clearHistory();
  }, []);

  // Listen for data changes and rebuild index
  useEffect(() => {
    const subscriptions: any[] = [];

    // Subscribe to subjects changes
    const subjectsSubscription = supabase
      .channel('subjects_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'subjects' 
      }, () => {
        rebuildIndex();
      })
      .subscribe();

    subscriptions.push(subjectsSubscription);

    // Subscribe to assignments changes
    const assignmentsSubscription = supabase
      .channel('assignments_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'assignments' 
      }, () => {
        rebuildIndex();
      })
      .subscribe();

    subscriptions.push(assignmentsSubscription);

    // Subscribe to flashcards changes
    const flashcardsSubscription = supabase
      .channel('flashcards_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'flashcards' 
      }, () => {
        rebuildIndex();
      })
      .subscribe();

    subscriptions.push(flashcardsSubscription);

    // Subscribe to goals changes
    const goalsSubscription = supabase
      .channel('goals_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'goals' 
      }, () => {
        rebuildIndex();
      })
      .subscribe();

    subscriptions.push(goalsSubscription);

    // Cleanup subscriptions
    return () => {
      subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
    };
  }, [rebuildIndex]);

  return {
    search,
    getSuggestions,
    getRecentSearches,
    clearHistory,
    rebuildIndex,
    isIndexing
  };
}