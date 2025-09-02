import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  Bookmark, 
  BookmarkCheck,
  Clock,
  Target,
  ChevronRight,
  Eye,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StudyPlan {
  id: string;
  subject: string;
  topics: string[];
  duration_days: number;
  plan_content: string;
  progress_percentage: number;
  is_active: boolean;
  is_bookmarked: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export const StudyPlanHistory: React.FC = () => {
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<StudyPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadStudyPlans();
  }, []);

  useEffect(() => {
    filterPlans();
  }, [studyPlans, searchQuery, filterSubject, showBookmarked]);

  const loadStudyPlans = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_tutor_study_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStudyPlans(data || []);
    } catch (error) {
      console.error('Error loading study plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load study plans',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterPlans = () => {
    let filtered = [...studyPlans];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(plan =>
        plan.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Subject filter
    if (filterSubject !== 'all') {
      filtered = filtered.filter(plan => plan.subject === filterSubject);
    }

    // Bookmark filter
    if (showBookmarked) {
      filtered = filtered.filter(plan => plan.is_bookmarked);
    }

    setFilteredPlans(filtered);
  };

  const toggleBookmark = async (planId: string) => {
    try {
      const plan = studyPlans.find(p => p.id === planId);
      if (!plan) return;

      const { error } = await supabase
        .from('ai_tutor_study_plans')
        .update({ is_bookmarked: !plan.is_bookmarked })
        .eq('id', planId);

      if (error) throw error;

      setStudyPlans(plans =>
        plans.map(p =>
          p.id === planId ? { ...p, is_bookmarked: !p.is_bookmarked } : p
        )
      );

      toast({
        title: plan.is_bookmarked ? 'Bookmark removed' : 'Bookmarked',
        description: plan.is_bookmarked 
          ? 'Study plan removed from bookmarks' 
          : 'Study plan added to bookmarks'
      });
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast({
        title: 'Error',
        description: 'Failed to update bookmark',
        variant: 'destructive'
      });
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('ai_tutor_study_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      setStudyPlans(plans => plans.filter(p => p.id !== planId));
      if (selectedPlan?.id === planId) {
        setSelectedPlan(null);
      }

      toast({
        title: 'Plan deleted',
        description: 'Study plan has been removed'
      });
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete plan',
        variant: 'destructive'
      });
    }
  };

  const exportPlan = (plan: StudyPlan) => {
    const content = `# Study Plan: ${plan.subject}

**Created:** ${format(new Date(plan.created_at), 'PPP')}
**Duration:** ${plan.duration_days} days
**Topics:** ${plan.topics.join(', ')}
**Progress:** ${plan.progress_percentage}%

## Plan Details

${plan.plan_content}`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-plan-${plan.subject}-${format(new Date(plan.created_at), 'yyyy-MM-dd')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Plan exported',
      description: 'Study plan downloaded as Markdown file'
    });
  };

  const getUniqueSubjects = () => {
    return Array.from(new Set(studyPlans.map(plan => plan.subject)));
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Study Plan History
          </CardTitle>
          <CardDescription>
            View and manage your generated study plans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search plans..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background"
            >
              <option value="all">All Subjects</option>
              {getUniqueSubjects().map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            <Button
              variant={showBookmarked ? 'default' : 'outline'}
              onClick={() => setShowBookmarked(!showBookmarked)}
            >
              {showBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              <span className="ml-2">Bookmarked</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plan List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plans ({filteredPlans.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading plans...
                  </div>
                ) : filteredPlans.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No study plans found
                  </div>
                ) : (
                  filteredPlans.map(plan => (
                    <Card
                      key={plan.id}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-muted/50',
                        selectedPlan?.id === plan.id && 'bg-primary/10 border-primary'
                      )}
                      onClick={() => setSelectedPlan(plan)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{plan.subject}</Badge>
                              {plan.is_active && (
                                <Badge variant="default" className="bg-green-600">Active</Badge>
                              )}
                              {plan.is_bookmarked && (
                                <BookmarkCheck className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <p className="text-sm font-medium mb-1">
                              {plan.topics.slice(0, 3).join(', ')}
                              {plan.topics.length > 3 && '...'}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {plan.duration_days} days
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(plan.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            {plan.progress_percentage > 0 && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span>Progress</span>
                                  <span>{plan.progress_percentage}%</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-1.5">
                                  <div
                                    className="bg-primary rounded-full h-1.5 transition-all"
                                    style={{ width: `${plan.progress_percentage}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Plan Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plan Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPlan ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">{selectedPlan.subject} Study Plan</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedPlan.topics.map((topic, index) => (
                      <Badge key={index} variant="secondary">{topic}</Badge>
                    ))}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Created: {format(new Date(selectedPlan.created_at), 'PPP')}</p>
                  <p>Duration: {selectedPlan.duration_days} days</p>
                  {selectedPlan.completed_at && (
                    <p>Completed: {format(new Date(selectedPlan.completed_at), 'PPP')}</p>
                  )}
                </div>

                <ScrollArea className="h-[250px] rounded-md border p-4">
                  <div className="whitespace-pre-wrap text-sm">
                    {selectedPlan.plan_content}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleBookmark(selectedPlan.id)}
                  >
                    {selectedPlan.is_bookmarked ? (
                      <BookmarkCheck className="h-4 w-4" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                    <span className="ml-2">
                      {selectedPlan.is_bookmarked ? 'Bookmarked' : 'Bookmark'}
                    </span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportPlan(selectedPlan)}
                  >
                    <Download className="h-4 w-4" />
                    <span className="ml-2">Export</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deletePlan(selectedPlan.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="ml-2">Delete</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a study plan to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};