// Re-export the enhanced version as the main AITutor component
export { AITutorEnhanced as AITutor } from './AITutorEnhanced';

// Keep the original implementation as AITutorLegacy for backward compatibility
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Trash2, Plus, BookOpen, Brain, Target, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { unifiedAIService, type Message, type AISession } from '@/services/unified-ai-service';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { useSubjects } from '@/hooks/useSubjects';

export function AITutorLegacy() {
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [currentSession, setCurrentSession] = useState<AISession | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { subjects, loading: subjectsLoading } = useSubjects();

  const [studyPlanForm, setStudyPlanForm] = useState({
    subject: '',
    topics: '',
    duration: ''
  });

  const [conceptForm, setConceptForm] = useState({
    subject: '',
    concept: '',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced'
  });

  const [practiceForm, setPracticeForm] = useState({
    subject: '',
    topic: '',
    difficulty: 'medium',
    count: '5'
  });

  const [generatedContent, setGeneratedContent] = useState<{
    studyPlan?: string;
    concept?: string;
    questions?: string[];
  }>({});

  useEffect(() => {
    const loadSessions = async () => {
      const allSessions = await unifiedAIService.loadSessions();
      setSessions(allSessions);
      if (allSessions.length > 0 && !currentSession) {
        setCurrentSession(allSessions[0]);
      }
    };
    loadSessions();
  }, [currentSession]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  const handleCreateSession = async () => {
    if (!selectedSubject) {
      toast({
        title: 'Subject Required',
        description: 'Please select a subject for your tutoring session.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const session = await unifiedAIService.createSession(selectedSubject, 'deepseek');
      setSessions([...sessions, session]);
      setCurrentSession(session);
      setSelectedSubject('');
      toast({
        title: 'Session Created',
        description: `New ${selectedSubject} tutoring session started with DeepSeek.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create session. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentSession || isLoading) return;

    setIsLoading(true);
    const message = inputMessage;
    setInputMessage('');

    try {
      const response = await unifiedAIService.sendMessage(currentSession.id, message);
      const updatedSession = unifiedAIService.getSession(currentSession.id);
      if (updatedSession) {
        setCurrentSession(updatedSession);
        setSessions(sessions.map(s => s.id === updatedSession.id ? updatedSession : s));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      // Set deleting state
      setDeletingSessionId(sessionId);
      
      // Delete from service (now returns a Promise)
      const success = await unifiedAIService.deleteSession(sessionId);
      
      if (success) {
        // Update local state - filter out the deleted session
        setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
        
        // If we're deleting the current session, clear it or switch to another
        if (currentSession?.id === sessionId) {
          const remainingSessions = sessions.filter(s => s.id !== sessionId);
          setCurrentSession(remainingSessions.length > 0 ? remainingSessions[0] : null);
        }
        
        toast({
          title: 'Session Deleted',
          description: 'The tutoring session has been removed successfully.'
        });
      } else {
        throw new Error('Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete session. Please try again.',
        variant: 'destructive'
      });
    } finally {
      // Clear deleting state
      setDeletingSessionId(null);
    }
  };

  const handleGenerateStudyPlan = async () => {
    const { subject, topics, duration } = studyPlanForm;
    if (!subject || !topics || !duration) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields for the study plan.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const plan = await unifiedAIService.sendMessage(
        currentSession?.id || 'temp',
        `Generate a study plan for ${subject} covering these topics: ${topics}. Duration: ${duration} days.`
      );
      const planContent = plan.content;
      setGeneratedContent({ ...generatedContent, studyPlan: planContent });
      toast({
        title: 'Study Plan Generated',
        description: 'Your personalized study plan is ready.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate study plan.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplainConcept = async () => {
    const { subject, concept, level } = conceptForm;
    if (!subject || !concept) {
      toast({
        title: 'Missing Information',
        description: 'Please provide subject and concept.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const explanation = await unifiedAIService.sendMessage(
        currentSession?.id || 'temp',
        `Explain the concept of ${concept} in ${subject} at ${level} level.`
      );
      const explanationContent = explanation.content;
      setGeneratedContent({ ...generatedContent, concept: explanationContent });
      toast({
        title: 'Concept Explained',
        description: 'The explanation is ready for you.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to explain concept.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuestions = async () => {
    const { subject, topic, difficulty, count } = practiceForm;
    if (!subject || !topic) {
      toast({
        title: 'Missing Information',
        description: 'Please provide subject and topic.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const questions = await unifiedAIService.sendMessage(
        currentSession?.id || 'temp',
        `Generate ${count} practice questions about ${topic} in ${subject} at ${difficulty} difficulty level.`
      );
      const questionsContent = questions.content;
      setGeneratedContent({ ...generatedContent, questions: [questionsContent] });
      toast({
        title: 'Questions Generated',
        description: `Practice questions created.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate questions.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI Tutor Assistant
          </CardTitle>
          <CardDescription>
            Get personalized tutoring, study plans, and practice questions powered by AI
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="chat" className="space-y-4">
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground">
            <TabsTrigger value="chat" className="inline-flex items-center whitespace-nowrap px-3 py-1.5">
              Chat Sessions
            </TabsTrigger>
            <TabsTrigger value="study-plan" className="inline-flex items-center whitespace-nowrap px-3 py-1.5">
              Study Plans
            </TabsTrigger>
            <TabsTrigger value="concepts" className="inline-flex items-center whitespace-nowrap px-3 py-1.5">
              Concepts
            </TabsTrigger>
            <TabsTrigger value="practice" className="inline-flex items-center whitespace-nowrap px-3 py-1.5">
              Practice
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="chat" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Sessions</CardTitle>
                <CardDescription>Your tutoring sessions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={subjectsLoading}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={subjectsLoading ? "Loading subjects..." : "Select subject"} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.length === 0 && !subjectsLoading ? (
                        <SelectItem value="general" disabled>
                          No subjects found. Add subjects in the Subjects page.
                        </SelectItem>
                      ) : (
                        subjects.map(subject => (
                          <SelectItem key={subject.id} value={subject.name}>
                            {subject.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleCreateSession} size="icon" disabled={subjectsLoading || subjects.length === 0}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {sessions.map(session => (
                      <Card
                        key={session.id}
                        className={`cursor-pointer transition-colors ${
                          currentSession?.id === session.id ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => setCurrentSession(session)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <Badge variant="outline" className="mb-1">
                                {session.subject}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(session.lastActive, { addSuffix: true })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {session.messages.length} messages
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={deletingSessionId === session.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(session.id);
                              }}
                            >
                              {deletingSessionId === session.id ? (
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-lg">
                  {currentSession ? `${currentSession.subject} Session` : 'Select or Create a Session'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentSession ? (
                  <div className="space-y-4">
                    <ScrollArea className="h-[400px] rounded-lg border p-4">
                      <div className="space-y-4">
                        {currentSession.messages.map((message, index) => (
                          <div
                            key={index}
                            className={`flex gap-3 ${
                              message.role === 'assistant' ? '' : 'justify-end'
                            }`}
                          >
                            {message.role === 'assistant' && (
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Bot className="h-4 w-4" />
                              </div>
                            )}
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                message.role === 'assistant'
                                  ? 'bg-muted'
                                  : 'bg-primary text-primary-foreground'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                              </p>
                            </div>
                            {message.role === 'user' && (
                              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                                <User className="h-4 w-4 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Ask your tutor a question..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        disabled={isLoading}
                      />
                      <Button onClick={handleSendMessage} disabled={isLoading}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Create a new session to start learning</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="study-plan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Generate Study Plan
              </CardTitle>
              <CardDescription>
                Create a personalized study plan for your learning goals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  value={studyPlanForm.subject}
                  onValueChange={(value) => setStudyPlanForm({ ...studyPlanForm, subject: value })}
                  disabled={subjectsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={subjectsLoading ? "Loading subjects..." : subjects.length === 0 ? "No subjects available" : "Select subject"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.length === 0 && !subjectsLoading ? (
                      <SelectItem value="general" disabled>
                        No subjects found. Add subjects in the Subjects page.
                      </SelectItem>
                    ) : (
                      subjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.name}>
                          {subject.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Topics (comma-separated)"
                  value={studyPlanForm.topics}
                  onChange={(e) => setStudyPlanForm({ ...studyPlanForm, topics: e.target.value })}
                />

                <Input
                  type="number"
                  placeholder="Study hours available"
                  value={studyPlanForm.duration}
                  onChange={(e) => setStudyPlanForm({ ...studyPlanForm, duration: e.target.value })}
                />
              </div>

              <Button onClick={handleGenerateStudyPlan} disabled={isLoading} className="w-full">
                Generate Study Plan
              </Button>

              {generatedContent.studyPlan && (
                <Card>
                  <CardContent className="pt-6">
                    <ScrollArea className="h-[400px]">
                      <div className="whitespace-pre-wrap text-sm">{generatedContent.studyPlan}</div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="concepts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Concept Explanation
              </CardTitle>
              <CardDescription>
                Get detailed explanations of any concept
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  value={conceptForm.subject}
                  onValueChange={(value) => setConceptForm({ ...conceptForm, subject: value })}
                  disabled={subjectsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={subjectsLoading ? "Loading subjects..." : subjects.length === 0 ? "No subjects available" : "Select subject"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.length === 0 && !subjectsLoading ? (
                      <SelectItem value="general" disabled>
                        No subjects found. Add subjects in the Subjects page.
                      </SelectItem>
                    ) : (
                      subjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.name}>
                          {subject.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Concept to explain"
                  value={conceptForm.concept}
                  onChange={(e) => setConceptForm({ ...conceptForm, concept: e.target.value })}
                />

                <Select
                  value={conceptForm.level}
                  onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => 
                    setConceptForm({ ...conceptForm, level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleExplainConcept} disabled={isLoading} className="w-full">
                Explain Concept
              </Button>

              {generatedContent.concept && (
                <Card>
                  <CardContent className="pt-6">
                    <ScrollArea className="h-[400px]">
                      <div className="whitespace-pre-wrap text-sm">{generatedContent.concept}</div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="practice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Practice Questions
              </CardTitle>
              <CardDescription>
                Generate practice questions to test your knowledge
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  value={practiceForm.subject}
                  onValueChange={(value) => setPracticeForm({ ...practiceForm, subject: value })}
                  disabled={subjectsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={subjectsLoading ? "Loading subjects..." : subjects.length === 0 ? "No subjects available" : "Select subject"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.length === 0 && !subjectsLoading ? (
                      <SelectItem value="general" disabled>
                        No subjects found. Add subjects in the Subjects page.
                      </SelectItem>
                    ) : (
                      subjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.name}>
                          {subject.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Topic"
                  value={practiceForm.topic}
                  onChange={(e) => setPracticeForm({ ...practiceForm, topic: e.target.value })}
                />

                <Select
                  value={practiceForm.difficulty}
                  onValueChange={(value) => setPracticeForm({ ...practiceForm, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  placeholder="Number of questions"
                  value={practiceForm.count}
                  onChange={(e) => setPracticeForm({ ...practiceForm, count: e.target.value })}
                  min="1"
                  max="20"
                />
              </div>

              <Button onClick={handleGenerateQuestions} disabled={isLoading} className="w-full">
                Generate Questions
              </Button>

              {generatedContent.questions && generatedContent.questions.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {generatedContent.questions.map((question, index) => (
                          <Card key={index}>
                            <CardContent className="pt-4">
                              <p className="text-sm">{question}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}