/**
 * Tables Page - Professional Table Creation and Management
 * AI-powered table generation with comprehensive management features
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table as TableIcon, 
  ArrowLeft, 
  Plus, 
  Sparkles, 
  History, 
  BookOpen,
  BarChart3,
  FileSpreadsheet,
  Brain,
  Zap,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import existing table components
import { TableBuilder } from '@/components/tables/TableBuilder';
import type { TableConfig } from '@/types/table-types';

// Quick table templates for common use cases
const TABLE_TEMPLATES = [
  {
    id: 'study-schedule',
    name: 'Study Schedule',
    description: 'Weekly study planner with subjects and time slots',
    icon: BookOpen,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    params: {
      description: 'Weekly study schedule with subjects, time slots, and priorities',
      rows: 7,
      columns: 5
    }
  },
  {
    id: 'grade-tracker',
    name: 'Grade Tracker',
    description: 'Track assignments, tests, and overall performance',
    icon: BarChart3,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    params: {
      description: 'Grade tracking table with assignments, dates, scores, and weighted averages',
      rows: 10,
      columns: 6
    }
  },
  {
    id: 'research-data',
    name: 'Research Data',
    description: 'Organize research findings and references',
    icon: FileSpreadsheet,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    params: {
      description: 'Research data table with sources, findings, dates, and categories',
      rows: 8,
      columns: 5
    }
  },
  {
    id: 'project-timeline',
    name: 'Project Timeline',
    description: 'Plan and track project milestones',
    icon: TrendingUp,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    params: {
      description: 'Project timeline with tasks, deadlines, status, and team members',
      rows: 12,
      columns: 6
    }
  },
  {
    id: 'group-collaboration',
    name: 'Group Work',
    description: 'Coordinate team assignments and responsibilities',
    icon: Users,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
    params: {
      description: 'Group collaboration table with members, roles, tasks, and deadlines',
      rows: 6,
      columns: 5
    }
  }
];

const Tables: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'create' | 'templates' | 'history'>('create');
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TABLE_TEMPLATES[0] | null>(null);
  const [generatedTables, setGeneratedTables] = useState<TableConfig[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Clear messages after timeout
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleTableGenerated = (config: TableConfig) => {
    setGeneratedTables(prev => [config, ...prev]);
    setSuccess('Table generated successfully!');
    setActiveTab('history');
  };

  const handleError = (errorMessage: string) => {
    console.error('Table generation error:', errorMessage);
    
    // Provide more user-friendly error messages
    let friendlyMessage = errorMessage;
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      friendlyMessage = 'Unable to connect to AI service. Please check your internet connection and try again.';
    } else if (errorMessage.includes('timeout')) {
      friendlyMessage = 'Table generation is taking longer than expected. Please try with a simpler description.';
    } else if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
      friendlyMessage = 'Authentication error. Please refresh the page and try again.';
    } else if (errorMessage.includes('rate limit')) {
      friendlyMessage = 'Too many requests. Please wait a moment before trying again.';
    }
    
    setError(friendlyMessage);
    setIsGenerating(false);
  };

  const handleTemplateSelect = (template: typeof TABLE_TEMPLATES[0]) => {
    setSelectedTemplate(template);
    setActiveTab('create');
  };

  const clearTemplate = () => {
    setSelectedTemplate(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <TableIcon className="w-5 h-5 text-white" />
                </div>
                AI Table Creator
              </h1>
              <p className="text-muted-foreground mt-1">
                Create professional tables with AI assistance for your studies
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Brain className="w-3 h-3" />
              AI Powered
            </Badge>
            {generatedTables.length > 0 && (
              <Badge variant="outline">
                {generatedTables.length} table{generatedTables.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <Alert className="mb-6 border-destructive/20 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive font-medium">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-500/20 bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-600 dark:text-green-400 font-medium">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Create Tab */}
          <TabsContent value="create" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TableIcon className="w-5 h-5" />
                      {selectedTemplate ? `Create ${selectedTemplate.name}` : 'Create Custom Table'}
                    </CardTitle>
                    {selectedTemplate && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Template: {selectedTemplate.name}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearTemplate}
                          className="h-6 text-xs"
                        >
                          Clear Template
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <TableBuilder
                      onTableGenerated={handleTableGenerated}
                      onError={handleError}
                      initialParams={selectedTemplate?.params}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">AI Features</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>Smart column detection</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4 text-primary" />
                      <span>Auto data population</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Brain className="w-4 h-4 text-primary" />
                      <span>Context-aware formatting</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FileSpreadsheet className="w-4 h-4 text-primary" />
                      <span>Multiple export formats</span>
                    </div>
                  </CardContent>
                </Card>

                {selectedTemplate && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <selectedTemplate.icon className={cn("w-5 h-5", selectedTemplate.color)} />
                        {selectedTemplate.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {selectedTemplate.description}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-medium">Rows:</span> {selectedTemplate.params.rows}
                        </div>
                        <div>
                          <span className="font-medium">Columns:</span> {selectedTemplate.params.columns}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Choose a Template</CardTitle>
                <p className="text-muted-foreground">
                  Quick-start templates for common study and academic needs
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {TABLE_TEMPLATES.map((template) => {
                    const Icon = template.icon;
                    return (
                      <Card
                        key={template.id}
                        className={cn(
                          "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
                          selectedTemplate?.id === template.id && "ring-2 ring-primary bg-primary/5"
                        )}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              template.bgColor
                            )}>
                              <Icon className={cn("w-5 h-5", template.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm">{template.name}</h3>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {template.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  {template.params.rows}×{template.params.columns}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Generated Tables</CardTitle>
                <p className="text-muted-foreground">
                  Your recently created tables
                </p>
              </CardHeader>
              <CardContent>
                {generatedTables.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TableIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No tables created yet</p>
                    <p className="text-sm">Create your first table to see it here</p>
                    <Button
                      className="mt-4"
                      onClick={() => setActiveTab('create')}
                    >
                      Create Table
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {generatedTables.map((table, index) => (
                      <Card key={index} className="border border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">
                                Table {generatedTables.length - index}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {table.columns.length} columns • {table.data.length} rows
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {table.columns.slice(0, 3).map((col) => (
                                  <Badge key={col.id} variant="outline" className="text-xs">
                                    {col.title}
                                  </Badge>
                                ))}
                                {table.columns.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{table.columns.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Tables;