import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain,
  Search,
  Bookmark,
  BookmarkCheck,
  Clock,
  Star,
  Download,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Concept {
  id: string;
  subject: string;
  concept_name: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  explanation: string;
  examples: string[];
  is_bookmarked: boolean;
  understanding_rating?: number;
  review_count: number;
  created_at: string;
}

export const ConceptHistory: React.FC = () => {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [filteredConcepts, setFilteredConcepts] = useState<Concept[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadConcepts();
  }, []);

  useEffect(() => {
    filterConcepts();
  }, [concepts, searchQuery, filterLevel]);

  const loadConcepts = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_tutor_concepts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setConcepts(data || []);
    } catch (error) {
      console.error('Error loading concepts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterConcepts = () => {
    let filtered = [...concepts];

    if (searchQuery) {
      filtered = filtered.filter(concept =>
        concept.concept_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        concept.subject.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterLevel !== 'all') {
      filtered = filtered.filter(concept => concept.difficulty_level === filterLevel);
    }

    setFilteredConcepts(filtered);
  };

  const toggleBookmark = async (conceptId: string) => {
    try {
      const concept = concepts.find(c => c.id === conceptId);
      if (!concept) return;

      const { error } = await supabase
        .from('ai_tutor_concepts')
        .update({ is_bookmarked: !concept.is_bookmarked })
        .eq('id', conceptId);

      if (error) throw error;

      setConcepts(prev =>
        prev.map(c =>
          c.id === conceptId ? { ...c, is_bookmarked: !c.is_bookmarked } : c
        )
      );
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Concept History
          </CardTitle>
          <CardDescription>
            Review concepts you've learned
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search concepts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-3 py-2 rounded-md border"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredConcepts.map(concept => (
                <Card
                  key={concept.id}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-muted/50',
                    selectedConcept?.id === concept.id && 'bg-primary/10'
                  )}
                  onClick={() => setSelectedConcept(concept)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{concept.concept_name}</h4>
                      {concept.is_bookmarked && (
                        <BookmarkCheck className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{concept.subject}</Badge>
                      <Badge className={getDifficultyColor(concept.difficulty_level)}>
                        {concept.difficulty_level}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(concept.created_at), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};