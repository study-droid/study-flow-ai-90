/**
 * AI-Powered Table Builder Component
 * Provides a comprehensive interface for creating professional tables with AI assistance
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { 
  Sparkles, 
  Table as TableIcon, 
  Settings, 
  Download, 
  Eye, 
  Brain,
  Loader2,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Palette,
  Accessibility,
  Zap,
  FileText,
  Wand2
} from 'lucide-react';

import { aiTableService, type AITableRequest } from '@/services/tables/ai-table-service';
import { ariaLabels, announceToScreenReader } from '@/lib/accessibility';
import { performanceMonitor } from '@/services/performance/performance-monitor';
import { logger } from '@/services/logging/logger';
import type { 
  TableConfig, 
  TableColumn, 
  TableRow, 
  TableBuilderParams,
  TableDataType
} from '@/types/table-types';

export interface TableBuilderProps {
  onTableGenerated?: (config: TableConfig) => void;
  onError?: (error: string) => void;
  initialParams?: Partial<TableBuilderParams>;
  className?: string;
}

interface BuilderState {
  // AI Generation
  description: string;
  subject: string;
  topic: string;
  purpose: 'study' | 'analysis' | 'presentation' | 'reference' | 'comparison';
  style: 'professional' | 'academic' | 'dashboard' | 'financial' | 'educational';
  
  // Table Dimensions
  rows: number;
  columns: number;
  
  // Features
  generateSampleData: boolean;
  sampleDataContext: string;
  
  // Advanced Options
  enableAdvancedFeatures: boolean;
  selectedTemplate: string;
  
  // State
  isGenerating: boolean;
  generationProgress: number;
  generatedConfig: TableConfig | null;
  error: string | null;
  
  // Preview
  showPreview: boolean;
  previewMode: 'structure' | 'data' | 'formatted';
}

export const TableBuilder: React.FC<TableBuilderProps> = ({
  onTableGenerated,
  onError,
  initialParams,
  className
}) => {
  const [state, setState] = useState<BuilderState>({
    description: initialParams?.customConfig?.accessibility?.caption || '',
    subject: 'general',
    topic: '',
    purpose: 'presentation',
    style: 'professional',
    rows: initialParams?.rows || 10,
    columns: initialParams?.columns || 4,
    generateSampleData: initialParams?.generateSampleData ?? true,
    sampleDataContext: '',
    enableAdvancedFeatures: initialParams?.enableAllFeatures ?? true,
    selectedTemplate: initialParams?.template || 'professional',
    isGenerating: false,
    generationProgress: 0,
    generatedConfig: null,
    error: null,
    showPreview: false,
    previewMode: 'structure'
  });

  const updateState = useCallback((updates: Partial<BuilderState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const generateTable = useCallback(async () => {
    if (!state.description.trim()) {
      updateState({ error: 'Please provide a description for your table' });
      return;
    }

    updateState({ 
      isGenerating: true, 
      generationProgress: 0, 
      error: null,
      generatedConfig: null 
    });

    try {
      logger.info('Starting AI table generation', 'TableBuilder', {
        description: state.description,
        rows: state.rows,
        columns: state.columns
      });

      // Progress simulation
      const progressInterval = setInterval(() => {
        updateState(prev => ({ 
          generationProgress: Math.min(prev.generationProgress + 10, 90) 
        }));
      }, 200);

      const request: AITableRequest = {
        description: state.description,
        rows: state.rows,
        columns: state.columns,
        subject: state.subject,
        topic: state.topic || undefined,
        purpose: state.purpose,
        style: state.style,
        generateSampleData: state.generateSampleData,
        sampleDataContext: state.sampleDataContext || undefined,
        includeHeaders: true,
        includeFooters: false
      };

      const response = await aiTableService.generateTable(request);
      clearInterval(progressInterval);

      if (response.success) {
        updateState({ 
          generationProgress: 100,
          generatedConfig: response.config,
          showPreview: true,
          isGenerating: false
        });

        announceToScreenReader('Table generated successfully');
        onTableGenerated?.(response.config);

        logger.info('Table generation completed successfully', 'TableBuilder', {
          columns: response.config.columns.length,
          rows: response.config.data.length,
          processingTime: response.metadata.processingTime
        });
      } else {
        throw new Error(response.error || 'Table generation failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateState({ 
        error: errorMessage,
        isGenerating: false,
        generationProgress: 0 
      });
      
      onError?.(errorMessage);
      announceToScreenReader('Table generation failed');
      
      logger.error('Table generation failed', 'TableBuilder', error);
    }
  }, [state, onTableGenerated, onError]);

  const exportTable = useCallback(async (format: 'csv' | 'json' | 'html') => {
    if (!state.generatedConfig) return;

    try {
      const { data, columns } = state.generatedConfig;
      let exportContent = '';
      let mimeType = '';
      let fileExtension = '';

      switch (format) {
        case 'csv':
          const headers = columns.map(col => col.title).join(',');
          const rows = data.map(row => 
            columns.map(col => JSON.stringify(row.data[col.key] || '')).join(',')
          );
          exportContent = [headers, ...rows].join('\n');
          mimeType = 'text/csv';
          fileExtension = 'csv';
          break;

        case 'json':
          exportContent = JSON.stringify({
            columns: columns.map(col => ({
              id: col.id,
              title: col.title,
              dataType: col.dataType
            })),
            data: data.map(row => row.data)
          }, null, 2);
          mimeType = 'application/json';
          fileExtension = 'json';
          break;

        case 'html':
          const tableHtml = `
            <table border="1" style="border-collapse: collapse; width: 100%;">
              <thead>
                <tr>
                  ${columns.map(col => `<th style="padding: 8px; background-color: #f5f5f5;">${col.title}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${data.map(row => 
                  `<tr>${columns.map(col => 
                    `<td style="padding: 8px;">${row.data[col.key] || ''}</td>`
                  ).join('')}</tr>`
                ).join('')}
              </tbody>
            </table>
          `;
          exportContent = `<!DOCTYPE html>
<html>
<head>
  <title>Generated Table</title>
  <meta charset="utf-8">
</head>
<body>
  <h1>${state.description}</h1>
  ${tableHtml}
</body>
</html>`;
          mimeType = 'text/html';
          fileExtension = 'html';
          break;
      }

      const blob = new Blob([exportContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `table-${Date.now()}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      announceToScreenReader(`Table exported as ${format.toUpperCase()}`);

    } catch (error) {
      logger.error('Table export failed', 'TableBuilder', error);
      updateState({ error: 'Export failed. Please try again.' });
    }
  }, [state.generatedConfig, state.description]);

  const renderPreview = useMemo(() => {
    if (!state.generatedConfig || !state.showPreview) return null;

    const { columns, data } = state.generatedConfig;

    switch (state.previewMode) {
      case 'structure':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-800">{columns.length}</div>
                <div className="text-sm text-blue-600">Columns</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-800">{data.length}</div>
                <div className="text-sm text-green-600">Rows</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Zap className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-800">
                  {Math.round(data.length * columns.length / 1000)}k
                </div>
                <div className="text-sm text-purple-600">Data Points</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Column Structure</h4>
              {columns.map((col, index) => (
                <div key={col.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-mono text-gray-500">#{index + 1}</span>
                    <span className="font-medium">{col.title}</span>
                    <Badge variant="outline">{col.dataType}</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    {col.sortable && <Badge variant="secondary">Sortable</Badge>}
                    {col.filterable && <Badge variant="secondary">Filterable</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Showing first {Math.min(5, data.length)} rows
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map(col => (
                      <TableHead key={col.id}>{col.title}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.slice(0, 5).map(row => (
                    <TableRow key={row.id}>
                      {columns.map(col => (
                        <TableCell key={col.id}>
                          {String(row.data[col.key] || '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );

      case 'formatted':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
              <h4 className="font-semibold text-blue-800 mb-2">Table Configuration</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Style:</span> {state.style}
                </div>
                <div>
                  <span className="font-medium">Purpose:</span> {state.purpose}
                </div>
                <div>
                  <span className="font-medium">Pagination:</span> 
                  {state.generatedConfig.pagination?.enabled ? ' Enabled' : ' Disabled'}
                </div>
                <div>
                  <span className="font-medium">Sorting:</span>
                  {state.generatedConfig.sorting?.enabled ? ' Enabled' : ' Disabled'}
                </div>
              </div>
            </div>
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Table is ready for integration. All accessibility features and performance optimizations have been applied.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  }, [state.generatedConfig, state.showPreview, state.previewMode, state.style, state.purpose]);

  return (
    <Card className={cn('w-full max-w-6xl mx-auto', className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>AI Table Builder</span>
          <Badge variant="outline" className="ml-2">
            <Brain className="h-3 w-3 mr-1" />
            DeepSeek Powered
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="configure">Configure</TabsTrigger>
            <TabsTrigger value="preview" disabled={!state.generatedConfig}>
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6 mt-6">
            {/* AI Generation Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="description" className="text-base font-semibold">
                  Table Description
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe what kind of table you need. For example: 'A table comparing different programming languages with their features, popularity, and difficulty levels'"
                  value={state.description}
                  onChange={(e) => updateState({ description: e.target.value })}
                  className="mt-2"
                  rows={3}
                  aria-describedby="description-help"
                />
                <p id="description-help" className="text-sm text-gray-600 mt-1">
                  Be specific about the content, purpose, and any special requirements for your table.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject">Subject Area</Label>
                  <Input
                    id="subject"
                    placeholder="e.g., Computer Science, Biology, Finance"
                    value={state.subject}
                    onChange={(e) => updateState({ subject: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="topic">Specific Topic (Optional)</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Machine Learning, Cell Biology"
                    value={state.topic}
                    onChange={(e) => updateState({ topic: e.target.value })}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purpose">Purpose</Label>
                  <Select 
                    value={state.purpose} 
                    onValueChange={(value: any) => updateState({ purpose: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="study">Study Material</SelectItem>
                      <SelectItem value="analysis">Data Analysis</SelectItem>
                      <SelectItem value="presentation">Presentation</SelectItem>
                      <SelectItem value="reference">Reference Guide</SelectItem>
                      <SelectItem value="comparison">Comparison Chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="style">Style</Label>
                  <Select 
                    value={state.style} 
                    onValueChange={(value: any) => updateState({ style: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="dashboard">Dashboard</SelectItem>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="educational">Educational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rows">Number of Rows</Label>
                  <Input
                    id="rows"
                    type="number"
                    min="1"
                    max="1000"
                    value={state.rows}
                    onChange={(e) => updateState({ rows: parseInt(e.target.value) || 10 })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="columns">Number of Columns</Label>
                  <Input
                    id="columns"
                    type="number"
                    min="1"
                    max="20"
                    value={state.columns}
                    onChange={(e) => updateState({ columns: parseInt(e.target.value) || 4 })}
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="generate-sample-data"
                    checked={state.generateSampleData}
                    onCheckedChange={(checked) => updateState({ generateSampleData: checked })}
                  />
                  <Label htmlFor="generate-sample-data">Generate Sample Data</Label>
                </div>

                {state.generateSampleData && (
                  <div>
                    <Label htmlFor="sample-context">Sample Data Context (Optional)</Label>
                    <Input
                      id="sample-context"
                      placeholder="e.g., 'Use real company names and stock prices' or 'Include diverse student demographics'"
                      value={state.sampleDataContext}
                      onChange={(e) => updateState({ sampleDataContext: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>

              {state.error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}

              {state.isGenerating && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Generating table with AI...</span>
                    <span className="text-sm text-gray-500">{state.generationProgress}%</span>
                  </div>
                  <Progress value={state.generationProgress} className="w-full" />
                </div>
              )}

              <Button
                onClick={generateTable}
                disabled={state.isGenerating || !state.description.trim()}
                className="w-full"
                size="lg"
              >
                {state.isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating with AI...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Table with AI
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="configure" className="space-y-6 mt-6">
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Advanced configuration options will be available after generating a table.</p>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6 mt-6">
            {state.generatedConfig ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Table Preview</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select 
                      value={state.previewMode} 
                      onValueChange={(value: any) => updateState({ previewMode: value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="structure">Structure</SelectItem>
                        <SelectItem value="data">Data</SelectItem>
                        <SelectItem value="formatted">Config</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportTable('csv')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportTable('json')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      JSON
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportTable('html')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      HTML
                    </Button>
                  </div>
                </div>

                {renderPreview}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <TableIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Generate a table first to see the preview.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};