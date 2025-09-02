/**
 * Export Service
 * Handles exporting data to CSV and PDF formats
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

// Analytics data type definitions
interface StudyMetrics {
  totalHours: number;
  sessionsCompleted: number;
  averageSessionLength: number;
  weeklyGoalProgress: number;
  focusScore: number;
  streakDays: number;
}

interface ChartDataPoint {
  name: string;
  value: number;
  sessions?: number;
  efficiency?: number;
  focus?: number;
}

interface SubjectDataPoint {
  name: string;
  value: number;
  color?: string;
}

interface PerformanceMetric {
  subject: string;
  current: number;
  target: number;
}

interface AnalyticsExportData {
  studyMetrics?: StudyMetrics;
  studyHoursData?: ChartDataPoint[];
  subjectData?: SubjectDataPoint[];
  performanceData?: PerformanceMetric[];
  productivityScore?: number;
  completionRate?: number;
}

interface Task {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
  subject?: string;
  createdAt: string;
}

interface Flashcard {
  question: string;
  answer: string;
  difficulty?: string;
  timesReviewed?: number;
  successRate?: number;
  lastReviewed?: string;
  nextReview?: string;
  tags?: string[];
}

interface StudySession {
  startTime: string;
  endTime?: string;
  subject?: string;
  focusScore?: number;
  breakTime?: number;
  notes?: string;
  completed: boolean;
}

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: unknown) => void;
  }
}

export interface ExportOptions {
  format: 'csv' | 'pdf' | 'json';
  fileName?: string;
  title?: string;
  description?: string;
  includeTimestamp?: boolean;
}

class ExportService {
  private static instance: ExportService;
  
  private constructor() {}
  
  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }
  
  /**
   * Export analytics data
   */
  exportAnalytics(
    data: AnalyticsExportData,
    options: ExportOptions = { format: 'csv' }
  ): void {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const fileName = options.fileName || `analytics_${timestamp}`;
    
    switch (options.format) {
      case 'csv':
        this.exportAnalyticsToCSV(data, fileName);
        break;
      case 'pdf':
        this.exportAnalyticsToPDF(data, fileName, options);
        break;
      case 'json':
        this.exportToJSON(data, fileName);
        break;
    }
  }
  
  /**
   * Export analytics to CSV
   */
  private exportAnalyticsToCSV(data: AnalyticsExportData, fileName: string): void {
    const csvContent = this.generateAnalyticsCSV(data);
    this.downloadCSV(csvContent, `${fileName}.csv`);
  }
  
  /**
   * Generate CSV content for analytics
   */
  private generateAnalyticsCSV(data: AnalyticsExportData): string {
    const rows: string[] = [];
    
    // Add headers
    rows.push('Analytics Report');
    rows.push(`Generated: ${new Date().toLocaleString()}`);
    rows.push('');
    
    // Study Metrics
    if (data.studyMetrics) {
      rows.push('Study Metrics');
      rows.push('Metric,Value');
      rows.push(`Total Hours,${data.studyMetrics.totalHours}`);
      rows.push(`Sessions Completed,${data.studyMetrics.sessionsCompleted}`);
      rows.push(`Average Session Length,${data.studyMetrics.averageSessionLength} min`);
      rows.push(`Weekly Goal Progress,${data.studyMetrics.weeklyGoalProgress}%`);
      rows.push(`Focus Score,${data.studyMetrics.focusScore}`);
      rows.push(`Streak Days,${data.studyMetrics.streakDays}`);
      rows.push('');
    }
    
    // Daily Study Hours
    if (data.studyHoursData) {
      rows.push('Daily Study Hours');
      rows.push('Date,Hours,Sessions,Efficiency,Focus');
      data.studyHoursData.forEach((day: ChartDataPoint) => {
        rows.push(`${day.name},${day.value},${day.sessions},${day.efficiency}%,${day.focus}`);
      });
      rows.push('');
    }
    
    // Subject Distribution
    if (data.subjectData) {
      rows.push('Subject Distribution');
      rows.push('Subject,Hours');
      data.subjectData.forEach((subject: SubjectDataPoint) => {
        rows.push(`${subject.name},${subject.value}`);
      });
      rows.push('');
    }
    
    // Performance Metrics
    if (data.performanceData) {
      rows.push('Performance Metrics');
      rows.push('Metric,Current,Target');
      data.performanceData.forEach((metric: PerformanceMetric) => {
        rows.push(`${metric.subject},${metric.current},${metric.target}`);
      });
    }
    
    return rows.join('\n');
  }
  
  /**
   * Export analytics to PDF
   */
  private exportAnalyticsToPDF(
    data: AnalyticsExportData,
    fileName: string,
    options: ExportOptions
  ): void {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 20;
    
    // Add title
    pdf.setFontSize(20);
    pdf.text(options.title || 'Analytics Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    
    // Add timestamp
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
    
    // Add description if provided
    if (options.description) {
      pdf.setFontSize(12);
      pdf.text(options.description, 20, yPosition);
      yPosition += 10;
    }
    
    // Study Metrics Section
    if (data.studyMetrics) {
      pdf.setFontSize(14);
      pdf.text('Study Metrics', 20, yPosition);
      yPosition += 10;
      
      const metricsData = [
        ['Total Hours', `${data.studyMetrics.totalHours} hours`],
        ['Sessions Completed', data.studyMetrics.sessionsCompleted.toString()],
        ['Average Session Length', `${data.studyMetrics.averageSessionLength} min`],
        ['Weekly Goal Progress', `${data.studyMetrics.weeklyGoalProgress}%`],
        ['Focus Score', data.studyMetrics.focusScore.toString()],
        ['Streak Days', data.studyMetrics.streakDays.toString()]
      ];
      
      pdf.autoTable({
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: metricsData,
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246] }
      });
      
      yPosition = (pdf as unknown).lastAutoTable.finalY + 15;
    }
    
    // Daily Study Hours
    if (data.studyHoursData && yPosition < 250) {
      pdf.setFontSize(14);
      pdf.text('Daily Study Hours', 20, yPosition);
      yPosition += 10;
      
      const hoursData = data.studyHoursData.map((day: ChartDataPoint) => [
        day.name,
        day.value.toString(),
        (day.sessions || 0).toString(),
        `${day.efficiency || 0}%`,
        (day.focus || 0).toString()
      ]);
      
      pdf.autoTable({
        startY: yPosition,
        head: [['Date', 'Hours', 'Sessions', 'Efficiency', 'Focus']],
        body: hoursData,
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246] }
      });
      
      yPosition = (pdf as unknown).lastAutoTable.finalY + 15;
    }
    
    // Check if we need a new page
    if (yPosition > 250) {
      pdf.addPage();
      yPosition = 20;
    }
    
    // Subject Distribution
    if (data.subjectData) {
      pdf.setFontSize(14);
      pdf.text('Subject Distribution', 20, yPosition);
      yPosition += 10;
      
      const subjectTableData = data.subjectData.map((subject: SubjectDataPoint) => [
        subject.name,
        `${subject.value} hours`
      ]);
      
      pdf.autoTable({
        startY: yPosition,
        head: [['Subject', 'Study Hours']],
        body: subjectTableData,
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246] }
      });
      
      yPosition = (pdf as unknown).lastAutoTable.finalY + 15;
    }
    
    // Performance Metrics
    if (data.performanceData && yPosition < 250) {
      pdf.setFontSize(14);
      pdf.text('Performance Metrics', 20, yPosition);
      yPosition += 10;
      
      const performanceTableData = data.performanceData.map((metric: PerformanceMetric) => [
        metric.subject,
        metric.current.toString(),
        metric.target.toString(),
        `${Math.round((metric.current / metric.target) * 100)}%`
      ]);
      
      pdf.autoTable({
        startY: yPosition,
        head: [['Metric', 'Current', 'Target', 'Achievement']],
        body: performanceTableData,
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246] }
      });
    }
    
    // Save the PDF
    pdf.save(`${fileName}.pdf`);
  }
  
  /**
   * Export tasks to CSV
   */
  exportTasks(tasks: Task[], fileName: string = 'tasks'): void {
    const rows: string[] = [];
    
    // Headers
    rows.push('Title,Description,Due Date,Priority,Status,Subject,Created At');
    
    // Data rows
    tasks.forEach((task: Task) => {
      const row = [
        this.escapeCSV(task.title),
        this.escapeCSV(task.description || ''),
        task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd HH:mm') : '',
        task.priority || 'medium',
        task.status || 'pending',
        this.escapeCSV(task.subject || ''),
        format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm')
      ];
      rows.push(row.join(','));
    });
    
    const csvContent = rows.join('\n');
    this.downloadCSV(csvContent, `${fileName}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  }
  
  /**
   * Export flashcards to CSV
   */
  exportFlashcards(flashcards: Flashcard[], fileName: string = 'flashcards'): void {
    const rows: string[] = [];
    
    // Headers
    rows.push('Question,Answer,Difficulty,Times Reviewed,Success Rate,Last Reviewed,Next Review,Tags');
    
    // Data rows
    flashcards.forEach((card: Flashcard) => {
      const row = [
        this.escapeCSV(card.question),
        this.escapeCSV(card.answer),
        card.difficulty || 'medium',
        card.timesReviewed || '0',
        card.successRate ? `${card.successRate}%` : '0%',
        card.lastReviewed ? format(new Date(card.lastReviewed), 'yyyy-MM-dd') : '',
        card.nextReview ? format(new Date(card.nextReview), 'yyyy-MM-dd') : '',
        card.tags ? card.tags.join('; ') : ''
      ];
      rows.push(row.join(','));
    });
    
    const csvContent = rows.join('\n');
    this.downloadCSV(csvContent, `${fileName}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  }
  
  /**
   * Export study sessions to CSV
   */
  exportStudySessions(sessions: StudySession[], fileName: string = 'study_sessions'): void {
    const rows: string[] = [];
    
    // Headers
    rows.push('Date,Subject,Duration (min),Focus Score,Break Time (min),Notes,Completed');
    
    // Data rows
    sessions.forEach((session: StudySession) => {
      const startTime = new Date(session.startTime);
      const endTime = session.endTime ? new Date(session.endTime) : null;
      const duration = endTime 
        ? Math.round((endTime.getTime() - startTime.getTime()) / 60000)
        : 0;
      
      const row = [
        format(startTime, 'yyyy-MM-dd HH:mm'),
        this.escapeCSV(session.subject || ''),
        duration.toString(),
        session.focusScore || '',
        session.breakTime || '0',
        this.escapeCSV(session.notes || ''),
        session.completed ? 'Yes' : 'No'
      ];
      rows.push(row.join(','));
    });
    
    const csvContent = rows.join('\n');
    this.downloadCSV(csvContent, `${fileName}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  }
  
  /**
   * Export to JSON
   */
  private exportToJSON(data: AnalyticsExportData, fileName: string): void {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  /**
   * Download CSV file
   */
  private downloadCSV(content: string, fileName: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  /**
   * Escape CSV special characters
   */
  private escapeCSV(text: string): string {
    if (!text) return '';
    
    // If contains comma, quotes, or newline, wrap in quotes
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      // Escape quotes by doubling them
      text = text.replace(/"/g, '""');
      return `"${text}"`;
    }
    
    return text;
  }
  
  /**
   * Generate a summary report
   */
  generateSummaryReport(data: AnalyticsExportData): string {
    const report: string[] = [];
    
    report.push('═══════════════════════════════════════');
    report.push('        STUDY FLOW AI - SUMMARY REPORT');
    report.push('═══════════════════════════════════════');
    report.push('');
    report.push(`Generated: ${new Date().toLocaleString()}`);
    report.push('');
    
    if (data.studyMetrics) {
      report.push('📊 STUDY METRICS');
      report.push('─────────────────');
      report.push(`  Total Study Time: ${data.studyMetrics.totalHours} hours`);
      report.push(`  Sessions Completed: ${data.studyMetrics.sessionsCompleted}`);
      report.push(`  Average Session: ${data.studyMetrics.averageSessionLength} minutes`);
      report.push(`  Weekly Goal: ${data.studyMetrics.weeklyGoalProgress}% complete`);
      report.push(`  Focus Score: ${data.studyMetrics.focusScore}/100`);
      report.push(`  Current Streak: ${data.studyMetrics.streakDays} days`);
      report.push('');
    }
    
    if (data.productivityScore !== undefined) {
      report.push('🎯 PRODUCTIVITY');
      report.push('─────────────────');
      report.push(`  Overall Score: ${data.productivityScore}/100`);
      report.push(`  Completion Rate: ${data.completionRate}%`);
      report.push('');
    }
    
    if (data.subjectData && data.subjectData.length > 0) {
      report.push('📚 TOP SUBJECTS');
      report.push('─────────────────');
      data.subjectData.slice(0, 5).forEach((subject: SubjectDataPoint, index: number) => {
        report.push(`  ${index + 1}. ${subject.name}: ${subject.value} hours`);
      });
      report.push('');
    }
    
    if (data.performanceData) {
      report.push('📈 PERFORMANCE');
      report.push('─────────────────');
      data.performanceData.forEach((metric: PerformanceMetric) => {
        const percentage = Math.round((metric.current / metric.target) * 100);
        report.push(`  ${metric.subject}: ${metric.current}/${metric.target} (${percentage}%)`);
      });
      report.push('');
    }
    
    report.push('═══════════════════════════════════════');
    
    return report.join('\n');
  }
}

export const exportService = ExportService.getInstance();