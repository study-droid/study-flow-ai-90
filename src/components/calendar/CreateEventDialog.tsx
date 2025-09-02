import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useSubjects } from '@/hooks/useSubjects';
import { calendarService, type CalendarEvent } from '@/services/calendar/calendarService';
import { useToast } from '@/hooks/use-toast';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
}

export const CreateEventDialog: React.FC<CreateEventDialogProps> = ({ 
  open, 
  onOpenChange,
  initialDate 
}) => {
  const { subjects } = useSubjects();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'reminder' as CalendarEvent['type'],
    date: initialDate || new Date(),
    time: '',
    subject: '',
    subject_id: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find the subject name if a subject_id is selected
    const selectedSubject = subjects.find(s => s.id === formData.subject_id);
    
    const event: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      type: formData.type,
      date: formData.date,
      time: formData.time || undefined,
      subject: selectedSubject?.name || formData.subject || undefined
    };
    
    calendarService.addEvent(event);
    
    toast({
      title: "Event Created",
      description: `"${event.title}" has been added to your calendar.`,
    });
    
    onOpenChange(false);
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      type: 'reminder',
      date: new Date(),
      time: '',
      subject: '',
      subject_id: ''
    });
  };

  const handleReset = () => {
    setFormData({
      title: '',
      description: '',
      type: 'reminder',
      date: initialDate || new Date(),
      time: '',
      subject: '',
      subject_id: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) handleReset();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Create New Event
          </DialogTitle>
          <DialogDescription>
            Add a new event to your calendar with optional subject association
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Event Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Event Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Study Session, Assignment Due"
              required
              className="w-full"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about this event..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Event Type and Subject */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium">
                Event Type
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as CalendarEvent['type'] })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="study">📚 Study Session</SelectItem>
                  <SelectItem value="assignment">📝 Assignment</SelectItem>
                  <SelectItem value="exam">📋 Exam</SelectItem>
                  <SelectItem value="quiz">🧠 Quiz</SelectItem>
                  <SelectItem value="flashcard">🎯 Flashcard Review</SelectItem>
                  <SelectItem value="reminder">🔔 Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                Subject
              </Label>
              <Select
                value={formData.subject_id}
                onValueChange={(value) => {
                  if (value === 'none') {
                    setFormData({ ...formData, subject_id: '', subject: '' });
                  } else {
                    const selectedSubject = subjects.find(s => s.id === value);
                    setFormData({ 
                      ...formData, 
                      subject_id: value,
                      subject: selectedSubject?.name || ''
                    });
                  }
                }}
              >
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-gray-400" />
                      None
                    </div>
                  </SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: subject.color || '#3b82f6' }}
                        />
                        {subject.name}
                        {subject.code && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({subject.code})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                Date <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => {
                      if (date) {
                        setFormData({ ...formData, date });
                        // Auto-close the calendar popover
                        setTimeout(() => {
                          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                        }, 100);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full"
              />
            </div>
          </div>

          {/* Quick Time Presets */}
          <div className="flex gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Quick set:</span>
            {['09:00', '12:00', '15:00', '18:00', '21:00'].map(time => (
              <Button
                key={time}
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setFormData({ ...formData, time })}
              >
                {time}
              </Button>
            ))}
          </div>

          {/* Form Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button 
              type="button" 
              variant="ghost"
              onClick={handleReset}
            >
              Reset
            </Button>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-primary to-primary-glow"
              >
                Create Event
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};