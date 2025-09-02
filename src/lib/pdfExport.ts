import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { StudySession } from '@/hooks/useStudySessions';
import { Task } from '@/hooks/useTasks';
import { StudyGoal } from '@/hooks/useStudyGoals';

export interface ExportData {
  sessions: StudySession[];
  tasks: Task[];
  goals: StudyGoal[];
  userProfile?: {
    display_name?: string;
    email?: string;
  };
}

export const exportWeeklySchedulePDF = (data: ExportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 44, 52);
  doc.text('Weekly Study Schedule', pageWidth / 2, 20, { align: 'center' });
  
  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  doc.setFontSize(12);
  doc.text(`Week of ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`, pageWidth / 2, 30, { align: 'center' });
  
  let yPosition = 50;
  
  // Weekly overview
  const weekSessions = data.sessions.filter(session => {
    const sessionDate = new Date(session.completed_at);
    return sessionDate >= weekStart && sessionDate <= weekEnd;
  });
  
  const weekTasks = data.tasks.filter(task => {
    if (!task.due_date) return false;
    const taskDate = new Date(task.due_date);
    return taskDate >= weekStart && taskDate <= weekEnd;
  });
  
  // Summary stats
  doc.setFontSize(14);
  doc.setTextColor(74, 85, 104);
  doc.text('Weekly Summary', 20, yPosition);
  yPosition += 20;
  
  const totalStudyTime = weekSessions.reduce((total, session) => total + session.duration_minutes, 0);
  const completedTasks = weekTasks.filter(task => task.status === 'completed').length;
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Study Time: ${Math.floor(totalStudyTime / 60)}h ${totalStudyTime % 60}m`, 20, yPosition);
  doc.text(`Sessions Completed: ${weekSessions.length}`, 20, yPosition + 10);
  doc.text(`Tasks Due: ${weekTasks.length} | Completed: ${completedTasks}`, 20, yPosition + 20);
  yPosition += 40;
  
  // Daily schedule
  weekDays.forEach((day, index) => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    const dayName = format(day, 'EEEE, MMM d');
    const daySessions = weekSessions.filter(session => 
      format(new Date(session.completed_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    );
    const dayTasks = weekTasks.filter(task => 
      task.due_date && format(new Date(task.due_date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    );
    
    doc.setFontSize(12);
    doc.setTextColor(40, 44, 52);
    doc.text(dayName, 20, yPosition);
    yPosition += 15;
    
    if (daySessions.length > 0 || dayTasks.length > 0) {
      // Sessions
      if (daySessions.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(59, 130, 246);
        doc.text('Study Sessions:', 25, yPosition);
        yPosition += 10;
        
        daySessions.forEach(session => {
          doc.setTextColor(100, 116, 139);
          doc.text(`• ${session.subject || 'Study'} - ${session.duration_minutes}min (${session.session_type})`, 30, yPosition);
          yPosition += 8;
        });
        yPosition += 5;
      }
      
      // Tasks
      if (dayTasks.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(16, 185, 129);
        doc.text('Tasks Due:', 25, yPosition);
        yPosition += 10;
        
        dayTasks.forEach(task => {
          doc.setTextColor(100, 116, 139);
          const status = task.status === 'completed' ? '✓' : '○';
          doc.text(`${status} ${task.title} - ${task.priority} priority`, 30, yPosition);
          yPosition += 8;
        });
        yPosition += 5;
      }
    } else {
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text('No scheduled activities', 25, yPosition);
      yPosition += 15;
    }
    
    yPosition += 10;
  });
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(`Generated on ${format(new Date(), 'PPP')} by StudyFlow`, pageWidth / 2, 280, { align: 'center' });
  
  doc.save(`weekly-schedule-${format(weekStart, 'yyyy-MM-dd')}.pdf`);
};

export const exportSubjectSchedulePDF = (data: ExportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 44, 52);
  doc.text('Subject Study Schedule', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Generated on ${format(new Date(), 'PPP')}`, pageWidth / 2, 30, { align: 'center' });
  
  let yPosition = 50;
  
  // Group sessions by subject
  const subjectMap = new Map<string, StudySession[]>();
  data.sessions.forEach(session => {
    const subject = session.subject || 'Uncategorized';
    if (!subjectMap.has(subject)) {
      subjectMap.set(subject, []);
    }
    subjectMap.get(subject)!.push(session);
  });
  
  // Sort subjects by total study time
  const sortedSubjects = Array.from(subjectMap.entries()).sort((a, b) => {
    const timeA = a[1].reduce((total, session) => total + session.duration_minutes, 0);
    const timeB = b[1].reduce((total, session) => total + session.duration_minutes, 0);
    return timeB - timeA;
  });
  
  sortedSubjects.forEach(([subject, sessions]) => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    const totalTime = sessions.reduce((total, session) => total + session.duration_minutes, 0);
    const sessionTypes = [...new Set(sessions.map(s => s.session_type))];
    
    // Subject header
    doc.setFontSize(16);
    doc.setTextColor(40, 44, 52);
    doc.text(subject, 20, yPosition);
    yPosition += 20;
    
    // Subject stats
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total Study Time: ${Math.floor(totalTime / 60)}h ${totalTime % 60}m`, 25, yPosition);
    doc.text(`Total Sessions: ${sessions.length}`, 25, yPosition + 10);
    doc.text(`Session Types: ${sessionTypes.join(', ')}`, 25, yPosition + 20);
    yPosition += 35;
    
    // Recent sessions table
    const tableData = sessions
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
      .slice(0, 10)
      .map(session => [
        format(new Date(session.completed_at), 'MMM d, yyyy'),
        session.session_type,
        `${session.duration_minutes} min`,
        session.notes || '-'
      ]);
    
    if (tableData.length > 0) {
      autoTable(doc, {
        head: [['Date', 'Type', 'Duration', 'Notes']],
        body: tableData,
        startY: yPosition,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 25, right: 25 },
      });
      
      yPosition = (doc as unknown).lastAutoTable.finalY + 20;
    }
    
    yPosition += 10;
  });
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(`Generated by StudyFlow`, pageWidth / 2, 280, { align: 'center' });
  
  doc.save(`subject-schedule-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const exportCoursesPDF = (data: ExportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 44, 52);
  doc.text('Courses & Study Plans Report', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Generated on ${format(new Date(), 'PPP')}`, pageWidth / 2, 30, { align: 'center' });
  
  let yPosition = 50;
  
  // Study Goals as "Courses"
  if (data.goals && data.goals.length > 0) {
    doc.setFontSize(16);
    doc.setTextColor(40, 44, 52);
    doc.text('Active Study Goals', 20, yPosition);
    yPosition += 20;
    
    data.goals.forEach(goal => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
      const isOverdue = new Date(goal.deadline) < new Date() && goal.status === 'active';
      
      // Goal header
      doc.setFontSize(14);
      doc.setTextColor(40, 44, 52);
      doc.text(`• ${goal.title}`, 25, yPosition);
      yPosition += 15;
      
      // Goal details
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      if (goal.description) {
        doc.text(`Description: ${goal.description}`, 30, yPosition);
        yPosition += 10;
      }
      doc.text(`Progress: ${goal.current_value}/${goal.target_value} ${goal.unit} (${progress.toFixed(1)}%)`, 30, yPosition);
      doc.text(`Deadline: ${format(new Date(goal.deadline), 'PPP')}`, 30, yPosition + 10);
      doc.text(`Status: ${goal.status}${isOverdue ? ' (Overdue)' : ''}`, 30, yPosition + 20);
      yPosition += 35;
    });
    
    yPosition += 15;
  }
  
  // Subject breakdown
  const subjectStats = new Map<string, { sessions: number; totalTime: number; tasks: number }>();
  
  data.sessions.forEach(session => {
    const subject = session.subject || 'Uncategorized';
    if (!subjectStats.has(subject)) {
      subjectStats.set(subject, { sessions: 0, totalTime: 0, tasks: 0 });
    }
    const stats = subjectStats.get(subject)!;
    stats.sessions++;
    stats.totalTime += session.duration_minutes;
  });
  
  data.tasks.forEach(task => {
    const subject = task.subject || 'Uncategorized';
    if (!subjectStats.has(subject)) {
      subjectStats.set(subject, { sessions: 0, totalTime: 0, tasks: 0 });
    }
    const stats = subjectStats.get(subject)!;
    stats.tasks++;
  });
  
  if (subjectStats.size > 0) {
    doc.setFontSize(16);
    doc.setTextColor(40, 44, 52);
    doc.text('Subject Overview', 20, yPosition);
    yPosition += 20;
    
    const tableData = Array.from(subjectStats.entries()).map(([subject, stats]) => [
      subject,
      stats.sessions.toString(),
      `${Math.floor(stats.totalTime / 60)}h ${stats.totalTime % 60}m`,
      stats.tasks.toString()
    ]);
    
    autoTable(doc, {
      head: [['Subject', 'Study Sessions', 'Total Time', 'Tasks']],
      body: tableData,
      startY: yPosition,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 20, right: 20 },
    });
    
    yPosition = (doc as unknown).lastAutoTable.finalY + 20;
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(`Generated by StudyFlow`, pageWidth / 2, 280, { align: 'center' });
  
  doc.save(`courses-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const exportTimetablePDF = async (entries: unknown[], subjects: unknown[]) => {
  const doc = new jsPDF('landscape');
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(40, 44, 52);
  doc.text('Weekly Timetable', 20, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on ${format(new Date(), 'PPP')}`, 20, 30);
  
  // Days of the week
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  
  // Create table data
  const tableData = [];
  
  // Time slot rows
  timeSlots.forEach(timeSlot => {
    const row = [timeSlot];
    
    days.forEach((_, dayIndex) => {
      const entry = entries.find(e => 
        e.day_of_week === dayIndex && 
        timeSlot >= e.start_time.substring(0, 5) && 
        timeSlot < e.end_time.substring(0, 5)
      );
      
      if (entry) {
        const subject = subjects.find(s => s.id === entry.subject_id) || entry.subject;
        const cellContent = `${subject?.name || 'Unknown'}\n${entry.start_time.substring(0, 5)}-${entry.end_time.substring(0, 5)}${entry.room ? '\n' + entry.room : ''}`;
        row.push(cellContent);
      } else {
        row.push('');
      }
    });
    
    tableData.push(row);
  });
  
  // Add table using autoTable
  autoTable(doc, {
    head: [['Time', ...days]],
    body: tableData,
    startY: 45,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      halign: 'center',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [245, 245, 245] }
    },
    didParseCell: (data) => {
      if (data.column.index > 0 && data.cell.text.length > 0) {
        // Color code cells based on subject
        const entryText = data.cell.text.join('\n');
        if (entryText.includes('\n')) {
          data.cell.styles.fillColor = [240, 249, 255];
        }
      }
    }
  });
  
  doc.save(`weekly-timetable-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};