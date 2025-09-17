import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAITutor } from "@/hooks/useAITutor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Plus, Clock, Book, Brain, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { format, addMonths, subMonths, startOfDay, addDays } from "date-fns";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  event_date: string;
  event_time?: string | null;
  event_type: string;
  subject_id?: string | null;
  user_id: string;
  completed: boolean | null;
}

const Calendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendMessage } = useAITutor();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_date: format(new Date(), "yyyy-MM-dd"),
    event_time: "",
    event_type: "study" as const,
    subject_id: "",
  });

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user, currentMonth]);

  const loadEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const startOfMonth = startOfDay(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
      const endOfMonth = startOfDay(addDays(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0), 1));

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', format(startOfMonth, 'yyyy-MM-dd'))
        .lt('event_date', format(endOfMonth, 'yyyy-MM-dd'))
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents((data || []).map(event => ({
        ...event,
        description: event.description || undefined,
      })));
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async () => {
    if (!user || !newEvent.title.trim()) return;

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          ...newEvent,
          user_id: user.id,
          completed: false,
        })
        .select()
        .single();

      if (error) throw error;

      setEvents(prev => [...prev, { ...data, description: data.description || undefined }]);
      setNewEvent({
        title: "",
        description: "",
        event_date: format(new Date(), "yyyy-MM-dd"),
        event_time: "",
        event_type: "study",
        subject_id: "",
      });
      setIsAddEventOpen(false);

      toast({
        title: "Success",
        description: "Event created successfully! 🧸",
      });
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;

      setEvents(prev => prev.filter(event => event.id !== eventId));
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    }
  };

  const toggleEventCompletion = async (eventId: string, completed: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ completed: !completed })
        .eq('id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;

      setEvents(prev => prev.map(event => 
        event.id === eventId ? { ...event, completed: !completed } : event
      ));

      toast({
        title: "Success",
        description: completed ? "Event marked as pending" : "Event completed! 🎉",
      });
    } catch (error) {
      console.error('Error updating event:', error);
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    }
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      format(new Date(event.event_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const requestAIScheduling = async () => {
    const eventsContext = events.map(event => 
      `${event.title} on ${event.event_date} (${event.event_type})`
    ).join(', ');

    await sendMessage(
      `I need help organizing my study schedule. Here are my current events: ${eventsContext}. Can you suggest a better study plan and help me prioritize my tasks for better learning outcomes?`,
      { subject: 'Study Planning', difficulty: 'intermediate' }
    );

    setIsAIAssistantOpen(false);
    toast({
      title: "AI Assistance Requested",
      description: "Teddy is analyzing your schedule! Check the AI Tutor tab for personalized recommendations. 🧸",
    });
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'exam': return 'destructive';
      case 'deadline': return 'secondary';
      case 'assignment': return 'outline';
      default: return 'default';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'exam': return '📝';
      case 'deadline': return '⏰';
      case 'assignment': return '📋';
      default: return '📚';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Study Calendar 📅</h1>
            <p className="text-muted-foreground">Plan your study sessions with Teddy's smart scheduling</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAIAssistantOpen} onOpenChange={setIsAIAssistantOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Brain className="h-4 w-4" />
                  AI Schedule Helper
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>🧸 Teddy's Schedule Assistant</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Let Teddy analyze your calendar and create a personalized study plan that maximizes your learning efficiency!
                  </p>
                  <div className="bg-secondary p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Teddy can help you:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Optimize study session timing</li>
                      <li>• Balance subjects effectively</li>
                      <li>• Schedule breaks and reviews</li>
                      <li>• Prioritize upcoming deadlines</li>
                      <li>• Create personalized study plans</li>
                    </ul>
                  </div>
                  <Button onClick={requestAIScheduling} className="w-full">
                    Get Personalized Study Plan
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Event Title</Label>
                    <Input
                      id="title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                      placeholder="e.g., Math Study Session"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                      placeholder="Additional details..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newEvent.event_date}
                        onChange={(e) => setNewEvent({...newEvent, event_date: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="time">Time (Optional)</Label>
                      <Input
                        id="time"
                        type="time"
                        value={newEvent.event_time}
                        onChange={(e) => setNewEvent({...newEvent, event_time: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Event Type</Label>
                    <Select
                      value={newEvent.event_type}
                      onValueChange={(value: any) => 
                        setNewEvent({...newEvent, event_type: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="study">📚 Study Session</SelectItem>
                        <SelectItem value="exam">📝 Exam</SelectItem>
                        <SelectItem value="deadline">⏰ Deadline</SelectItem>
                        <SelectItem value="assignment">📋 Assignment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={createEvent} className="w-full">
                    Create Event
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  🧸 {format(currentMonth, "MMMM yyyy")}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="w-full"
                modifiers={{
                  hasEvents: events.map(event => new Date(event.event_date))
                }}
                modifiersStyles={{
                  hasEvents: { 
                    backgroundColor: 'hsl(var(--primary) / 0.1)',
                    color: 'hsl(var(--primary))',
                    fontWeight: 'bold'
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* Events Sidebar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {selectedDate ? format(selectedDate, "MMM dd") : "Today's"} Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : selectedDate && getEventsForDate(selectedDate).length > 0 ? (
                getEventsForDate(selectedDate).map((event) => (
                  <div key={event.id} className={`p-3 border rounded-lg space-y-2 ${event.completed ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getEventTypeIcon(event.event_type)}</span>
                        <h4 className={`font-medium ${event.completed ? 'line-through' : ''}`}>
                          {event.title}
                        </h4>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEventCompletion(event.id, event.completed || false)}
                        >
                          {event.completed ? '↩️' : '✅'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEvent(event.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant={getEventTypeColor(event.event_type)}>
                        {event.event_type}
                      </Badge>
                      {event.event_time && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {event.event_time}
                        </p>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No events scheduled</p>
                  <p className="text-sm">Let Teddy help you plan your studies!</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setIsAIAssistantOpen(true)}
                  >
                    Get AI Suggestions
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events
                .filter(event => new Date(event.event_date) >= startOfDay(new Date()) && !event.completed)
                .slice(0, 6)
                .map((event) => (
                  <div key={event.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getEventTypeIcon(event.event_type)}</span>
                      <h4 className="font-medium">{event.title}</h4>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant={getEventTypeColor(event.event_type)}>
                        {event.event_type}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.event_date), "MMM dd")}
                      </p>
                    </div>
                  </div>
                ))}
              {events.filter(event => new Date(event.event_date) >= startOfDay(new Date()) && !event.completed).length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <p>All caught up! 🎉</p>
                  <p className="text-sm">No upcoming events. Great job staying organized!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Calendar;