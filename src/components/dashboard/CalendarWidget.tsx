import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  BookOpen,
  Target,
  Plus,
  FileText,
  Brain,
  ClipboardList,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { calendarService, type CalendarEvent } from '@/services/calendar/calendarService';
import { useCalendarSync } from '@/hooks/useCalendarSync';
import { useToast } from '@/hooks/use-toast';

export const CalendarWidget = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { syncCalendarEvents, isSyncing } = useCalendarSync();

  // Subscribe to calendar events
  useEffect(() => {
    const unsubscribe = calendarService.subscribe(setEvents);
    return unsubscribe;
  }, []);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
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
      case 'study': return BookOpen;
      case 'assignment': return FileText;
      case 'exam': return ClipboardList;
      case 'quiz': return Brain;
      case 'flashcard': return Target;
      case 'reminder': return Clock;
      default: return Calendar;
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.route) {
      navigate(event.route);
    } else {
      // Default routes based on event type
      switch (event.type) {
        case 'study':
          navigate('/study');
          break;
        case 'assignment':
          navigate('/assignments');
          break;
        case 'exam':
        case 'quiz':
          navigate('/quiz');
          break;
        case 'flashcard':
          navigate('/flashcards');
          break;
        default:
          break;
      }
    }
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <Card className="study-flow-shadow-soft">
      <CardHeader className="p-3 sm:p-4 pb-3">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/calendar')}>
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <span className="font-semibold text-sm sm:text-base">Calendar</span>
            {events.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {events.length}
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={async () => {
              await syncCalendarEvents();
              toast({
                title: "Calendar Synced",
                description: "All events have been updated",
              });
            }}
            disabled={isSyncing}
            className="h-7 w-7"
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          </Button>
        </div>
        
        {/* Month Navigation Row - Centered */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={previousMonth} 
              className="h-7 w-7 sm:h-8 sm:w-8"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <div className="text-xs sm:text-sm font-medium min-w-[100px] sm:min-w-[120px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={nextMonth} 
              className="h-7 w-7 sm:h-8 sm:w-8"
            >
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Calendar Grid */}
        <div className="space-y-2">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-xs text-muted-foreground font-medium">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-1 sm:p-2 text-center">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.charAt(0)}</span>
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {/* Empty cells for previous month */}
            {Array.from({ length: monthStart.getDay() }).map((_, index) => (
              <div key={`empty-${index}`} className="h-8" />
            ))}
            
            {/* Days of current month */}
            {days.map(day => {
              const dayEvents = getEventsForDate(day);
              const hasEvents = dayEvents.length > 0;
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    setSelectedDate(day);
                    // Navigate to calendar tab with the selected date
                    navigate('/calendar', { state: { selectedDate: day.toISOString() } });
                  }}
                  className={cn(
                    "relative h-7 w-7 sm:h-8 sm:w-8 text-[10px] sm:text-xs rounded-md transition-all duration-200 hover:bg-muted",
                    isSelected && "bg-primary text-primary-foreground",
                    isTodayDate && !isSelected && "bg-primary/20 text-primary font-semibold",
                    !isSameMonth(day, currentDate) && "text-muted-foreground/50"
                  )}
                >
                  <span className={cn(hasEvents && "font-semibold")}>
                    {format(day, 'd')}
                  </span>
                  {hasEvents && (
                    <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                      {dayEvents.slice(0, 2).map((event, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full shadow-sm",
                            getEventTypeColor(event.type)
                          )}
                        />
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-gray-400" />
                      )}
                    </div>
                  )}
                  {/* Show number badge for multiple events - Responsive */}
                  {dayEvents.length > 1 && (
                    <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-primary text-primary-foreground text-[8px] sm:text-[9px] flex items-center justify-center font-bold">
                      {dayEvents.length > 9 ? '9+' : dayEvents.length}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Info */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const today = new Date();
                setSelectedDate(today);
                navigate('/calendar', { state: { selectedDate: today.toISOString() } });
              }}
              className="h-7 text-xs"
            >
              Today
            </Button>
          </div>
          
          <div className="space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
            {selectedDateEvents.length > 0 ? (
              selectedDateEvents.map(event => {
                const EventIcon = getEventIcon(event.type);
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-2 p-1.5 sm:p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => {
                      // Navigate to calendar with both date and event
                      navigate('/calendar', { 
                        state: { 
                          selectedDate: selectedDate.toISOString(),
                          selectedEvent: event 
                        } 
                      });
                    }}
                  >
                    <div className={cn(
                      "h-6 w-6 rounded flex items-center justify-center",
                      getEventTypeColor(event.type),
                      "bg-opacity-20"
                    )}>
                      <EventIcon className={cn(
                        "h-3 w-3",
                        getEventTypeColor(event.type).replace('bg-', 'text-')
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{event.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {event.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {event.time}
                          </span>
                        )}
                        {event.subject && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {event.subject}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className="text-xs capitalize"
                    >
                      {event.type}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4">
                <Target className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">No events scheduled</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};