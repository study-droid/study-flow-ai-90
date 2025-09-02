import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Download } from 'lucide-react';
import { useTimetable, TimetableEntry } from '@/hooks/useTimetable';
import { useSubjects } from '@/hooks/useSubjects';
import { TimetableEntryForm } from './TimetableEntryForm';
import { exportTimetablePDF } from '@/lib/pdfExport';
import { useToast } from '@/hooks/use-toast';

const days = [
  { name: 'Sunday', value: 0 },
  { name: 'Monday', value: 1 },
  { name: 'Tuesday', value: 2 },
  { name: 'Wednesday', value: 3 },
  { name: 'Thursday', value: 4 },
  { name: 'Friday', value: 5 },
  { name: 'Saturday', value: 6 },
];

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

const WeeklyTimetableComponent = () => {
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const { entries, loading, submitting, createEntry, updateEntry, deleteEntry } = useTimetable();
  const { subjects } = useSubjects();
  const { toast } = useToast();

  const handleCreateEntry = async (data: any) => {
    const result = await createEntry(data);
    if (result.data) {
      setIsFormOpen(false);
    }
  };

  const handleUpdateEntry = async (data: any) => {
    if (!selectedEntry) return;
    const result = await updateEntry(selectedEntry.id, data);
    if (result.data) {
      setSelectedEntry(null);
      setIsFormOpen(false);
    }
  };

  const handleDeleteEntry = async (entry: TimetableEntry) => {
    if (confirm('Are you sure you want to delete this timetable entry?')) {
      await deleteEntry(entry.id);
    }
  };

  const handleEditEntry = (entry: TimetableEntry) => {
    setSelectedEntry(entry);
    setIsFormOpen(true);
  };

  const handleExportTimetable = async () => {
    try {
      setIsExporting(true);
      await exportTimetablePDF(entries, subjects);
      toast({
        title: "Timetable exported",
        description: "Your weekly timetable has been downloaded as PDF.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export timetable. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getEntryForTimeSlot = (dayValue: number, timeSlot: string) => {
    return entries.find(entry => {
      const entryStartTime = entry.start_time.substring(0, 5);
      const entryEndTime = entry.end_time.substring(0, 5);
      return entry.day_of_week === dayValue && timeSlot >= entryStartTime && timeSlot < entryEndTime;
    });
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading timetable...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Weekly Timetable</h2>
          <p className="text-muted-foreground">Manage your weekly class schedule</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleExportTimetable}
            disabled={isExporting || entries.length === 0}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedEntry(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedEntry ? 'Edit Class' : 'Add New Class'}
                </DialogTitle>
              </DialogHeader>
              <TimetableEntryForm
                entry={selectedEntry}
                subjects={subjects}
                onSubmit={selectedEntry ? handleUpdateEntry : handleCreateEntry}
                onCancel={() => {
                  setIsFormOpen(false);
                  setSelectedEntry(null);
                }}
                loading={submitting}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 border border-border bg-muted/50 w-20">Time</th>
                  {days.map((day) => (
                    <th key={day.value} className="p-2 border border-border bg-muted/50 min-w-32">
                      {day.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((timeSlot) => (
                  <tr key={timeSlot}>
                    <td className="p-2 border border-border text-sm font-medium bg-muted/25">
                      {timeSlot}
                    </td>
                    {days.map((day) => {
                      const entry = getEntryForTimeSlot(day.value, timeSlot);
                      
                      return (
                        <td key={`${day.value}-${timeSlot}`} className="p-1 border border-border h-16">
                          {entry && timeSlot === formatTime(entry.start_time) && (
                            <div
                              className="p-2 rounded text-white text-xs h-full flex flex-col justify-between group relative"
                              style={{ backgroundColor: entry.subject?.color || '#3B82F6' }}
                            >
                              <div>
                                <div className="font-medium truncate">
                                  {entry.subject?.name || 'Unknown Subject'}
                                </div>
                                <div className="text-xs opacity-90">
                                  {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                                </div>
                                {entry.room && (
                                  <div className="text-xs opacity-80">{entry.room}</div>
                                )}
                              </div>
                              <div className="hidden group-hover:flex gap-1 mt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs bg-white/20 border-white/30 hover:bg-white/30"
                                  onClick={() => handleEditEntry(entry)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs bg-white/20 border-white/30 hover:bg-white/30"
                                  onClick={() => handleDeleteEntry(entry)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {entries.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No classes scheduled yet.</p>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setSelectedEntry(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Class
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export const WeeklyTimetable = React.memo(WeeklyTimetableComponent);