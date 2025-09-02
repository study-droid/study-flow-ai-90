import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimetableEntry, TimetableEntryFormData } from '@/hooks/useTimetable';
import { Subject } from '@/hooks/useSubjects';

interface TimetableEntryFormProps {
  entry?: TimetableEntry | null;
  subjects: Subject[];
  onSubmit: (data: TimetableEntryFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const days = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

export const TimetableEntryForm = ({ entry, subjects, onSubmit, onCancel, loading }: TimetableEntryFormProps) => {
  const [formData, setFormData] = useState<TimetableEntryFormData>({
    subject_id: '',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:00',
    room: '',
    notes: '',
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        subject_id: entry.subject_id,
        day_of_week: entry.day_of_week,
        start_time: entry.start_time.substring(0, 5),
        end_time: entry.end_time.substring(0, 5),
        room: entry.room || '',
        notes: entry.notes || '',
      });
    }
  }, [entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.start_time >= formData.end_time) {
      alert('End time must be after start time');
      return;
    }
    
    await onSubmit(formData);
  };

  const handleChange = (field: keyof TimetableEntryFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="subject_id">Subject *</Label>
          <Select
            value={formData.subject_id}
            onValueChange={(value) => handleChange('subject_id', value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: subject.color }}
                    />
                    {subject.name} ({subject.code})
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="day_of_week">Day *</Label>
          <Select
            value={formData.day_of_week.toString()}
            onValueChange={(value) => handleChange('day_of_week', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {days.map((day) => (
                <SelectItem key={day.value} value={day.value.toString()}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_time">Start Time *</Label>
          <Input
            id="start_time"
            type="time"
            value={formData.start_time}
            onChange={(e) => handleChange('start_time', e.target.value)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="end_time">End Time *</Label>
          <Input
            id="end_time"
            type="time"
            value={formData.end_time}
            onChange={(e) => handleChange('end_time', e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="room">Room</Label>
        <Input
          id="room"
          value={formData.room}
          onChange={(e) => handleChange('room', e.target.value)}
          placeholder="e.g., Room 101, Lab A"
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Additional notes or instructions"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !formData.subject_id}>
          {loading ? 'Saving...' : entry ? 'Update Class' : 'Add Class'}
        </Button>
      </div>
    </form>
  );
};