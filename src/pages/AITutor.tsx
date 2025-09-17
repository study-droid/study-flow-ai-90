import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAITutor } from "@/hooks/useAITutor";
import { Send, Brain, BookOpen, Lightbulb, HelpCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AITutor = () => {
  const { toast } = useToast();
  const {
    currentSession,
    messages,
    isLoading,
    error,
    createSession,
    sendMessage,
    clearChat,
  } = useAITutor();
  const [input, setInput] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  useEffect(() => {
    if (!currentSession) {
      createSession();
    }
  }, [currentSession, createSession]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const quickQuestions = [
    "Help me with math homework",
    "Explain photosynthesis",
    "What is the Civil War?",
    "Grammar rules in English",
  ];

  const subjects = [
    { name: "Mathematics", icon: "🔢", color: "bg-blue-100 text-blue-800" },
    { name: "Science", icon: "🔬", color: "bg-green-100 text-green-800" },
    { name: "History", icon: "📜", color: "bg-yellow-100 text-yellow-800" },
    { name: "English", icon: "📝", color: "bg-purple-100 text-purple-800" },
    { name: "Geography", icon: "🌍", color: "bg-teal-100 text-teal-800" },
    { name: "Art", icon: "🎨", color: "bg-pink-100 text-pink-800" },
  ];

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    await sendMessage(input, {
      subject: selectedSubject || undefined,
      difficulty: 'intermediate',
    });
    setInput("");
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  const handleSubjectSelect = (subject: string) => {
    setSelectedSubject(subject);
    toast({
      title: "Subject Selected",
      description: `Now focusing on ${subject}. Your responses will be tailored to this subject!`,
    });
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">AI Tutor Teddy 🧸</h1>
            <p className="text-muted-foreground">
              Your friendly study companion powered by DeepSeek AI
              {selectedSubject && ` - Currently focused on ${selectedSubject}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={clearChat} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              New Chat
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
          {/* Chat Area */}
          <Card className="lg:col-span-3 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Chat with Teddy
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1 pr-4 mb-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          message.role === 'user'
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">🧸</span>
                            <span className="font-medium text-sm">Teddy</span>
                          </div>
                        )}
                        {message.isTyping ? (
                          <div className="flex gap-1 mt-1">
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-100" />
                            <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-200" />
                          </div>
                        ) : (
                          <>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {message.timestamp.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Ask Teddy anything about your studies..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={!input.trim() || isLoading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Questions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <HelpCircle className="h-4 w-4" />
                  Quick Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full text-left h-auto p-2 text-xs"
                    onClick={() => handleQuickQuestion(question)}
                  >
                    {question}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Subjects */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4" />
                  Subjects
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {subjects.map((subject) => (
                  <Badge
                    key={subject.name}
                    variant={selectedSubject === subject.name ? "default" : "secondary"}
                    className={`w-full justify-start gap-2 py-2 cursor-pointer hover:opacity-80 ${
                      selectedSubject === subject.name ? '' : subject.color
                    }`}
                    onClick={() => handleSubjectSelect(subject.name)}
                  >
                    <span>{subject.icon}</span>
                    <span className="text-xs">{subject.name}</span>
                  </Badge>
                ))}
              </CardContent>
            </Card>

            {/* Study Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Lightbulb className="h-4 w-4" />
                  Study Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-xs space-y-1">
                    <p className="font-medium">💡 Break it down</p>
                    <p className="text-muted-foreground">Complex topics are easier when split into smaller parts.</p>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-medium">🔄 Practice regularly</p>
                    <p className="text-muted-foreground">Regular review helps information stick better.</p>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-medium">❓ Ask questions</p>
                    <p className="text-muted-foreground">Never hesitate to ask when you don't understand!</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AITutor;