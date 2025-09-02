import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Download,
  Upload,
  Grid3x3,
  List,
  Clock,
  MapPin,
  Users,
  Tag,
  Bell,
  Repeat,
  Edit2,
  Trash2,
  MoreVertical,
  Sun,
  Moon,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  LayoutGrid,
  LayoutList
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek,
  endOfWeek,
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  getWeek,
  getMonth,
  getYear,
  addDays,
  isWeekend,
  isSameWeek
} from 'date-fns';
import { cn } from '@/lib/utils';
import { calendarService, type CalendarEvent } from '@/services/calendar/calendarService';
import { useCalendarSync } from '@/hooks/useCalendarSync';
import { useToast } from '@/hooks/use-toast';
import { CreateEventDialog } from '@/components/calendar/CreateEventDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ViewMode = 'month' | 'week' | 'day' | 'agenda';

export default function Calendar() {
  const location = useLocation();
  const navigationState = location.state as { selectedDate?: string; selectedEvent?: CalendarEvent } | null;
  
  // Initialize dates based on navigation state
  const initialDate = navigationState?.selectedDate ? new Date(navigationState.selectedDate) : new Date();
  
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredType, setFilteredType] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDayDetailsDialog, setShowDayDetailsDialog] = useState(false);
  const [selectedDayForDetails, setSelectedDayForDetails] = useState<Date | null>(null);
  const { toast } = useToast();
  const { syncCalendarEvents, isSyncing } = useCalendarSync();

  // Subscribe to calendar events
  useEffect(() => {
    const unsubscribe = calendarService.subscribe(setEvents);
    return unsubscribe;
  }, []);

  // Sync on mount
  useEffect(() => {
    syncCalendarEvents();
  }, []);

  // Handle navigation from calendar widget
  useEffect(() => {
    if (navigationState?.selectedDate) {
      const navDate = new Date(navigationState.selectedDate);
      setSelectedDate(navDate);
      setCurrentDate(navDate);
      
      // Show toast notification
      toast({
        title: "Date Selected",
        description: `Viewing ${format(navDate, 'MMMM d, yyyy')}`,
      });
    }
  }, []);

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDayForDetails(date);
    setShowDayDetailsDialog(true);
  };

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'study': return 'bg-blue-500';
      case 'assignment': return 'bg-yellow-500';
      case 'exam': return 'bg-red-500';
      case 'quiz': return 'bg-purple-500';
      case 'flashcard': return 'bg-indigo-500';
      case 'reminder': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'study': return '📚';
      case 'assignment': return '📝';
      case 'exam': return '📋';
      case 'quiz': return '🧠';
      case 'flashcard': return '🎯';
      case 'reminder': return '🔔';
      default: return '📅';
    }
  };

  const filteredEvents = filteredType === 'all' 
    ? events 
    : events.filter(e => e.type === filteredType);

  // Navigation functions
  const navigatePrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <CalendarIcon className="h-8 w-8 text-primary" />
                Calendar
              </h1>
              <p className="text-muted-foreground">
                Manage your schedule, events, and deadlines in one place
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await syncCalendarEvents();
                  toast({
                    title: "Calendar Synced",
                    description: "All events have been updated",
                  });
                }}
                disabled={isSyncing}
              >
                <Upload className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
                Sync
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Event Type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {['all', 'study', 'assignment', 'exam', 'quiz', 'flashcard', 'reminder'].map(type => (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => setFilteredType(type)}
                    >
                      {type === 'all' ? 'All Events' : type.charAt(0).toUpperCase() + type.slice(1)}
                      {filteredType === type && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-primary to-primary-glow"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* View Mode Selector */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList className="bg-muted/30">
                  <TabsTrigger 
                    value="day" 
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary hover:bg-muted transition-colors"
                  >
                    <CalendarCheck className="h-3 w-3 mr-1.5" />
                    Day
                  </TabsTrigger>
                  <TabsTrigger 
                    value="week" 
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary hover:bg-muted transition-colors"
                  >
                    <CalendarDays className="h-3 w-3 mr-1.5" />
                    Week
                  </TabsTrigger>
                  <TabsTrigger 
                    value="month" 
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary hover:bg-muted transition-colors"
                  >
                    <CalendarIcon className="h-3 w-3 mr-1.5" />
                    Month
                  </TabsTrigger>
                  <TabsTrigger 
                    value="agenda" 
                    className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary hover:bg-muted transition-colors"
                  >
                    <LayoutList className="h-3 w-3 mr-1.5" />
                    Agenda
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateToday}
                >
                  Today
                </Button>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={navigatePrevious}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="min-w-[180px] text-center">
                    <div className="text-lg font-bold bg-gradient-to-r from-primary to-focus bg-clip-text text-transparent">
                      {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
                      {viewMode === 'week' && `Week ${getWeek(currentDate)}, ${getYear(currentDate)}`}
                      {viewMode === 'day' && format(currentDate, 'EEEE')}
                      {viewMode === 'agenda' && format(currentDate, 'MMMM yyyy')}
                    </div>
                    {viewMode === 'day' && (
                      <div className="text-xs text-muted-foreground">
                        {format(currentDate, 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={navigateNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* View Options */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Views */}
        <Card className="study-flow-shadow-soft overflow-hidden border-0 shadow-xl">
          <CardContent className="p-4">
            {viewMode === 'month' && (
              <MonthView
                currentDate={currentDate}
                selectedDate={selectedDate}
                events={filteredEvents}
                onDateSelect={setSelectedDate}
                onDayClick={handleDayClick}
                getEventTypeColor={getEventTypeColor}
              />
            )}
            
            {viewMode === 'week' && (
              <WeekView
                currentDate={currentDate}
                selectedDate={selectedDate}
                events={filteredEvents}
                onDateSelect={setSelectedDate}
                getEventTypeColor={getEventTypeColor}
              />
            )}
            
            {viewMode === 'day' && (
              <DayView
                currentDate={currentDate}
                events={filteredEvents.filter(e => isSameDay(e.date, currentDate))}
                getEventTypeColor={getEventTypeColor}
              />
            )}
            
            {viewMode === 'agenda' && (
              <AgendaView
                events={filteredEvents}
                getEventTypeColor={getEventTypeColor}
              />
            )}
          </CardContent>
        </Card>

        {/* Create Event Dialog */}
        <CreateEventDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          initialDate={selectedDate}
        />

        {/* Day Details Dialog */}
        <DayDetailsDialog
          open={showDayDetailsDialog}
          onOpenChange={setShowDayDetailsDialog}
          date={selectedDayForDetails}
          events={selectedDayForDetails ? getEventsForDate(selectedDayForDetails) : []}
          getEventTypeColor={getEventTypeColor}
          getEventIcon={getEventIcon}
          onAddEvent={() => {
            if (selectedDayForDetails) {
              setSelectedDate(selectedDayForDetails);
            }
            setShowDayDetailsDialog(false);
            setShowCreateDialog(true);
          }}
        />
      </div>
    </DashboardLayout>
  );
}

// Month View Component
const MonthView: React.FC<{
  currentDate: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
  onDayClick: (date: Date) => void;
  getEventTypeColor: (type: CalendarEvent['type']) => string;
}> = ({ currentDate, selectedDate, events, onDateSelect, onDayClick, getEventTypeColor }) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="space-y-2">
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
          <div 
            key={day} 
            className={cn(
              "p-3 text-center text-xs sm:text-sm font-semibold rounded-lg",
              idx === 0 || idx === 6 ? "text-muted-foreground bg-muted/20" : "text-foreground"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dayEvents = events.filter(e => isSameDay(e.date, day));
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isWeekendDay = isWeekend(day);

          return (
            <div
              key={day.toISOString()}
              onClick={() => {
                onDateSelect(day);
                onDayClick(day);
              }}
              className={cn(
                "group relative min-h-[90px] sm:min-h-[110px] p-3 rounded-xl cursor-pointer transition-all duration-200",
                "border-2 border-transparent",
                isSelected && "border-primary shadow-lg scale-[1.02]",
                isTodayDate && "bg-gradient-to-br from-primary/20 to-focus/20 border-primary/50",
                !isCurrentMonth && "opacity-40",
                isWeekendDay && !isTodayDate && "bg-muted/40",
                !isSelected && "hover:border-primary/30 hover:shadow-md hover:scale-[1.01]",
                "hover:bg-gradient-to-br hover:from-primary/5 hover:to-focus/5"
              )}
            >
              {/* Add Event Button on Hover */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="h-6 w-6 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
                  <Plus className="h-3 w-3 text-primary" />
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "text-sm font-semibold transition-colors",
                  isTodayDate && "text-primary text-base",
                  isWeekendDay && !isTodayDate && "text-muted-foreground"
                )}>
                  {format(day, 'd')}
                </span>
                {isTodayDate && (
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-medium text-primary">Today</span>
                  </div>
                )}
              </div>

              {/* Event Indicators */}
              <div className="space-y-1">
                {dayEvents.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {dayEvents.slice(0, 3).map((event, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          getEventTypeColor(event.type)
                        )}
                        title={`${event.time || ''} ${event.title}`}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Mini Event Preview on Hover */}
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="text-[10px] p-1 bg-background/95 backdrop-blur rounded border truncate">
                      {dayEvents[0].title}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Week View Component
const WeekView: React.FC<{
  currentDate: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
  getEventTypeColor: (type: CalendarEvent['type']) => string;
}> = ({ currentDate, selectedDate, events, onDateSelect, getEventTypeColor }) => {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Day Headers */}
        <div className="grid grid-cols-8 gap-1 mb-2">
          <div className="p-2 text-xs font-medium text-muted-foreground">Time</div>
          {days.map(day => (
            <div
              key={day.toISOString()}
              className={cn(
                "p-2 text-center cursor-pointer rounded-lg transition-colors",
                isToday(day) ? "bg-[hsl(275_100%_84%)] hover:bg-[hsl(275_100%_80%)]" : "hover:bg-muted",
                isSameDay(day, selectedDate) && !isToday(day) && "bg-primary/10 hover:bg-primary/20"
              )}
              onClick={() => onDateSelect(day)}
            >
              <div className={cn(
                "text-xs font-medium",
                isToday(day) ? "text-black font-semibold" : "text-muted-foreground"
              )}>
                {format(day, 'EEE')}
              </div>
              <div className={cn(
                "text-lg font-semibold",
                isToday(day) ? "text-black" : "",
                !isToday(day) && isSameDay(day, selectedDate) && "text-primary"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <div className="border rounded-lg overflow-hidden">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
              <div className="p-2 text-xs text-muted-foreground border-r bg-muted/20">
                {format(new Date().setHours(hour, 0, 0, 0), 'ha')}
              </div>
              {days.map(day => {
                const hourEvents = events.filter(e => {
                  if (!e.time) return false;
                  const eventHour = parseInt(e.time.split(':')[0]);
                  return isSameDay(e.date, day) && eventHour === hour;
                });

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="p-1 min-h-[50px] border-r last:border-r-0 hover:bg-muted transition-colors cursor-pointer"
                  >
                    {hourEvents.map((event, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "text-xs p-1 rounded mb-1",
                          getEventTypeColor(event.type),
                          "text-white"
                        )}
                      >
                        <div className="font-medium">{event.time}</div>
                        <div className="truncate">{event.title}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Day View Component
const DayView: React.FC<{
  currentDate: Date;
  events: CalendarEvent[];
  getEventTypeColor: (type: CalendarEvent['type']) => string;
}> = ({ currentDate, events, getEventTypeColor }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-2xl font-bold">{format(currentDate, 'EEEE')}</h3>
        <p className="text-muted-foreground">{format(currentDate, 'MMMM d, yyyy')}</p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        {hours.map(hour => {
          const hourEvents = events.filter(e => {
            if (!e.time) return false;
            const eventHour = parseInt(e.time.split(':')[0]);
            return eventHour === hour;
          });

          return (
            <div key={hour} className="flex border-b last:border-b-0">
              <div className="w-20 p-3 text-sm text-muted-foreground border-r bg-muted/20">
                {format(new Date().setHours(hour, 0, 0, 0), 'ha')}
              </div>
              <div className="flex-1 p-3 min-h-[60px]">
                {hourEvents.map((event, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-2 rounded mb-2",
                      getEventTypeColor(event.type),
                      "text-white"
                    )}
                  >
                    <div className="font-medium">{event.time} - {event.title}</div>
                    {event.description && (
                      <div className="text-sm opacity-90">{event.description}</div>
                    )}
                    {event.subject && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {event.subject}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Agenda View Component
const AgendaView: React.FC<{
  events: CalendarEvent[];
  getEventTypeColor: (type: CalendarEvent['type']) => string;
}> = ({ events, getEventTypeColor }) => {
  const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  const groupedEvents: { [key: string]: CalendarEvent[] } = {};

  sortedEvents.forEach(event => {
    const dateKey = format(event.date, 'yyyy-MM-dd');
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = [];
    }
    groupedEvents[dateKey].push(event);
  });

  return (
    <div className="space-y-6">
      {Object.entries(groupedEvents).map(([dateKey, dayEvents]) => {
        const date = new Date(dateKey);
        const isToday = isSameDay(date, new Date());

        return (
          <div key={dateKey}>
            <div className={cn(
              "flex items-center gap-2 mb-3 pb-2 border-b",
              isToday && "text-primary"
            )}>
              <CalendarDays className="h-5 w-5" />
              <h3 className="font-semibold text-lg">
                {format(date, 'EEEE, MMMM d')}
              </h3>
              {isToday && <Badge>Today</Badge>}
            </div>

            <div className="space-y-2">
              {dayEvents.map((event, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className={cn(
                    "h-2 w-2 rounded-full mt-2",
                    getEventTypeColor(event.type)
                  )} />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{event.title}</h4>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {event.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event.time}
                            </span>
                          )}
                          {event.subject && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {event.subject}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Badge variant="outline" className="text-xs">
                        {event.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {Object.keys(groupedEvents).length === 0 && (
        <div className="text-center py-8">
          <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No events scheduled</p>
        </div>
      )}
    </div>
  );
};


// Day Details Dialog Component
const DayDetailsDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  events: CalendarEvent[];
  getEventTypeColor: (type: CalendarEvent['type']) => string;
  getEventIcon: (type: CalendarEvent['type']) => string;
  onAddEvent: () => void;
}> = ({ open, onOpenChange, date, events, getEventTypeColor, getEventIcon, onAddEvent }) => {
  if (!date) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            {format(date, 'EEEE, MMMM d, yyyy')}
          </DialogTitle>
          <DialogDescription>
            {isToday(date) && (
              <Badge className="bg-primary/20 text-primary">Today</Badge>
            )}
            {events.length > 0 ? 
              `${events.length} event${events.length > 1 ? 's' : ''} scheduled` : 
              'No events scheduled for this day'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.sort((a, b) => {
                if (!a.time && !b.time) return 0;
                if (!a.time) return 1;
                if (!b.time) return -1;
                return a.time.localeCompare(b.time);
              }).map((event, index) => (
                <div
                  key={event.id || index}
                  className="p-4 rounded-lg border hover:shadow-md transition-all duration-200 bg-card"
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center text-white text-lg",
                        getEventTypeColor(event.type)
                      )}
                    >
                      {getEventIcon(event.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-lg">{event.title}</h4>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {event.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 mt-3 text-sm">
                            {event.time && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                {event.time}
                              </div>
                            )}
                            {event.subject && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Tag className="h-4 w-4" />
                                {event.subject}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {event.type}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-muted-foreground/20 rounded-lg">
              <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">
                No events scheduled for this day
              </p>
              <p className="text-sm text-muted-foreground/70 mb-4">
                Click the button below to add your first event
              </p>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              onClick={onAddEvent}
              className="bg-gradient-to-r from-primary to-primary-glow"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};