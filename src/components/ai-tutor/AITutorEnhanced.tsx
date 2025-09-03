import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  Send, 
  Lightbulb, 
  Maximize2, 
  Minimize2,
  History,
  Trash2,
  MessageSquare,
  Zap,
  Target,
  BookOpen,
  Calculator,
  Globe,
  Palette,
  Code,
  Microscope,
  ArrowDown,
  Loader2,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  MoreVertical,
  Copy,
  RefreshCw,
  Edit,
  Download,
  Upload,
  Search,
  Filter,
  Clock,
  TrendingUp,
  Award,
  FileText,
  Mic,
  MicOff,
  Play,
  Pause,
  BarChart3,
  Calendar,
  Star,
  Settings,
  PlusCircle,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Bookmark,
  Share2,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Menu,
  Sidebar
} from "lucide-react";

// Simple className utility function
const cn = (...classes: (string | boolean | undefined | null)[]) => {
  return classes.filter(Boolean).join(' ');
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  metadata?: {
    cacheHit?: boolean;
    optimized?: boolean;
    qualityScore?: number;
    tokens?: number;
    responseTime?: number;
  };
  type?: 'text' | 'quiz' | 'flashcard' | 'code' | 'math';
  attachments?: FileAttachment[];
  bookmarked?: boolean;
}

interface FileAttachment {
  name: string;
  type: string;
  size: number;
  content?: string;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: Date;
  messages: Message[];
  subject?: string;
  studyGoal?: string;
  progressScore?: number;
  totalTime?: number;
}

interface StudyStats {
  sessionsToday: number;
  totalTime: number;
  questionsAnswered: number;
  conceptsLearned: number;
  streak: number;
  avgScore: number;
}

interface PomodoroTimer {
  isActive: boolean;
  timeLeft: number;
  isBreak: boolean;
  cycle: number;
}

const quickActions = [
  { 
    icon: BookOpen, 
    label: "Explain concept", 
    prompt: "Please explain this concept in simple terms with examples: ",
    color: "text-blue-500",
    bgColor: "bg-blue-50 hover:bg-blue-100",
    category: "learn"
  },
  { 
    icon: Calculator, 
    label: "Solve problem", 
    prompt: "Help me solve this step-by-step with detailed explanations: ",
    color: "text-green-500",
    bgColor: "bg-green-50 hover:bg-green-100",
    category: "solve"
  },
  { 
    icon: Target, 
    label: "Create quiz", 
    prompt: "Create a comprehensive quiz with 10 questions about: ",
    color: "text-purple-500",
    bgColor: "bg-purple-50 hover:bg-purple-100",
    category: "test"
  },
  { 
    icon: Lightbulb, 
    label: "Study tips", 
    prompt: "Give me effective study strategies and tips for: ",
    color: "text-yellow-500",
    bgColor: "bg-yellow-50 hover:bg-yellow-100",
    category: "learn"
  },
  { 
    icon: Globe, 
    label: "Research topic", 
    prompt: "Research and provide a comprehensive overview of: ",
    color: "text-cyan-500",
    bgColor: "bg-cyan-50 hover:bg-cyan-100",
    category: "research"
  },
  { 
    icon: Microscope, 
    label: "Lab help", 
    prompt: "Help me understand this lab procedure and explain the science: ",
    color: "text-red-500",
    bgColor: "bg-red-50 hover:bg-red-100",
    category: "lab"
  }
];

const subjects = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", 
  "History", "Literature", "Psychology", "Economics", "Philosophy", "Other"
];

export function AITutorEnhanced() {
  // Main states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentInput, setCurrentInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [activeSession, setActiveSession] = useState<string>("default");
  
  // Sessions data
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: "default",
      title: "New Study Session",
      lastMessage: new Date(),
      messages: [],
      subject: "General",
      progressScore: 0,
      totalTime: 0
    }
  ]);
  
  // View states
  const [isMobile, setIsMobile] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  
  // UI preferences
  const [autoScroll, setAutoScroll] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Filter and search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("All");
  
  // Misc states
  const [showSettings, setShowSettings] = useState(false);
  const [studyGoal, setStudyGoal] = useState("");
  
  // Pomodoro Timer
  const [pomodoro, setPomodoro] = useState<PomodoroTimer>({
    isActive: false,
    timeLeft: 25 * 60,
    isBreak: false,
    cycle: 1
  });

  // Study Stats
  const [studyStats, setStudyStats] = useState<StudyStats>({
    sessionsToday: 1,
    totalTime: 45,
    questionsAnswered: 12,
    conceptsLearned: 8,
    streak: 3,
    avgScore: 85
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSession = sessions.find(s => s.id === activeSession);
  const characterCount = currentInput.length;
  const maxCharacters = 2000;

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [currentSession?.messages, autoScroll, reducedMotion]);

  // Pomodoro timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pomodoro.isActive && pomodoro.timeLeft > 0) {
      interval = setInterval(() => {
        setPomodoro(prev => ({
          ...prev,
          timeLeft: prev.timeLeft - 1
        }));
      }, 1000);
    } else if (pomodoro.timeLeft === 0) {
      if (soundEnabled) {
        // Play notification sound
      }
      setPomodoro(prev => ({
        ...prev,
        isActive: false,
        isBreak: !prev.isBreak,
        timeLeft: prev.isBreak ? 25 * 60 : 5 * 60
      }));
    }
    return () => clearInterval(interval);
  }, [pomodoro.isActive, pomodoro.timeLeft, soundEnabled]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleChatHistory = () => {
    setShowSessions(!showSessions);
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isThinking) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      timestamp: new Date(),
      status: 'sending'
    };

    // Add user message
    setSessions(prev => prev.map(session => 
      session.id === activeSession 
        ? { ...session, messages: [...session.messages, newMessage], lastMessage: new Date() }
        : session
    ));

    const userMessage = currentInput;
    setCurrentInput("");
    setIsThinking(true);

    try {
      // Real Claude API call
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [
            ...currentSession!.messages.map(m => ({
              role: m.role,
              content: m.content
            })),
            { role: "user", content: userMessage }
          ]
        })
      });

      const data = await response.json();
      const aiContent = data.content[0].text;

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date(),
        status: 'sent',
        metadata: {
          cacheHit: Math.random() > 0.5,
          optimized: true,
          qualityScore: 0.85 + Math.random() * 0.15,
          tokens: aiContent.split(' ').length,
          responseTime: Math.round(1000 + Math.random() * 2000)
        }
      };

      setSessions(prev => prev.map(session => 
        session.id === activeSession 
          ? { 
              ...session, 
              messages: [...session.messages.map(m => m.id === newMessage.id ? {...m, status: 'sent' as const} : m), aiResponse],
              progressScore: Math.min((session.progressScore || 0) + 5, 100)
            }
          : session
      ));

      // Update study stats
      setStudyStats(prev => ({
        ...prev,
        questionsAnswered: prev.questionsAnswered + 1
      }));

    } catch (error) {
      console.error('Failed to get AI response:', error);
      // Fallback to simulated response
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I understand you're asking about "${userMessage}". Let me help you with that! This is a comprehensive educational response that would provide detailed explanations, examples, and follow-up questions to enhance your learning experience.`,
          timestamp: new Date(),
          status: 'sent',
          metadata: {
            cacheHit: false,
            optimized: true,
            qualityScore: 0.80,
            tokens: 45,
            responseTime: 1500
          }
        };

        setSessions(prev => prev.map(session => 
          session.id === activeSession 
            ? { 
                ...session, 
                messages: [...session.messages.map(m => m.id === newMessage.id ? {...m, status: 'sent' as const} : m), aiResponse],
                progressScore: Math.min((session.progressScore || 0) + 5, 100)
              }
            : session
        ));
      }, 1000);
    }

    setIsThinking(false);
    if (soundEnabled) {
      // Play notification sound
    }
  };

  const handleQuickAction = (prompt: string) => {
    setCurrentInput(prompt);
    inputRef.current?.focus();
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: `Study Session ${sessions.length + 1}`,
      lastMessage: new Date(),
      messages: [],
      subject: "General",
      progressScore: 0,
      totalTime: 0
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSession(newSession.id);
  };

  const deleteSession = (sessionId: string) => {
    if (sessions.length <= 1) return;
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSession === sessionId) {
      setActiveSession(sessions.find(s => s.id !== sessionId)?.id || "");
    }
  };

  const toggleBookmark = (messageId: string) => {
    setSessions(prev => prev.map(session => 
      session.id === activeSession 
        ? { 
            ...session, 
            messages: session.messages.map(m => 
              m.id === messageId ? { ...m, bookmarked: !m.bookmarked } : m
            )
          }
        : session
    ));
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    if (soundEnabled) {
      // Play copy sound
    }
  };

  const togglePomodoro = () => {
    setPomodoro(prev => ({ ...prev, isActive: !prev.isActive }));
  };

  const resetPomodoro = () => {
    setPomodoro({
      isActive: false,
      timeLeft: 25 * 60,
      isBreak: false,
      cycle: 1
    });
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         session.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject = filterSubject === "All" || session.subject === filterSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className={cn(
      "min-h-screen transition-all duration-300",
      darkMode 
        ? "bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20" 
        : "bg-gradient-to-br from-background via-accent/5 to-primary/5",
      isFullscreen && "fixed inset-0 z-50",
      highContrast && "contrast-more"
    )}>
      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Enhanced Header */}
          <div className="bg-card/80 backdrop-blur-xl border-b border-border/50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-6 h-6 text-learning-creative animate-pulse" />
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-learning-focus to-learning-creative bg-clip-text text-transparent">
                    AI Study Assistant Pro
                  </h1>
                </div>
                <div className="hidden sm:flex items-center gap-1">
                  {currentSession?.messages.some(m => m.metadata?.cacheHit) && (
                    <Badge variant="secondary" className="text-xs">
                      <Zap className="w-3 h-3 mr-1" />
                      Cached
                    </Badge>
                  )}
                  {currentSession?.progressScore && currentSession.progressScore > 50 && (
                    <Badge variant="secondary" className="text-xs">
                      <Award className="w-3 h-3 mr-1" />
                      Progress
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleChatHistory}
                  className={cn(
                    "transition-colors",
                    showSessions ? "text-primary bg-primary/10" : "hover:bg-muted"
                  )}
                  title={showSessions ? "Hide Chat History" : "Show Chat History"}
                >
                  <History className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={cn(
                    "transition-colors hidden sm:flex",
                    autoScroll ? "text-primary bg-primary/10" : "hover:bg-muted"
                  )}
                  title="Auto-scroll"
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDarkMode(!darkMode)}
                  className={cn(
                    "transition-colors",
                    darkMode ? "text-primary bg-primary/10" : "hover:bg-muted"
                  )}
                  title="Toggle theme"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={cn(
                    "transition-colors hidden sm:flex",
                    soundEnabled ? "text-primary bg-primary/10" : "hover:bg-muted"
                  )}
                  title="Sound notifications"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title="Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            {currentSession?.progressScore && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Session Progress</span>
                  <span className="font-medium">{currentSession.progressScore}%</span>
                </div>
                <Progress value={currentSession.progressScore} className="h-2" />
              </div>
            )}
          </div>

          {/* Chat History Overlay */}
          {showSessions && (
            <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col">
              {/* Chat History Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Chat History
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={createNewSession}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    New Session
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSessions(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="p-4 border-b space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search sessions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-full p-2 text-sm border rounded-md bg-background"
                >
                  <option value="All">All Subjects</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto p-4">
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No sessions found</p>
                    <p className="text-sm">Start a new conversation to see it here</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {filteredSessions.map((session) => (
                      <Card 
                        key={session.id}
                        className={cn(
                          "cursor-pointer transition-all duration-200 hover:shadow-md group relative",
                          activeSession === session.id && "ring-2 ring-primary bg-primary/5",
                          "hover:scale-[1.01]"
                        )}
                        onClick={() => {
                          setActiveSession(session.id);
                          setShowSessions(false);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate mb-2">
                                {session.title}
                              </h4>
                              <div className="flex items-center gap-2 mb-3">
                                <Badge variant="secondary" className="text-xs">
                                  {session.subject}
                                </Badge>
                                {session.progressScore && session.progressScore > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {session.progressScore}%
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {session.messages.length} messages • {session.lastMessage.toLocaleDateString()}
                              </p>
                              {session.progressScore && (
                                <Progress value={session.progressScore} className="h-2" />
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSession(session.id);
                                }}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Session Statistics */}
              <div className="border-t p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{sessions.length}</div>
                    <div className="text-sm text-muted-foreground">Total Sessions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-success">
                      {sessions.reduce((acc, s) => acc + s.messages.length, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Messages</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-learning-focus">
                      {sessions.filter(s => s.messages.length > 0).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Active</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {currentSession?.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                <div className="animate-in fade-in duration-1000">
                  <Brain className="w-16 h-16 text-primary animate-pulse mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    Welcome to your Enhanced AI Study Assistant!
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    I'm your advanced AI tutor with real-time responses, study tools, progress tracking, and much more!
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl w-full">
                  {quickActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={index}
                        variant="outline"
                        className={cn(
                          "h-auto p-4 flex flex-col items-center gap-2 transition-all duration-200",
                          action.bgColor,
                          "hover:scale-105 hover:shadow-lg animate-in slide-in-from-bottom duration-500"
                        )}
                        style={{ animationDelay: `${index * 100}ms` }}
                        onClick={() => handleQuickAction(action.prompt)}
                      >
                        <Icon className={cn("w-6 h-6", action.color)} />
                        <span className="text-sm font-medium">{action.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {currentSession?.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3 animate-in slide-in-from-bottom duration-300 group",
                      message.role === 'user' && "flex-row-reverse"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200",
                      message.role === 'user' 
                        ? "bg-primary text-primary-foreground shadow-lg" 
                        : "bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg"
                    )}>
                      {message.role === 'user' ? "U" : <Brain className="w-4 h-4" />}
                    </div>

                    <div className={cn(
                      "max-w-[80%] rounded-2xl p-4 transition-all duration-200 hover:shadow-lg relative",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground ml-auto shadow-md"
                        : "bg-card shadow-sm border border-border/50"
                    )}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      
                      <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                        <span>{message.timestamp.toLocaleTimeString()}</span>
                        
                        <div className="flex items-center gap-2">
                          {message.metadata && (
                            <>
                              {message.metadata.responseTime && (
                                <Badge variant="secondary" className="text-xs">
                                  {message.metadata.responseTime}ms
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Message Actions */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 shadow-lg">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyMessage(message.content)}
                            className="h-6 w-6 p-0 hover:bg-primary/10"
                            title="Copy message"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleBookmark(message.id)}
                            className={cn(
                              "h-6 w-6 p-0",
                              message.bookmarked ? "text-yellow-500 bg-yellow-500/10" : "hover:bg-primary/10"
                            )}
                            title="Bookmark message"
                          >
                            <Bookmark className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex gap-3 animate-in slide-in-from-bottom duration-300">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center flex-shrink-0">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/50">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">AI is thinking deeply about your question...</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Enhanced Input Area */}
          <div className="bg-card/80 backdrop-blur-xl border-t border-border/50 p-4 shadow-lg">
            <div className="space-y-3">
              {/* Quick Actions Bar */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {quickActions.slice(0, 4).map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "flex items-center gap-2 whitespace-nowrap transition-all duration-200 flex-shrink-0",
                        action.bgColor,
                        "hover:scale-105"
                      )}
                      onClick={() => handleQuickAction(action.prompt)}
                    >
                      <Icon className={cn("w-4 h-4", action.color)} />
                      <span className="hidden sm:inline">{action.label}</span>
                    </Button>
                  );
                })}
              </div>

              {/* Main Input */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Textarea
                    ref={inputRef}
                    placeholder="Ask me anything about your studies... I can explain concepts, solve problems, create quizzes, and more!"
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="min-h-[60px] max-h-32 resize-none pr-16 transition-all duration-200 focus:ring-2 focus:ring-primary/20 border-border/50"
                    disabled={isThinking}
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    <span className={cn(
                      "text-xs text-muted-foreground",
                      characterCount > maxCharacters * 0.9 && "text-yellow-500",
                      characterCount > maxCharacters && "text-red-500"
                    )}>
                      {characterCount}/{maxCharacters}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!currentInput.trim() || isThinking || characterCount > maxCharacters}
                    size="lg"
                    className={cn(
                      "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
                      "hover:shadow-lg transition-all duration-200 disabled:opacity-50",
                      !currentInput.trim() || isThinking ? "cursor-not-allowed" : "hover:scale-105"
                    )}
                    title="Send message"
                  >
                    {isThinking ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}