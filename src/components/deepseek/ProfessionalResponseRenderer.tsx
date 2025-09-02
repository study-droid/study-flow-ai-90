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
  Award
} from 'lucide-react';
import { FormattedResponse } from '@/services/deepseek/response-formatter';
import { ProcessingResult } from '@/services/deepseek/post-processing-pipeline';

export interface ProfessionalResponseRendererProps {
  result: ProcessingResult;
  onProgressUpdate?: (taskId: string, completed: boolean) => void;
  showMetadata?: boolean;
  showQualityMetrics?: boolean;
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
  className = ''
}) => {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('content');

  const { formattedResponse, qualityAssessment, processingMetadata } = result || {};
  
  // Safety checks for undefined properties
  if (!formattedResponse || !qualityAssessment || !processingMetadata) {
    return (
      <div className={`p-4 border border-red-200 rounded-lg ${className}`}>
        <div className="text-red-600">
          <AlertCircle className="inline h-4 w-4 mr-2" />
          Error: Invalid response data structure
        </div>
      </div>
    );
  }

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
      type: 'header' | 'content' | 'task' | 'example';
    }> = [];

    const lines = content.split('\n');
    let currentSection: typeof sections[0] | null = null;
    let sectionId = 0;

    lines.forEach((line, index) => {
      const headerMatch = line.match(/^(#{1,6})\s*(.+)/);
      
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();
        currentSection = {
          id: `section-${++sectionId}`,
          title,
          content: '',
          level,
          type: 'header'
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      } else if (line.trim()) {
        // Content without header
        sections.push({
          id: `content-${++sectionId}`,
          title: '',
          content: line + '\n',
          level: 0,
          type: 'content'
        });
      }
    });

    // Add final section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
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

  // Render study plan specific components
  const renderStudyPlan = () => {
    const content = formattedResponse.content;
    
    return (
      <div className="space-y-6">
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

  // Render quality metrics
  const renderQualityMetrics = () => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
      {Object.entries(qualityAssessment.breakdown).map(([key, value]) => (
        <div key={key} className="text-center">
          <div className={`text-lg font-semibold ${getQualityColor(value)}`}>
            {value}%
          </div>
          <div className="text-xs text-gray-600 capitalize">
            {key.replace('_', ' ')}
          </div>
        </div>
      ))}
    </div>
  );

  // Render metadata
  const renderMetadata = () => (
    <div className="space-y-4 text-sm text-gray-600">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <span className="font-semibold">Processing Time:</span>
          <br />
          {processingMetadata.processingTime}ms
        </div>
        <div>
          <span className="font-semibold">Steps:</span>
          <br />
          {processingMetadata?.stepsCompleted?.length || 0}
        </div>
        <div>
          <span className="font-semibold">Optimizations:</span>
          <br />
          {processingMetadata?.optimizations?.length || 0}
        </div>
        <div>
          <span className="font-semibold">Warnings:</span>
          <br />
          {processingMetadata?.warnings?.length || 0}
        </div>
      </div>
      
      {(processingMetadata?.optimizations?.length || 0) > 0 && (
        <div>
          <span className="font-semibold">Applied Optimizations:</span>
          <ul className="list-disc list-inside mt-1">
            {processingMetadata.optimizations.map((opt, idx) => (
              <li key={idx} className="text-green-600">{opt}</li>
            ))}
          </ul>
        </div>
      )}
      
      {(processingMetadata?.warnings?.length || 0) > 0 && (
        <div>
          <span className="font-semibold">Warnings:</span>
          <ul className="list-disc list-inside mt-1">
            {processingMetadata.warnings.map((warning, idx) => (
              <li key={idx} className="text-yellow-600">{warning}</li>
            ))}
          </ul>
        </div>
      )}
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
                variant={getQualityBadgeVariant(qualityAssessment.overallScore)}
                className="ml-2"
              >
                Quality: {qualityAssessment.overallScore}%
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
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="structure">Structure</TabsTrigger>
            {showQualityMetrics && (
              <TabsTrigger value="quality">Quality</TabsTrigger>
            )}
            {showMetadata && (
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="content" className="mt-6">
            <div className="space-y-6">
              {/* Response type specific rendering */}
              {formattedResponse.metadata?.responseType === 'study_plan' && renderStudyPlan()}
              
              {/* Main content sections */}
              {sections.map((section) => (
                <div key={section.id} className="space-y-3">
                  {section.title && (
                    <div className={`font-semibold ${
                      section.level === 1 ? 'text-2xl text-gray-900' :
                      section.level === 2 ? 'text-xl text-gray-800' :
                      section.level === 3 ? 'text-lg text-gray-700' :
                      'text-base text-gray-600'
                    }`}>
                      {section.title}
                    </div>
                  )}
                  
                  <div className="prose prose-sm max-w-none">
                    {section.content.split('\n').map((line, idx) => {
                      if (line.trim() === '') return <br key={idx} />;
                      
                      // Handle special formatting
                      if (line.includes('**Example:**')) {
                        return (
                          <div key={idx} className="bg-green-50 border-l-4 border-green-400 p-3 my-2">
                            <div className="flex items-start">
                              <Lightbulb className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                              <div dangerouslySetInnerHTML={{ 
                                __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') 
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
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="structure" className="mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Content Structure</h3>
              <div className="space-y-2">
                {formattedResponse.structure.sections.map((section, idx) => (
                  <div key={idx} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    <BookOpen className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">{section}</span>
                  </div>
                ))}
              </div>
              
              {formattedResponse.structure?.headers?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Headings Structure</h4>
                  <div className="space-y-1">
                    {formattedResponse.structure.headers.map((header, idx) => (
                      <div 
                        key={idx} 
                        className="text-sm text-gray-600"
                        style={{ paddingLeft: `${header.level * 12}px` }}
                      >
                        {header.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {showQualityMetrics && (
            <TabsContent value="quality" className="mt-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Quality Assessment</h3>
                  <div className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="text-xl font-bold">
                      {qualityAssessment.overallScore}/100
                    </span>
                  </div>
                </div>
                
                <Progress value={qualityAssessment.overallScore} className="w-full" />
                
                {renderQualityMetrics()}
                
                {(qualityAssessment?.recommendations?.length || 0) > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Recommendations
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      {qualityAssessment.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
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