/**
 * Professional Response Renderer
 * Renders structured AI responses with professional formatting
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  Target, 
  BookOpen, 
  CheckCircle2, 
  Circle,
  Star,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  Award,
  FileText,
  List,
  Table,
  Code,
  Hash,
  BarChart3,
  Timer,
  Users,
  Zap
} from 'lucide-react';
import { FormattedResponse } from '@/services/deepseek/response-formatter';
import { ProcessingResult } from '@/services/deepseek/post-processing-pipeline';

export interface ProfessionalResponseRendererProps {
  result: ProcessingResult;
  onProgressUpdate?: (taskId: string, completed: boolean) => void;
  showMetadata?: boolean;
  showQualityMetrics?: boolean;
  showValidationResults?: boolean;
  showEducationalValidation?: boolean;
  className?: string;
}

/**
 * Professional Response Renderer Component
 */
export const ProfessionalResponseRenderer: React.FC<ProfessionalResponseRendererProps> = ({
  result,
  onProgressUpdate,
  showMetadata = false,
  showQualityMetrics = false,
  showValidationResults = false,
  showEducationalValidation = false,
  className = ''
}) => {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('content');

  const { formattedResponse, qualityAssessment, processingMetadata, validationResult, educationalValidation } = result || {};
  
  // Safety checks for undefined properties
  if (!formattedResponse) {
    return (
      <div className={`p-4 border border-red-200 rounded-lg ${className}`}>
        <div className="text-red-600">
          <AlertCircle className="inline h-4 w-4 mr-2" />
          Error: Invalid response data structure - missing formatted response
        </div>
      </div>
    );
  }
  
  // Provide defaults for missing data
  const safeQualityAssessment = qualityAssessment || {
    overallScore: 0,
    breakdown: { structure: 0, consistency: 0, formatting: 0, completeness: 0, educational: 0 },
    recommendations: ['Unable to assess quality - missing quality data']
  };
  
  const safeProcessingMetadata = processingMetadata || {
    processingTime: 0,
    stepsCompleted: [],
    warnings: ['Missing processing metadata'],
    optimizations: []
  };

  // Quality score color coding
  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 75) return 'secondary';
    if (score >= 60) return 'outline';
    return 'destructive';
  };

  // Handle task completion
  const handleTaskToggle = (taskId: string) => {
    const newCompletedTasks = new Set(completedTasks);
    const isCompleting = !completedTasks.has(taskId);
    
    if (isCompleting) {
      newCompletedTasks.add(taskId);
    } else {
      newCompletedTasks.delete(taskId);
    }
    
    setCompletedTasks(newCompletedTasks);
    onProgressUpdate?.(taskId, isCompleting);
  };

  // Parse markdown content for structured rendering
  const parseContent = (content: string) => {
    const sections: Array<{
      id: string;
      title: string;
      content: string;
      level: number;
      type: 'header' | 'content' | 'task' | 'example' | 'definition' | 'summary';
      wordCount: number;
      hasExamples: boolean;
      hasTasks: boolean;
      difficulty?: 'easy' | 'medium' | 'hard';
    }> = [];

    const lines = content.split('\n');
    let currentSection: typeof sections[0] | null = null;
    let sectionId = 0;

    lines.forEach((line, index) => {
      const headerMatch = line.match(/^(#{1,6})\s*(.+)/);
      
      if (headerMatch) {
        // Save previous section with analysis
        if (currentSection) {
          const words = currentSection.content.split(/\s+/).filter(w => w.length > 0).length;
          currentSection.wordCount = words;
          currentSection.hasExamples = /example|demonstration|instance/i.test(currentSection.content);
          currentSection.hasTasks = /- \[[ x]\]/.test(currentSection.content);
          currentSection.difficulty = getDifficultyFromContent(currentSection.content);
          sections.push(currentSection);
        }
        
        // Start new section
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();
        let type: 'header' | 'content' | 'task' | 'example' | 'definition' | 'summary' = 'header';
        
        // Classify section type based on title
        if (/definition|define|what is/i.test(title)) type = 'definition';
        else if (/example|instance|demonstration/i.test(title)) type = 'example';
        else if (/summary|conclusion|takeaway/i.test(title)) type = 'summary';
        else if (/task|exercise|practice|activity/i.test(title)) type = 'task';
        
        currentSection = {
          id: `section-${++sectionId}`,
          title,
          content: '',
          level,
          type,
          wordCount: 0,
          hasExamples: false,
          hasTasks: false
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      } else if (line.trim()) {
        // Content without header
        const words = line.split(/\s+/).filter(w => w.length > 0).length;
        sections.push({
          id: `content-${++sectionId}`,
          title: '',
          content: line + '\n',
          level: 0,
          type: 'content',
          wordCount: words,
          hasExamples: /example|demonstration|instance/i.test(line),
          hasTasks: /- \[[ x]\]/.test(line)
        });
      }
    });

    // Add final section with analysis
    if (currentSection) {
      const words = currentSection.content.split(/\s+/).filter(w => w.length > 0).length;
      currentSection.wordCount = words;
      currentSection.hasExamples = /example|demonstration|instance/i.test(currentSection.content);
      currentSection.hasTasks = /- \[[ x]\]/.test(currentSection.content);
      currentSection.difficulty = getDifficultyFromContent(currentSection.content);
      sections.push(currentSection);
    }

    return sections;
  };

  // Helper function to determine content difficulty
  const getDifficultyFromContent = (content: string): 'easy' | 'medium' | 'hard' => {
    const lower = content.toLowerCase();
    const complexWords = ['advanced', 'complex', 'sophisticated', 'intricate', 'comprehensive'];
    const mediumWords = ['intermediate', 'moderate', 'detailed', 'thorough'];
    
    if (complexWords.some(word => lower.includes(word))) return 'hard';
    if (mediumWords.some(word => lower.includes(word))) return 'medium';
    return 'easy';
  };

  // Render checkbox tasks
  const renderTasks = (content: string) => {
    const taskRegex = /^(\s*)- \[([ x])\]\s*(.+)$/gm;
    let match;
    const tasks: Array<{
      id: string;
      text: string;
      completed: boolean;
      indent: number;
    }> = [];

    while ((match = taskRegex.exec(content)) !== null) {
      tasks.push({
        id: `task-${tasks.length}`,
        text: match[3],
        completed: match[2] === 'x',
        indent: match[1].length
      });
    }

    if (tasks.length === 0) return null;

    return (
      <div className="space-y-2 my-4">
        <h4 className="font-semibold text-sm text-gray-600 flex items-center">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Progress Tracking
        </h4>
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-start space-x-2 p-2 rounded border ${
              completedTasks.has(task.id) || task.completed
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
            style={{ marginLeft: `${task.indent * 8}px` }}
          >
            <button
              onClick={() => handleTaskToggle(task.id)}
              className="mt-1"
            >
              {completedTasks.has(task.id) || task.completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Circle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
            <span
              className={`text-sm ${
                completedTasks.has(task.id) || task.completed
                  ? 'line-through text-gray-500'
                  : 'text-gray-800'
              }`}
            >
              {task.text}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Render emoji indicators section
  const renderEmojiSection = (content: string, title: string, emoji: string, icon: React.ElementType) => {
    const sectionRegex = new RegExp(`${emoji}\\s*\\*\\*${title}:?\\*\\*([^#]*?)(?=\\n\\n|\\n[🎯⏱️📚]|$)`, 's');
    const match = content.match(sectionRegex);
    
    if (!match) return null;

    const Icon = icon;
    const sectionContent = match[1].trim();

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-blue-800 flex items-center mb-2">
          <Icon className="h-4 w-4 mr-2" />
          {title}
        </h4>
        <div className="text-sm text-blue-700 whitespace-pre-line">
          {sectionContent}
        </div>
      </div>
    );
  };

  // Render educational response type specific components
  const renderEducationalEnhancements = () => {
    const content = formattedResponse.content;
    const responseType = formattedResponse.metadata?.responseType;
    
    switch (responseType) {
      case 'study_plan':
        return renderStudyPlan(content);
      case 'practice':
        return renderPracticeQuestions(content);
      case 'concept':
        return renderConceptExplanation(content);
      case 'explanation':
      default:
        return renderGeneralExplanation(content);
    }
  };
  
  // Render study plan specific components
  const renderStudyPlan = (content: string) => {
    return (
      <div className="space-y-6">
        {/* Study Plan Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2 flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Study Plan Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>{formattedResponse.metadata?.totalHours || 'TBD'} hours total</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span>{formattedResponse.metadata?.difficulty || 'Medium'} difficulty</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <span>{formattedResponse.metadata?.weeklyGoals?.length || 0} weekly goals</span>
            </div>
          </div>
        </div>
        
        {/* Learning Goals */}
        {renderEmojiSection(content, 'Learning Goals', '🎯', Target)}
        
        {/* Time Estimate */}
        {renderEmojiSection(content, 'Time Estimate', '⏱️', Clock)}
        
        {/* Resources */}
        {renderEmojiSection(content, 'Resources', '📚', BookOpen)}
        
        {/* Progress Tracking */}
        {renderTasks(content)}
      </div>
    );
  };
  
  // Render practice questions specific components
  const renderPracticeQuestions = (content: string) => {
    const questionCount = (content.match(/Question\s+\d+|^\s*\d+\./gm) || []).length;
    
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-800 mb-2 flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Practice Session
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Hash className="h-4 w-4 text-green-600" />
              <span>{questionCount} questions</span>
            </div>
            <div className="flex items-center space-x-2">
              <Timer className="h-4 w-4 text-green-600" />
              <span>~{questionCount * 5} minutes</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span>{formattedResponse.metadata?.difficulty || 'Mixed'} level</span>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render concept explanation specific components
  const renderConceptExplanation = (content: string) => {
    return (
      <div className="space-y-4">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-purple-800 mb-2 flex items-center">
            <Lightbulb className="h-5 w-5 mr-2" />
            Concept Learning
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-purple-600" />
              <span>Detailed explanation provided</span>
            </div>
            <div className="flex items-center space-x-2">
              <Timer className="h-4 w-4 text-purple-600" />
              <span>{formattedResponse.metadata?.estimatedReadTime || 5} min read</span>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render general explanation components
  const renderGeneralExplanation = (content: string) => {
    const hasExamples = content.toLowerCase().includes('example');
    const hasKeyPoints = content.toLowerCase().includes('key point');
    
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Explanation Overview
          </h3>
          <div className="flex flex-wrap gap-2">
            {hasExamples && (
              <Badge variant="outline" className="text-green-600">
                <Lightbulb className="h-3 w-3 mr-1" />
                Examples included
              </Badge>
            )}
            {hasKeyPoints && (
              <Badge variant="outline" className="text-blue-600">
                <Star className="h-3 w-3 mr-1" />
                Key points highlighted
              </Badge>
            )}
            <Badge variant="outline" className="text-gray-600">
              <Timer className="h-3 w-3 mr-1" />
              {formattedResponse.metadata?.estimatedReadTime || Math.ceil(content.split(/\s+/).length / 200)} min read
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  // Render quality metrics
  const renderQualityMetrics = () => {
    const metrics = safeQualityAssessment.breakdown || {};
    const metricDetails = {
      structure: { icon: Hash, color: 'blue', description: 'Content organization and hierarchy' },
      consistency: { icon: CheckCircle2, color: 'green', description: 'Formatting and style consistency' },
      formatting: { icon: Zap, color: 'purple', description: 'Markdown and visual formatting' },
      completeness: { icon: Target, color: 'orange', description: 'Content depth and thoroughness' },
      educational: { icon: Lightbulb, color: 'yellow', description: 'Educational value and clarity' }
    };

    return (
      <div className="space-y-4">
        {/* Individual Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(metrics).map(([key, value]) => {
            const detail = metricDetails[key] || { icon: AlertCircle, color: 'gray', description: 'Quality metric' };
            const Icon = detail.icon;
            const score = typeof value === 'number' ? value : 0;
            
            return (
              <div key={key} className={`p-4 rounded-lg border bg-${detail.color}-50 border-${detail.color}-200`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-5 w-5 text-${detail.color}-600`} />
                    <span className="font-semibold capitalize text-gray-800">
                      {key.replace('_', ' ')}
                    </span>
                  </div>
                  <div className={`text-2xl font-bold ${getQualityColor(score)}`}>
                    {score}%
                  </div>
                </div>
                <div className="mb-3">
                  <Progress value={score} className="h-2" />
                </div>
                <p className="text-xs text-gray-600">{detail.description}</p>
              </div>
            );
          })}
        </div>
        
        {/* Overall Score Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-800">Overall Quality Score</h4>
            <div className="flex items-center space-x-2">
              <Star className="h-6 w-6 text-yellow-500" />
              <span className="text-3xl font-bold text-gray-800">
                {safeQualityAssessment.overallScore}%
              </span>
            </div>
          </div>
          <Progress value={safeQualityAssessment.overallScore} className="h-3 mb-2" />
          <div className="flex justify-between text-sm text-gray-600">
            <span>Quality Rating:</span>
            <span className={`font-semibold ${
              safeQualityAssessment.overallScore >= 90 ? 'text-green-600' :
              safeQualityAssessment.overallScore >= 75 ? 'text-blue-600' :
              safeQualityAssessment.overallScore >= 60 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {safeQualityAssessment.overallScore >= 90 ? 'Excellent' :
               safeQualityAssessment.overallScore >= 75 ? 'Good' :
               safeQualityAssessment.overallScore >= 60 ? 'Fair' : 'Needs Improvement'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render metadata
  const renderMetadata = () => (
    <div className="space-y-6">
      {/* Processing Overview */}
      <div>
        <h4 className="font-semibold mb-3 flex items-center">
          <Zap className="h-4 w-4 mr-2" />
          Processing Overview
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <Timer className="h-6 w-6 text-blue-600 mx-auto mb-1" />
            <div className="text-sm font-semibold">{safeProcessingMetadata.processingTime}ms</div>
            <div className="text-xs text-gray-600">Processing Time</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <div className="text-sm font-semibold">{safeProcessingMetadata?.stepsCompleted?.length || 0}</div>
            <div className="text-xs text-gray-600">Steps Completed</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-1" />
            <div className="text-sm font-semibold">{safeProcessingMetadata?.optimizations?.length || 0}</div>
            <div className="text-xs text-gray-600">Optimizations</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg text-center">
            <AlertCircle className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
            <div className="text-sm font-semibold">{safeProcessingMetadata?.warnings?.length || 0}</div>
            <div className="text-xs text-gray-600">Warnings</div>
          </div>
        </div>
      </div>

      {/* Processing Steps */}
      {safeProcessingMetadata?.stepsCompleted && safeProcessingMetadata.stepsCompleted.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 flex items-center">
            <List className="h-4 w-4 mr-2" />
            Processing Pipeline Steps
          </h4>
          <div className="space-y-2">
            {safeProcessingMetadata.stepsCompleted.map((step, idx) => (
              <div key={idx} className="flex items-center space-x-3 p-2 bg-green-50 border border-green-200 rounded">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium capitalize">{step.replace('_', ' ')}</span>
                <Badge variant="outline" className="text-xs">
                  Step {idx + 1}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Applied Optimizations */}
      {(safeProcessingMetadata?.optimizations?.length || 0) > 0 && (
        <div>
          <h4 className="font-semibold mb-3 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
            Applied Optimizations
          </h4>
          <div className="space-y-2">
            {safeProcessingMetadata.optimizations.map((opt, idx) => (
              <div key={idx} className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm text-green-800">{opt}</span>
                </div>
                <Badge variant="outline" className="text-xs text-green-600">
                  Enhancement
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Warnings */}
      {(safeProcessingMetadata?.warnings?.length || 0) > 0 && (
        <div>
          <h4 className="font-semibold mb-3 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
            Processing Warnings
          </h4>
          <div className="space-y-2">
            {safeProcessingMetadata.warnings.map((warning, idx) => (
              <div key={idx} className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm text-yellow-800">{warning}</span>
                </div>
                <Badge variant="outline" className="text-xs text-yellow-600">
                  Warning
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h4 className="font-semibold mb-3 flex items-center">
          <BarChart3 className="h-4 w-4 mr-2" />
          Performance Metrics
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Processing Efficiency:</span>
            <div className="mt-1">
              <Progress 
                value={Math.max(0, Math.min(100, 100 - (safeProcessingMetadata.processingTime / 10)))} 
                className="h-2" 
              />
              <span className="text-xs text-gray-500 mt-1 block">
                {safeProcessingMetadata.processingTime < 500 ? 'Excellent' :
                 safeProcessingMetadata.processingTime < 1000 ? 'Good' :
                 safeProcessingMetadata.processingTime < 2000 ? 'Fair' : 'Slow'}
              </span>
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Pipeline Health:</span>
            <div className="mt-1">
              <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                (safeProcessingMetadata?.warnings?.length || 0) === 0 ? 'bg-green-100 text-green-800' :
                (safeProcessingMetadata?.warnings?.length || 0) < 3 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {(safeProcessingMetadata?.warnings?.length || 0) === 0 ? 'Healthy' :
                 (safeProcessingMetadata?.warnings?.length || 0) < 3 ? 'Minor Issues' : 'Attention Needed'}
              </div>
            </div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Optimization Rate:</span>
            <div className="mt-1">
              <span className="text-lg font-semibold text-purple-600">
                {Math.round(((safeProcessingMetadata?.optimizations?.length || 0) / Math.max(1, (safeProcessingMetadata?.stepsCompleted?.length || 1))) * 100)}%
              </span>
              <span className="text-xs text-gray-500 block">
                {safeProcessingMetadata?.optimizations?.length || 0} optimizations applied
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const sections = useMemo(() => parseContent(formattedResponse.content), [formattedResponse.content]);

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Professional AI Response</span>
              <Badge 
                variant={getQualityBadgeVariant(safeQualityAssessment.overallScore)}
                className="ml-2"
              >
                Quality: {safeQualityAssessment.overallScore}%
              </Badge>
            </CardTitle>
            
            {formattedResponse.metadata && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formattedResponse.metadata.timeEstimate && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {formattedResponse.metadata.timeEstimate}
                  </Badge>
                )}
                {formattedResponse.metadata.difficulty && (
                  <Badge variant="outline" className="text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {formattedResponse.metadata.difficulty}
                  </Badge>
                )}
                {formattedResponse.metadata.responseType && (
                  <Badge variant="outline" className="text-xs">
                    {formattedResponse.metadata.responseType}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="structure">Structure</TabsTrigger>
            {showQualityMetrics && (
              <TabsTrigger value="quality">Quality</TabsTrigger>
            )}
            {showValidationResults && (
              <TabsTrigger value="validation">Validation</TabsTrigger>
            )}
            {showEducationalValidation && (
              <TabsTrigger value="educational">Educational</TabsTrigger>
            )}
            {showMetadata && (
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="content" className="mt-6">
            <div className="space-y-6">
              {/* Content Overview */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Content Overview
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{sections.length} sections</span>
                    <span>•</span>
                    <span>{formattedResponse.content.split(/\s+/).length} words</span>
                    <span>•</span>
                    <span>{Math.ceil(formattedResponse.content.split(/\s+/).length / 200)} min read</span>
                  </div>
                </div>
                
                {/* Section Type Distribution */}
                <div className="flex flex-wrap gap-2">
                  {['definition', 'example', 'task', 'summary'].map(type => {
                    const count = sections.filter(s => s.type === type).length;
                    if (count === 0) return null;
                    
                    const colorMap = {
                      definition: 'bg-blue-100 text-blue-800',
                      example: 'bg-green-100 text-green-800',
                      task: 'bg-purple-100 text-purple-800',
                      summary: 'bg-orange-100 text-orange-800'
                    };
                    
                    return (
                      <Badge key={type} className={`text-xs ${colorMap[type]}`}>
                        {count} {type}{count > 1 ? 's' : ''}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              
              {/* Response type specific rendering */}
              {renderEducationalEnhancements()}
              
              {/* Main content sections */}
              {sections.map((section) => {
                const getSectionIcon = (type: string) => {
                  switch (type) {
                    case 'definition': return BookOpen;
                    case 'example': return Lightbulb;
                    case 'task': return Target;
                    case 'summary': return CheckCircle2;
                    default: return FileText;
                  }
                };
                
                const getSectionColor = (type: string) => {
                  switch (type) {
                    case 'definition': return 'border-blue-200 bg-blue-50';
                    case 'example': return 'border-green-200 bg-green-50';
                    case 'task': return 'border-purple-200 bg-purple-50';
                    case 'summary': return 'border-orange-200 bg-orange-50';
                    default: return 'border-gray-200 bg-gray-50';
                  }
                };
                
                const Icon = getSectionIcon(section.type);
                
                return (
                  <div key={section.id} className={`border rounded-lg p-4 ${getSectionColor(section.type)}`}>
                    {/* Section Header */}
                    {section.title && (
                      <div className="flex items-center justify-between mb-3">
                        <div className={`font-semibold flex items-center ${
                          section.level === 1 ? 'text-2xl text-gray-900' :
                          section.level === 2 ? 'text-xl text-gray-800' :
                          section.level === 3 ? 'text-lg text-gray-700' :
                          'text-base text-gray-600'
                        }`}>
                          <Icon className="h-5 w-5 mr-2" />
                          {section.title}
                        </div>
                        <div className="flex items-center space-x-2">
                          {section.difficulty && (
                            <Badge variant="outline" className={`text-xs ${
                              section.difficulty === 'hard' ? 'text-red-600' :
                              section.difficulty === 'medium' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {section.difficulty}
                            </Badge>
                          )}
                          {section.wordCount > 0 && (
                            <span className="text-xs text-gray-500">{section.wordCount} words</span>
                          )}
                          {section.hasExamples && (
                            <Badge variant="outline" className="text-xs text-green-600">
                              💡 Examples
                            </Badge>
                          )}
                          {section.hasTasks && (
                            <Badge variant="outline" className="text-xs text-purple-600">
                              ✓ Tasks
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Section Content */}
                    <div className="prose prose-sm max-w-none">
                      {section.content.split('\n').map((line, idx) => {
                        if (line.trim() === '') return <br key={idx} />;
                        
                        // Handle special formatting
                        if (line.includes('**Example:**') || line.includes('example:')) {
                          return (
                            <div key={idx} className="bg-green-50 border-l-4 border-green-400 p-3 my-2 rounded">
                              <div className="flex items-start">
                                <Lightbulb className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                                <div dangerouslySetInnerHTML={{ 
                                  __html: line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-green-800">$1</strong>') 
                                }} />
                              </div>
                            </div>
                          );
                        }
                        
                        // Handle key points
                        if (line.includes('**Key Point:**') || line.includes('**Important:**')) {
                          return (
                            <div key={idx} className="bg-blue-50 border-l-4 border-blue-400 p-3 my-2 rounded">
                              <div className="flex items-start">
                                <Star className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                                <div dangerouslySetInnerHTML={{ 
                                  __html: line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-blue-800">$1</strong>') 
                                }} />
                              </div>
                            </div>
                          );
                        }
                        
                        if (line.trim().startsWith('- [ ]') || line.trim().startsWith('- [x]')) {
                          return null; // Handled by renderTasks
                        }
                        
                        return (
                          <div 
                            key={idx} 
                            dangerouslySetInnerHTML={{ 
                              __html: line
                                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                                .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
                            }} 
                          />
                        );
                      })}
                    </div>
                    
                    {/* Render tasks for this section */}
                    {renderTasks(section.content)}
                    
                    {/* Section Analytics */}
                    {section.wordCount > 50 && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Reading time: ~{Math.ceil(section.wordCount / 200)} min</span>
                          <div className="flex items-center space-x-2">
                            {section.hasExamples && <span>Examples included</span>}
                            {section.hasTasks && <span>Interactive tasks</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="structure" className="mt-6">
            <div className="space-y-6">
              {/* Content Overview */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Content Analysis
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <FileText className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <div className="text-sm font-semibold">{formattedResponse.content.split(/\s+/).length}</div>
                    <div className="text-xs text-gray-600">Words</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <Timer className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <div className="text-sm font-semibold">{Math.ceil(formattedResponse.content.split(/\s+/).length / 200)}</div>
                    <div className="text-xs text-gray-600">Min Read</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <Hash className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                    <div className="text-sm font-semibold">{formattedResponse.structure?.headers?.length || 0}</div>
                    <div className="text-xs text-gray-600">Headers</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg text-center">
                    <BookOpen className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                    <div className="text-sm font-semibold">{formattedResponse.structure?.sections?.length || 0}</div>
                    <div className="text-xs text-gray-600">Sections</div>
                  </div>
                </div>
              </div>

              {/* Structural Elements */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Lists */}
                {formattedResponse.structure?.lists && formattedResponse.structure.lists.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center">
                      <List className="h-4 w-4 mr-2 text-gray-600" />
                      Lists ({formattedResponse.structure.lists.length})
                    </h4>
                    <div className="space-y-2">
                      {formattedResponse.structure.lists.map((list, idx) => (
                        <div key={idx} className="text-sm text-gray-600">
                          <span className="font-medium">{list.type}:</span> {list.items?.length || 0} items
                          {list.nested && <span className="text-blue-600 ml-1">(nested)</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tables */}
                {formattedResponse.structure?.tables && formattedResponse.structure.tables.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center">
                      <Table className="h-4 w-4 mr-2 text-gray-600" />
                      Tables ({formattedResponse.structure.tables.length})
                    </h4>
                    <div className="space-y-2">
                      {formattedResponse.structure.tables.map((table, idx) => (
                        <div key={idx} className="text-sm text-gray-600">
                          <span className="font-medium">{table.columnCount || 0} cols</span> × {table.rows?.length || 0} rows
                          {table.isValid ? (
                            <span className="text-green-600 ml-1">✓ Valid</span>
                          ) : (
                            <span className="text-red-600 ml-1">⚠ Issues</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Code Blocks */}
                {formattedResponse.structure?.codeBlocks && formattedResponse.structure.codeBlocks.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 flex items-center">
                      <Code className="h-4 w-4 mr-2 text-gray-600" />
                      Code ({formattedResponse.structure.codeBlocks.length})
                    </h4>
                    <div className="space-y-2">
                      {formattedResponse.structure.codeBlocks.map((block, idx) => (
                        <div key={idx} className="text-sm text-gray-600">
                          <span className="font-medium">{block.language || 'plain'}</span>
                          {block.isValid ? (
                            <span className="text-green-600 ml-1">✓</span>
                          ) : (
                            <span className="text-red-600 ml-1">⚠</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Content Sections */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Content Sections
                </h4>
                <div className="space-y-2">
                  {formattedResponse.structure.sections.map((section, idx) => {
                    const sectionObj = typeof section === 'string' ? { title: section, wordCount: 0, hasSubsections: false } : section;
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium">{sectionObj.title}</span>
                          {sectionObj.hasSubsections && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">has subsections</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          {sectionObj.wordCount > 0 && (
                            <span>{sectionObj.wordCount} words</span>
                          )}
                          <span className={`px-2 py-1 rounded ${
                            sectionObj.wordCount > 100 ? 'bg-green-100 text-green-800' :
                            sectionObj.wordCount > 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {sectionObj.wordCount > 100 ? 'Detailed' :
                             sectionObj.wordCount > 50 ? 'Moderate' : 'Brief'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Headings Hierarchy */}
              {formattedResponse.structure?.headers?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center">
                    <Hash className="h-4 w-4 mr-2" />
                    Heading Hierarchy
                  </h4>
                  <div className="space-y-1 bg-gray-50 p-4 rounded-lg">
                    {formattedResponse.structure.headers.map((header, idx) => {
                      const headerObj = typeof header === 'string' ? { text: header, level: 2, hasEmoji: false } : header;
                      return (
                        <div 
                          key={idx} 
                          className="flex items-center text-sm text-gray-700"
                          style={{ paddingLeft: `${(headerObj.level - 1) * 16}px` }}
                        >
                          <span className="text-gray-400 mr-2">{'#'.repeat(headerObj.level)}</span>
                          <span className="flex-1">{headerObj.text}</span>
                          <div className="flex items-center space-x-2">
                            {headerObj.hasEmoji && (
                              <span className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">📝 emoji</span>
                            )}
                            <span className="text-xs text-gray-500">H{headerObj.level}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {showQualityMetrics && (
            <TabsContent value="quality" className="mt-6">
              <div className="space-y-6">
                {/* Quality Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Quality Assessment
                  </h3>
                  <Badge 
                    variant={getQualityBadgeVariant(safeQualityAssessment.overallScore)}
                    className="text-sm px-3 py-1"
                  >
                    {safeQualityAssessment.overallScore >= 90 ? 'Excellent' :
                     safeQualityAssessment.overallScore >= 75 ? 'Good' :
                     safeQualityAssessment.overallScore >= 60 ? 'Fair' : 'Needs Improvement'}
                  </Badge>
                </div>
                
                {/* Quality Metrics */}
                {renderQualityMetrics()}
                
                {/* Recommendations */}
                {(qualityAssessment?.recommendations?.length || 0) > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center text-blue-800">
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Improvement Suggestions
                    </h4>
                    <div className="space-y-2">
                      {safeQualityAssessment.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                            <span className="text-xs text-blue-600 font-bold">{idx + 1}</span>
                          </div>
                          <span className="text-sm text-blue-700">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Quality Insights */}
                <div className="bg-gray-50 border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Quality Insights
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Strengths:</span>
                      <ul className="mt-1 space-y-1 text-gray-600">
                        {Object.entries(safeQualityAssessment.breakdown || {}).filter(([_, score]) => score >= 80).map(([metric, score]) => (
                          <li key={metric} className="flex items-center space-x-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <span className="capitalize">{metric.replace('_', ' ')} ({score}%)</span>
                          </li>
                        ))}
                        {Object.entries(safeQualityAssessment.breakdown || {}).filter(([_, score]) => score >= 80).length === 0 && (
                          <li className="text-gray-400">Review metrics for areas of strength</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Areas for Improvement:</span>
                      <ul className="mt-1 space-y-1 text-gray-600">
                        {Object.entries(safeQualityAssessment.breakdown || {}).filter(([_, score]) => score < 75).map(([metric, score]) => (
                          <li key={metric} className="flex items-center space-x-1">
                            <AlertCircle className="h-3 w-3 text-yellow-500" />
                            <span className="capitalize">{metric.replace('_', ' ')} ({score}%)</span>
                          </li>
                        ))}
                        {Object.entries(safeQualityAssessment.breakdown || {}).filter(([_, score]) => score < 75).length === 0 && (
                          <li className="text-gray-400">All metrics meet quality standards</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

          {showValidationResults && validationResult && (
            <TabsContent value="validation" className="mt-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Content Validation
                  </h3>
                  <Badge 
                    variant={validationResult.isValid ? 'default' : 'destructive'}
                    className="text-sm px-3 py-1"
                  >
                    {validationResult.isValid ? 'Valid' : 'Issues Found'}
                  </Badge>
                </div>
                
                {/* Validation Score */}
                <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Validation Score</span>
                    <span className="text-2xl font-bold">{validationResult.score}%</span>
                  </div>
                  <Progress value={validationResult.score} className="h-2" />
                </div>
                
                {/* Validation Errors */}
                {validationResult.errors && validationResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center text-red-800">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Validation Issues ({validationResult.errors.length})
                    </h4>
                    <div className="space-y-2">
                      {validationResult.errors.map((error, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <div className="flex-shrink-0 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                            <span className="text-xs text-red-600 font-bold">{idx + 1}</span>
                          </div>
                          <span className="text-sm text-red-700">{error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Validation Success */}
                {validationResult.isValid && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-green-800 font-semibold">Content passed all validation checks</span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {showEducationalValidation && educationalValidation && (
            <TabsContent value="educational" className="mt-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Lightbulb className="h-5 w-5 mr-2" />
                    Educational Assessment
                  </h3>
                  <Badge 
                    variant={educationalValidation.isValid ? 'default' : 'destructive'}
                    className="text-sm px-3 py-1"
                  >
                    {educationalValidation.isValid ? 'Educational Standards Met' : 'Needs Educational Improvement'}
                  </Badge>
                </div>
                
                {/* Educational Score */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Educational Quality Score</span>
                    <span className="text-2xl font-bold">{educationalValidation.score}%</span>
                  </div>
                  <Progress value={educationalValidation.score} className="h-2" />
                </div>
                
                {/* Failed Checks */}
                {educationalValidation.failedChecks && educationalValidation.failedChecks.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center text-yellow-800">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Educational Framework Issues ({educationalValidation.failedChecks.length})
                    </h4>
                    <div className="space-y-2">
                      {educationalValidation.failedChecks.map((check, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <div className="flex-shrink-0 w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center mt-0.5">
                            <span className="text-xs text-yellow-600 font-bold">{idx + 1}</span>
                          </div>
                          <span className="text-sm text-yellow-700">{check}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Educational Success */}
                {educationalValidation.isValid && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-green-800 font-semibold">Content meets educational framework standards</span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {showMetadata && (
            <TabsContent value="metadata" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Processing Metadata</h3>
                {renderMetadata()}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ProfessionalResponseRenderer;