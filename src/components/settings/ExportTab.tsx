import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, Calendar, BookOpen, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useStudySessions } from '@/hooks/useStudySessions';
import { useTasks } from '@/hooks/useTasks';
import { useStudyGoals } from '@/hooks/useStudyGoals';
import { useProfile } from '@/hooks/useProfile';
import { exportWeeklySchedulePDF, exportSubjectSchedulePDF, exportCoursesPDF } from '@/lib/pdfExport';
import { useToast } from '@/hooks/use-toast';

export const ExportTab = () => {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const { sessions } = useStudySessions();
  const { tasks } = useTasks();
  const { goals } = useStudyGoals();
  const { profile } = useProfile();
  const { toast } = useToast();

  const handleExport = async (type: 'weekly' | 'subject' | 'courses') => {
    setIsExporting(type);
    
    try {
      const exportData = {
        sessions,
        tasks,
        goals,
        userProfile: profile
      };

      switch (type) {
        case 'weekly':
          exportWeeklySchedulePDF(exportData);
          toast({
            title: 'Weekly Schedule Exported',
            description: 'Your weekly schedule has been downloaded as PDF.',
          });
          break;
        case 'subject':
          exportSubjectSchedulePDF(exportData);
          toast({
            title: 'Subject Schedule Exported', 
            description: 'Your subject breakdown has been downloaded as PDF.',
          });
          break;
        case 'courses':
          exportCoursesPDF(exportData);
          toast({
            title: 'Courses Report Exported',
            description: 'Your courses and goals report has been downloaded as PDF.',
          });
          break;
      }
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'There was an error generating the PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(null);
    }
  };

  const ExportCard = ({ 
    title, 
    description, 
    icon: Icon, 
    type, 
    disabled 
  }: { 
    title: string; 
    description: string; 
    icon: any; 
    type: 'weekly' | 'subject' | 'courses';
    disabled?: boolean;
  }) => (
    <Card className="study-flow-shadow-soft hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
            <Button 
              onClick={() => handleExport(type)}
              disabled={disabled || isExporting === type}
              className="w-full"
            >
              {isExporting === type ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Export Data</h2>
        <p className="text-muted-foreground">
          Export your study data in PDF format for offline viewing or sharing.
        </p>
      </div>

      <Separator />

      {/* Export Options */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
        <ExportCard
          title="Weekly Schedule"
          description="Export your current week's study sessions, tasks, and schedule in a detailed PDF format. Perfect for weekly planning and review."
          icon={Calendar}
          type="weekly"
          disabled={sessions.length === 0 && tasks.length === 0}
        />

        <ExportCard
          title="Subject Schedule"
          description="Get a comprehensive breakdown of your study sessions organized by subject. Includes time spent, session types, and progress analytics."
          icon={BookOpen}
          type="subject"
          disabled={sessions.length === 0}
        />

        <ExportCard
          title="Courses & Goals Report"
          description="Export your study goals, progress tracking, and subject overview. Ideal for academic reviews and progress monitoring."
          icon={FileText}
          type="courses"
          disabled={goals.length === 0 && sessions.length === 0}
        />
      </div>

      {/* Export Info */}
      <Card className="study-flow-shadow-soft bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Export Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>All exports are generated in PDF format for easy sharing and printing.</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Download className="h-4 w-4 text-muted-foreground" />
            <span>PDFs include detailed analytics, charts, and formatted data tables.</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Export data reflects your current study progress and completed activities.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};