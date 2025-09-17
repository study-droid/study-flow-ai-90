import { useState, useEffect, useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';

// Modern React patterns for data fetching
interface DataFetchOptions<T> {
  initialData?: T;
  enabled?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useAsyncData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: DataFetchOptions<T> = {}
) {
  const [data, setData] = useState<T | undefined>(options.initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  const { setDataLoading } = useUIStore();

  const fetchData = useCallback(async (isRefetch = false) => {
    if (!options.enabled) return;

    try {
      if (!isRefetch) {
        setIsLoading(true);
      } else {
        setIsValidating(true);
      }
      
      setDataLoading(key, true);
      setError(null);

      const result = await fetcher();
      setData(result);
      options.onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      options.onError?.(error);
    } finally {
      setIsLoading(false);
      setIsValidating(false);
      setDataLoading(key, false);
    }
  }, [key, fetcher, options, setDataLoading]);

  const mutate = useCallback((newData?: T) => {
    if (newData !== undefined) {
      setData(newData);
    } else {
      fetchData(true);
    }
  }, [fetchData]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchData();
    }
  }, [fetchData, options.enabled]);

  useEffect(() => {
    if (options.refetchInterval && options.enabled !== false) {
      const interval = setInterval(() => {
        fetchData(true);
      }, options.refetchInterval);

      return () => clearInterval(interval);
    }
  }, [fetchData, options.refetchInterval, options.enabled]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    refetch: () => fetchData(true)
  };
}

// Optimistic updates hook
export function useOptimisticUpdates<T>(
  data: T[],
  updateFn: (updates: Partial<T> & { id: string }) => Promise<T>
) {
  const [optimisticData, setOptimisticData] = useState(data);

  useEffect(() => {
    setOptimisticData(data);
  }, [data]);

  const updateOptimistically = useCallback(async (updates: Partial<T> & { id: string }) => {
    // Optimistically update the UI
    setOptimisticData(prev => 
      prev.map(item => 
        (item as any).id === updates.id 
          ? { ...item, ...updates }
          : item
      )
    );

    try {
      // Perform the actual update
      const updatedItem = await updateFn(updates);
      
      // Update with server response
      setOptimisticData(prev => 
        prev.map(item => 
          (item as any).id === updates.id ? updatedItem : item
        )
      );
      
      return updatedItem;
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticData(data);
      throw error;
    }
  }, [data, updateFn]);

  return {
    data: optimisticData,
    updateOptimistically
  };
}

// Intersection Observer hook for infinite scroll
export function useInfiniteScroll(
  hasNextPage: boolean,
  fetchNextPage: () => Promise<void>,
  threshold = 0.1
) {
  const [isFetching, setIsFetching] = useState(false);

  const handleIntersection = useCallback(async (entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    
    if (entry.isIntersecting && hasNextPage && !isFetching) {
      setIsFetching(true);
      try {
        await fetchNextPage();
      } finally {
        setIsFetching(false);
      }
    }
  }, [hasNextPage, fetchNextPage, isFetching]);

  const observerRef = useCallback((node: HTMLElement | null) => {
    if (!node) return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, [handleIntersection, threshold]);

  return { observerRef, isFetching };
}

// Debounced search hook
export function useDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  delay = 300
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const searchResults = await searchFn(query);
        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [query, searchFn, delay]);

  return {
    query,
    setQuery,
    results,
    isSearching
  };
}