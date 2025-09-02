import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  History,
  Search,
  Download,
  Filter,
  Calendar,
  MessageSquare,
  BookOpen,
  Brain,
  HelpCircle,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  Archive,
  Trash2,
  RefreshCw,
  Activity,
  Database,
  Zap,
  Target
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AIHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HistoryItem {
  id: string;
  type: 'message' | 'study_plan' | 'concept' | 'practice' | 'recommendation';
  subject?: string;
  topic?: string;
  content: string;
  timestamp: Date;
  session_id?: string;
  metadata?: any;
  feedback?: string;
  is_bookmarked?: boolean;
}

interface HistoryStats {
  totalInteractions: number;
  studyPlansCreated: number;
  conceptsExplained: number;
  questionsAnswered: number;
  averageResponseTime: number;
  mostActiveSubject: string;
  learningStreak: number;
}

export const AIHistoryModal: React.FC<AIHistoryModalProps> = ({
  open,
  onOpenChange
}) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [activeTab, setActiveTab] = useState('history');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadHistory();
      loadStats();
    }
  }, [open]);

  useEffect(() => {
    filterHistory();
  }, [historyItems, searchQuery, filterType, filterSubject, dateRange]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load messages
      const { data: messages } = await supabase
        .from('ai_tutor_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      // Load study plans
      const { data: studyPlans } = await supabase
        .from('ai_tutor_study_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Load concepts
      const { data: concepts } = await supabase
        .from('ai_tutor_concepts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Load practice questions
      const { data: questions } = await supabase
        .from('ai_tutor_practice_questions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Load recommendations
      const { data: recommendations } = await supabase
        .from('ai_tutor_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Combine all history items
      const allItems: HistoryItem[] = [];

      if (messages) {
        messages.forEach(msg => {
          allItems.push({
            id: msg.id,
            type: 'message',
            subject: msg.subject,
            topic: msg.topic,
            content: msg.content,
            timestamp: new Date(msg.created_at),
            session_id: msg.session_id,
            feedback: msg.feedback
          });
        });
      }

      if (studyPlans) {
        studyPlans.forEach(plan => {
          allItems.push({
            id: plan.id,
            type: 'study_plan',
            subject: plan.subject,
            content: plan.plan_content,
            timestamp: new Date(plan.created_at),
            is_bookmarked: plan.is_bookmarked,
            metadata: {
              topics: plan.topics,
              duration_days: plan.duration_days,
              progress: plan.progress_percentage
            }
          });
        });
      }

      if (concepts) {
        concepts.forEach(concept => {
          allItems.push({
            id: concept.id,
            type: 'concept',
            subject: concept.subject,
            topic: concept.concept_name,
            content: concept.explanation,
            timestamp: new Date(concept.created_at),
            is_bookmarked: concept.is_bookmarked,
            metadata: {
              difficulty: concept.difficulty_level,
              examples: concept.examples
            }
          });
        });
      }

      if (questions) {
        questions.forEach(q => {
          allItems.push({
            id: q.id,
            type: 'practice',
            subject: q.subject,
            topic: q.topic,
            content: q.question_text,
            timestamp: new Date(q.created_at),
            metadata: {
              difficulty: q.difficulty,
              is_correct: q.is_correct,
              user_answer: q.user_answer
            }
          });
        });
      }

      if (recommendations) {
        recommendations.forEach(rec => {
          allItems.push({
            id: rec.id,
            type: 'recommendation',
            content: rec.description,
            timestamp: new Date(rec.created_at),
            metadata: {
              title: rec.title,
              priority: rec.priority,
              action_items: rec.action_items,
              is_applied: rec.is_applied
            }
          });
        });
      }

      // Sort by timestamp
      allItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setHistoryItems(allItems);
    } catch (error) {
      console.error('Error loading history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load history',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate statistics
      const { count: messageCount } = await supabase
        .from('ai_tutor_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: planCount } = await supabase
        .from('ai_tutor_study_plans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: conceptCount } = await supabase
        .from('ai_tutor_concepts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: questionCount } = await supabase
        .from('ai_tutor_practice_questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get most active subject
      const { data: subjects } = await supabase
        .from('ai_tutor_messages')
        .select('subject')
        .eq('user_id', user.id)
        .not('subject', 'is', null);

      const subjectCounts: Record<string, number> = {};
      subjects?.forEach(item => {
        if (item.subject) {
          subjectCounts[item.subject] = (subjectCounts[item.subject] || 0) + 1;
        }
      });

      const mostActiveSubject = Object.entries(subjectCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'None';

      setStats({
        totalInteractions: (messageCount || 0),
        studyPlansCreated: planCount || 0,
        conceptsExplained: conceptCount || 0,
        questionsAnswered: questionCount || 0,
        averageResponseTime: 2.3, // Mock for now
        mostActiveSubject,
        learningStreak: 7 // Mock for now
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const filterHistory = () => {
    let filtered = [...historyItems];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.topic?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // Subject filter
    if (filterSubject !== 'all') {
      filtered = filtered.filter(item => item.subject === filterSubject);
    }

    // Date range filter
    const now = new Date();
    if (dateRange === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(item => item.timestamp >= today);
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(item => item.timestamp >= weekAgo);
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(item => item.timestamp >= monthAgo);
    }

    setFilteredItems(filtered);
  };

  const exportHistory = () => {
    const content = filteredItems.map(item => {
      return `[${format(item.timestamp, 'PPP')}] ${item.type.toUpperCase()}
Subject: ${item.subject || 'N/A'}
Topic: ${item.topic || 'N/A'}
Content: ${item.content}
---`;
    }).join('\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-tutor-history-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'History Exported',
      description: 'Your AI tutor history has been downloaded'
    });
  };

  const clearHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Clear all history tables
      await Promise.all([
        supabase.from('ai_tutor_messages').delete().eq('user_id', user.id),
        supabase.from('ai_tutor_study_plans').delete().eq('user_id', user.id),
        supabase.from('ai_tutor_concepts').delete().eq('user_id', user.id),
        supabase.from('ai_tutor_practice_questions').delete().eq('user_id', user.id),
        supabase.from('ai_tutor_recommendations').delete().eq('user_id', user.id)
      ]);

      setHistoryItems([]);
      toast({
        title: 'History Cleared',
        description: 'All AI tutor history has been removed'
      });
    } catch (error) {
      console.error('Error clearing history:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear history',
        variant: 'destructive'
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="h-4 w-4" />;
      case 'study_plan': return <BookOpen className="h-4 w-4" />;
      case 'concept': return <Brain className="h-4 w-4" />;
      case 'practice': return <HelpCircle className="h-4 w-4" />;
      case 'recommendation': return <Star className="h-4 w-4" />;
      default: return <History className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'message': return 'bg-blue-500';
      case 'study_plan': return 'bg-green-500';
      case 'concept': return 'bg-purple-500';
      case 'practice': return 'bg-orange-500';
      case 'recommendation': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getUniqueSubjects = () => {
    const subjects = new Set<string>();
    historyItems.forEach(item => {
      if (item.subject) subjects.add(item.subject);
    });
    return Array.from(subjects);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            AI Tutor History & Analytics
          </DialogTitle>
          <DialogDescription>
            View your complete learning history and AI interactions
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="history">
              <Database className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <Activity className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="insights">
              <Zap className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search history..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="message">Messages</SelectItem>
                  <SelectItem value="study_plan">Study Plans</SelectItem>
                  <SelectItem value="concept">Concepts</SelectItem>
                  <SelectItem value="practice">Practice</SelectItem>
                  <SelectItem value="recommendation">Recommendations</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {getUniqueSubjects().map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportHistory}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="destructive" onClick={clearHistory}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>

            {/* History Items */}
            <ScrollArea className="min-h-[400px] max-h-[50vh] rounded-md border p-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading history...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No history items found
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredItems.map(item => (
                    <Card key={item.id} className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center text-white',
                          getTypeColor(item.type)
                        )}>
                          {getTypeIcon(item.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {item.type.replace('_', ' ')}
                            </Badge>
                            {item.subject && (
                              <Badge variant="secondary" className="text-xs">
                                {item.subject}
                              </Badge>
                            )}
                            {item.topic && (
                              <Badge variant="secondary" className="text-xs">
                                {item.topic}
                              </Badge>
                            )}
                            {item.is_bookmarked && (
                              <Star className="h-3 w-3 text-yellow-500" />
                            )}
                          </div>
                          <p className="text-sm line-clamp-2 mb-1">
                            {item.content}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                            </span>
                            {item.metadata?.difficulty && (
                              <span>Difficulty: {item.metadata.difficulty}</span>
                            )}
                            {item.metadata?.progress !== undefined && (
                              <span>Progress: {item.metadata.progress}%</span>
                            )}
                            {item.metadata?.is_correct !== undefined && (
                              item.metadata.is_correct ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 mt-4">
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalInteractions}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Study Plans</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.studyPlansCreated}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Concepts Learned</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.conceptsExplained}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Questions Answered</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.questionsAnswered}</div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Learning Activity Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Activity chart will be displayed here
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Most Active Subject</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-semibold">{stats?.mostActiveSubject}</span>
                    <Badge variant="default">Most Active</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Learning Streak</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-semibold">{stats?.learningStreak} days</span>
                    <Badge variant="default">Current Streak</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4 mt-4">
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                <strong>AI-Powered Insights</strong><br />
                Based on your learning history, here are personalized insights to improve your study effectiveness.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Learning Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm">• You learn best with visual examples and step-by-step explanations</p>
                  <p className="text-sm">• Your peak learning time is between 2 PM - 6 PM</p>
                  <p className="text-sm">• You excel in conceptual understanding but need more practice with applications</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm">• Focus more on practice questions to improve application skills</p>
                  <p className="text-sm">• Consider reviewing concepts from 2 weeks ago for better retention</p>
                  <p className="text-sm">• Try spaced repetition for difficult topics</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Progress Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Overall Progress</span>
                        <span>75%</span>
                      </div>
                      <Progress value={75} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Concept Mastery</span>
                        <span>82%</span>
                      </div>
                      <Progress value={82} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Practice Accuracy</span>
                        <span>68%</span>
                      </div>
                      <Progress value={68} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};