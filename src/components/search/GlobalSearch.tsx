import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  X, 
  Clock,
  TrendingUp,
  BookOpen,
  FileText,
  Brain,
  Target,
  ClipboardList,
  Settings,
  BarChart3,
  Home,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchService, type SearchResult } from '@/services/search/searchService';
import { useDebounce } from '@/hooks/useDebounce';

interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ 
  className, 
  placeholder = "Search subjects, assignments, flashcards..." 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(searchService.getRecentSearches());
  }, []);

  // Global keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Perform search when query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      setIsLoading(true);
      const searchResults = searchService.search(debouncedQuery);
      setResults(searchResults);
      setSuggestions(searchService.getSuggestions(debouncedQuery));
      setIsLoading(false);
    } else {
      setResults([]);
      setSuggestions(searchService.getSuggestions(''));
    }
  }, [debouncedQuery]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  }, [isOpen, results, selectedIndex]);

  const handleResultClick = (result: SearchResult) => {
    setQuery('');
    setIsOpen(false);
    navigate(result.route);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    inputRef.current?.focus();
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'subject': return BookOpen;
      case 'assignment': return FileText;
      case 'flashcard': return Brain;
      case 'quiz': return ClipboardList;
      case 'goal': return Target;
      case 'page': return Home;
      default: return FileText;
    }
  };

  const getTypeBadgeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'subject': return 'bg-blue-500/10 text-blue-600';
      case 'assignment': return 'bg-yellow-500/10 text-yellow-600';
      case 'flashcard': return 'bg-purple-500/10 text-purple-600';
      case 'quiz': return 'bg-red-500/10 text-red-600';
      case 'goal': return 'bg-green-500/10 text-green-600';
      case 'page': return 'bg-gray-500/10 text-gray-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-20 bg-background/50 border-muted-foreground/20 focus:border-primary transition-all duration-200"
        />
        {/* Keyboard shortcut hint */}
        {!query && !isOpen && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 hidden sm:flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-muted rounded border border-border">
              {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
            </kbd>
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-muted rounded border border-border">
              K
            </kbd>
          </div>
        )}
        {query && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-background border rounded-lg shadow-lg z-50 max-h-[500px] overflow-hidden">
          {/* Search Results */}
          {query && results.length > 0 && (
            <div className="p-2 border-b">
              <div className="text-xs font-medium text-muted-foreground px-2 mb-2">
                Search Results
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {results.map((result, index) => {
                  const Icon = getTypeIcon(result.type);
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center gap-3",
                        selectedIndex === index && "bg-muted"
                      )}
                    >
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        getTypeBadgeColor(result.type)
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.title}</p>
                        {result.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {result.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {result.type}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Results */}
          {query && results.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              <Search className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No results found for "{query}"
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Try searching for subjects, assignments, or flashcards
              </p>
            </div>
          )}

          {/* Suggestions & Recent */}
          {!query && (
            <>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="p-2 border-b">
                  <div className="flex items-center justify-between px-2 mb-2">
                    <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Recent Searches
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        searchService.clearHistory();
                        setRecentSearches([]);
                      }}
                      className="h-6 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(search)}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{search}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              <div className="p-2">
                <div className="text-xs font-medium text-muted-foreground px-2 mb-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Popular Searches
                </div>
                <div className="flex flex-wrap gap-2 px-2">
                  {suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="h-7 text-xs"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div className="p-2 border-t">
                <div className="text-xs font-medium text-muted-foreground px-2 mb-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Quick Access
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/study');
                    }}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm">Study Hub</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/flashcards');
                    }}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Brain className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-sm">Flashcards</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/tasks');
                    }}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-yellow-600" />
                    </div>
                    <span className="text-sm">Tasks</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/analytics');
                    }}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm">Analytics</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};