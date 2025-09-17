import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Play, Pause, Square, Book, Clock, PenTool, Target } from "lucide-react";

const Study = () => {
  const [isStudying, setIsStudying] = useState(false);
  const [studyTime, setStudyTime] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [notes, setNotes] = useState("");

  const subjects = [
    { id: "math", name: "Mathematics", color: "bg-blue-500" },
    { id: "science", name: "Science", color: "bg-green-500" },
    { id: "history", name: "History", color: "bg-yellow-500" },
    { id: "english", name: "English", color: "bg-purple-500" },
  ];

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartStudy = () => {
    setIsStudying(true);
    // Timer logic would go here
  };

  const handlePauseStudy = () => {
    setIsStudying(false);
  };

  const handleStopStudy = () => {
    setIsStudying(false);
    setStudyTime(0);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Study Session 📚</h1>
          <p className="text-muted-foreground">Teddy is here to help you focus and learn!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Study Timer */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-center justify-center">
                <Clock className="h-6 w-6" />
                Study Timer
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="text-6xl font-mono font-bold text-primary">
                {formatTime(studyTime)}
              </div>
              
              <div className="flex justify-center gap-4">
                {!isStudying ? (
                  <Button size="lg" onClick={handleStartStudy} className="gap-2" disabled={!selectedSubject}>
                    <Play className="h-5 w-5" />
                    Start Study
                  </Button>
                ) : (
                  <Button size="lg" variant="secondary" onClick={handlePauseStudy} className="gap-2">
                    <Pause className="h-5 w-5" />
                    Pause
                  </Button>
                )}
                <Button size="lg" variant="outline" onClick={handleStopStudy} className="gap-2">
                  <Square className="h-5 w-5" />
                  Stop
                </Button>
              </div>

              {selectedSubject && (
                <div className="flex justify-center">
                  <Badge variant="secondary" className="text-lg py-2 px-4">
                    Studying: {subjects.find(s => s.id === selectedSubject)?.name}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Study Controls */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="h-5 w-5" />
                  Subject
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${subject.color}`} />
                          {subject.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Today's Goal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>1.5 / 3 hours</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full w-1/2" />
                  </div>
                  <p className="text-xs text-muted-foreground">Keep going! Teddy believes in you! 🧸</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Study Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Study Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Write down your thoughts, key concepts, or questions here... Teddy will help you review them later!"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[150px]"
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Study;