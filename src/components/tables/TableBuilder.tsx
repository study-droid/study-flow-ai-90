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

import { deepSeekService, type DeepSeekMessage as Message } from '@/lib/deepseek';
import { ariaLabels, announceToScreenReader } from '@/lib/accessibility';
import { performanceMonitor } from '@/services/performance/performance-monitor';
import { logger } from '@/services/logging/logger';
import type { TableConfig, TableRow, TableColumn, TableDataType } from '@/types/table-types';
import { TABLE_TEMPLATES } from './templates';

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
  
  // Generation Options
  generateSampleData: boolean;
  sampleDataContext: string;
  
  // State Management
  isGenerating: boolean;
  generationProgress: number;
  error: string | null;
  generatedConfig: TableConfig | null;
  
  // Preview Options
  showPreview: boolean;
  previewMode: 'structure' | 'data' | 'formatted';
}

export const TableBuilder: React.FC<TableBuilderProps> = ({
  onTableGenerated,
  onError,
  initialParams,
  className
}) => {
  // Initialize state with default values
  const [state, setState] = useState<BuilderState>({
    description: initialParams?.description || '',
    subject: 'General',
    topic: '',
    purpose: 'presentation',
    style: 'professional',
    rows: initialParams?.rows || 5,
    columns: initialParams?.columns || 3,
    generateSampleData: initialParams?.generateSampleData ?? true,
    sampleDataContext: '',
    isGenerating: false,
    generationProgress: 0,
    error: null,
    generatedConfig: null,
    showPreview: false,
    previewMode: 'structure'
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateUrl, setTemplateUrl] = useState<string>('');

  const updateState = useCallback((updates: Partial<BuilderState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, [generateFilename, getFallbackTableConfig]);

  const loadSelectedTemplate = useCallback(() => {
    if (!selectedTemplateId) return;
    const template = TABLE_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (!template) {
      updateState({ error: 'Selected template not found' });
      return;
    }

    try {
      const cfg = template.config;
      updateState({
        description: template.description || template.name,
        rows: cfg.data?.length || 5,
        columns: cfg.columns?.length || 3,
        generatedConfig: cfg,
        showPreview: true,
        error: null
      });
      announceToScreenReader(`Loaded template ${template.name}`);
      onTableGenerated?.(cfg);
      logger.info('Template loaded', 'TableBuilder', { id: template.id, name: template.name });
    } catch (e) {
      updateState({ error: 'Failed to load template' });
      logger.error('Failed to load template', 'TableBuilder', e);
    }
  }, [selectedTemplateId, updateState, onTableGenerated]);

  const importTemplateFromUrl = useCallback(async () => {
    const url = templateUrl?.trim();
    if (!url) {
      updateState({ error: 'Please enter a template URL' });
      return;
    }

    try {
      updateState({ error: null, isGenerating: true, generationProgress: 0 });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Failed to fetch template (${res.status})`);
      const json = await res.json();

      const cfg = convertToTableConfig(json);
      updateState({
        description: cfg.accessibility?.caption || cfg.description || 'Imported table',
        rows: cfg.data.length,
        columns: cfg.columns.length,
        generatedConfig: cfg,
        showPreview: true,
        isGenerating: false,
        generationProgress: 100
      });
      announceToScreenReader('Template imported successfully');
      onTableGenerated?.(cfg);
      logger.info('Template imported from URL', 'TableBuilder', { url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to import template';
      updateState({ error: msg, isGenerating: false, generationProgress: 0 });
      announceToScreenReader('Template import failed');
      logger.error('Template import failed', 'TableBuilder', err);
    }
  }, [templateUrl, updateState, onTableGenerated]);

  function convertToTableConfig(input: any): TableConfig {
    // If looks like a TableConfig already
    if (input && Array.isArray(input.columns) && Array.isArray(input.data)) {
      // Normalize shapes if needed
      const columns: TableColumn[] = input.columns.map((c: any, i: number) => ({
        id: c.id ?? c.key ?? `col-${i}`,
        key: c.key ?? c.accessor ?? c.id ?? `col-${i}`,
        title: c.title ?? c.header ?? `Column ${i + 1}`,
        dataType: (c.dataType as TableDataType) ?? 'string',
        sortable: c.sortable !== false,
        filterable: c.filterable !== false,
        visible: c.visible !== false,
        align: c.align ?? 'left'
      }));

      const data: TableRow[] = input.data.map((r: any, idx: number) => ({
        id: r.id ?? idx,
        data: r.data ?? r,
        selected: false
      }));

      return {
        columns,
        data,
        styling: input.styling ?? { size: 'md', striped: true, bordered: true, hoverable: true, theme: 'default' },
        accessibility: input.accessibility ?? { tableLabel: input.caption || 'Imported table', caption: input.caption || 'Imported table', enableKeyboardNavigation: true, announceUpdates: true },
        sorting: input.sorting ?? { enabled: true },
        filtering: input.filtering ?? { enabled: true, globalSearch: true },
        pagination: input.pagination ?? { enabled: data.length > 10, page: 1, pageSize: 10, showPageSizeSelector: true },
        performance: input.performance ?? { searchDebounce: 300, filterDebounce: 300 },
        export: input.export ?? { enableExport: true, formats: ['csv', 'json', 'html'], filename: 'table' }
      } as TableConfig;
    }

    // If it's an array of plain rows
    if (Array.isArray(input)) {
      return buildConfigFromPlainRows(input);
    }

    // If object with rows property
    if (input && Array.isArray(input.rows)) {
      return buildConfigFromPlainRows(input.rows);
    }

    throw new Error('Unsupported template format');
  }

  function buildConfigFromPlainRows(rows: Array<Record<string, any>>): TableConfig {
    const keys = Array.from(
      rows.reduce((set, r) => {
        Object.keys(r || {}).forEach(k => set.add(k));
        return set;
      }, new Set<string>())
    );

    const columns: TableColumn[] = keys.map((k, i) => ({
      id: `col-${i}`,
      key: k,
      title: toTitleCase(k),
      dataType: inferType(rows.map(r => r?.[k]))
    }));

    const data: TableRow[] = rows.map((r, idx) => ({ id: idx, data: r, selected: false }));

    return {
      columns,
      data,
      styling: { size: 'md', striped: true, bordered: true, hoverable: true, theme: 'default' },
      accessibility: { tableLabel: 'Imported table', caption: 'Imported data', enableKeyboardNavigation: true, announceUpdates: true },
      sorting: { enabled: true },
      filtering: { enabled: true, globalSearch: true },
      pagination: { enabled: data.length > 10, page: 1, pageSize: 10, showPageSizeSelector: true },
      performance: { searchDebounce: 300, filterDebounce: 300 },
      export: { enableExport: true, formats: ['csv', 'json', 'html'], filename: 'table' }
    } as TableConfig;
  }

  function inferType(values: any[]): TableDataType {
    const nonNull = values.filter(v => v !== null && v !== undefined);
    if (nonNull.length === 0) return 'string';
    if (nonNull.every(v => typeof v === 'number')) return 'number';
    if (nonNull.every(v => typeof v === 'boolean')) return 'boolean';
    if (nonNull.every(v => isISODateString(String(v)))) return 'date';
    return 'string';
  }

  function isISODateString(s: string): boolean {
    return /^[0-9]{4}-[0-9]{2}-[0-9]{2}(?:[T\s][0-9]{2}:[0-9]{2}(?::[0-9]{2})?)?/.test(s);
  }

  function toTitleCase(key: string): string {
    return key
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c: string) => c.toUpperCase());
  }

  // Helper method to build table generation prompt
  const buildTableGenerationPrompt = useCallback((
    description: string,
    rows: number,
    columns: number,
    subject: string,
    topic?: string,
    purpose?: string,
    style?: string,
    generateSampleData?: boolean,
    sampleDataContext?: string
  ): string => {
    return `Please generate a professional table configuration based on the following requirements:

Description: ${description}

Table Requirements:
- Rows: ${rows}
- Columns: ${columns}
- Subject: ${subject}
- Topic: ${topic || 'not specified'}
- Purpose: ${purpose || 'presentation'}
- Style: ${style || 'professional'}
- Generate Sample Data: ${generateSampleData ? 'Yes' : 'No'}
${sampleDataContext ? `- Data Context: ${sampleDataContext}` : ''}

Please provide a JSON response with the following structure:
{
  "columns": [
    {
      "id": "unique-column-id",
      "key": "data-key", 
      "title": "Column Title",
      "dataType": "string|number|boolean|date",
      "sortable": true,
      "filterable": true,
      "description": "Column description"
    }
  ],
  "sampleData": [
    {
      "id": 0,
      "data": {
        "column-key-1": "value1",
        "column-key-2": "value2"
      }
    }
  ],
  "tableLabel": "Accessible table label",
  "caption": "Table caption"
}

Ensure the data is realistic and relevant to the subject matter. Make column titles descriptive and the data meaningful for the specified purpose.`;
  }, [generateFilename, getFallbackTableConfig]);

  // Helper method to process AI response into TableConfig
  const processAITableResponse = useCallback(async (
    aiResponse: Message,
    requestParams: any
  ): Promise<TableConfig> => {
    try {
      logger.info('Processing AI table response', 'TableBuilder', {
        responseLength: aiResponse.content?.length || 0,
        requestParams
      });

      let tableData: any = {};

      // Try to extract JSON from the response
      const content = aiResponse.content;
      
      // First try to find complete JSON object
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          tableData = JSON.parse(jsonMatch[0]);
          logger.info('Successfully parsed AI response JSON', 'TableBuilder', {
            hasColumns: !!tableData.columns,
            hasSampleData: !!tableData.sampleData,
            columnsCount: tableData.columns?.length || 0,
            rowsCount: tableData.sampleData?.length || 0
          });
        } catch (parseError) {
          logger.warn('Failed to parse extracted JSON', 'TableBuilder', { 
            jsonMatch: jsonMatch[0],
            parseError 
          });
          throw new Error('Invalid JSON format in AI response');
        }
      } else {
        logger.warn('No JSON found in AI response', 'TableBuilder', { 
          content: content?.substring(0, 200) + '...' 
        });
        throw new Error('Could not find JSON in AI response');
      }

      // Validate required structure
      if (!tableData.columns || !Array.isArray(tableData.columns)) {
        logger.warn('Invalid columns structure in AI response', 'TableBuilder', { tableData });
        throw new Error('AI response missing valid columns structure');
      }

      // Build columns from AI response
      const columns: TableColumn[] = tableData.columns?.map((col: any, index: number) => ({
        id: col.id || `col-${index}`,
        key: col.key || col.id || `col-${index}`,
        title: col.title || `Column ${index + 1}`,
        dataType: col.dataType || 'string',
        sortable: col.sortable !== false,
        filterable: col.filterable !== false,
        visible: true,
        align: col.align || 'left',
        description: col.description
      })) || getDefaultColumns(requestParams.columns || 3);

      // Build data rows from AI response
      const data: TableRow[] = tableData.sampleData?.map((row: any, index: number) => ({
        id: row.id || index,
        data: row.data || {},
        selected: false
      })) || [];

      // Build complete table configuration
      const tableConfig: TableConfig = {
        columns,
        data,
        styling: {
          size: 'md',
          striped: true,
          bordered: true,
          hoverable: true,
          theme: mapStyleToTheme(requestParams.style)
        },
        accessibility: {
          tableLabel: tableData.tableLabel || `${requestParams.description} table`,
          caption: tableData.caption || requestParams.description,
          enableKeyboardNavigation: true,
          announceUpdates: true
        },
        sorting: {
          enabled: true,
          multiColumn: false
        },
        filtering: {
          enabled: true,
          globalSearch: true
        },
        pagination: {
          enabled: data.length > 10,
          page: 1,
          pageSize: 10,
          showPageSizeSelector: true
        },
        performance: {
          searchDebounce: 300,
          filterDebounce: 300
        },
        export: {
          enableExport: true,
          formats: ['csv', 'json', 'html'],
          filename: generateFilename(requestParams.description)
        }
      };

      return tableConfig;
    } catch (error) {
      logger.error('Failed to process AI table response', 'TableBuilder', error);
      // Return fallback configuration
      return getFallbackTableConfig(requestParams);
    }
  }, [generateFilename, getFallbackTableConfig]);

  // Helper method to get default columns
  const getDefaultColumns = useCallback((count: number): TableColumn[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `col-${i}`,
      key: `col-${i}`,
      title: `Column ${i + 1}`,
      dataType: 'string' as TableDataType,
      sortable: true,
      filterable: true,
      visible: true,
      align: 'left' as const
    }));
  }, [generateFilename, getFallbackTableConfig]);

  // Helper method to map style to theme
  const mapStyleToTheme = useCallback((style?: string): string => {
    const styleMap: Record<string, string> = {
      'professional': 'default',
      'academic': 'secondary',
      'dashboard': 'primary',
      'financial': 'success',
      'educational': 'primary'
    };
    return styleMap[style || 'professional'] || 'default';
  }, [generateFilename, getFallbackTableConfig]);

  // Helper method to generate filename
  const generateFilename = useCallback((description: string): string => {
    return description
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'table';
  }, [generateFilename, getFallbackTableConfig]);

  // Helper method to get fallback table configuration
  const getFallbackTableConfig = useCallback((requestParams: any): TableConfig => {
    const columns = getDefaultColumns(requestParams.columns || 3);
    const data: TableRow[] = Array.from({ length: requestParams.rows || 5 }, (_, i) => ({
      id: i,
      data: columns.reduce((acc, col) => {
        acc[col.key] = `Sample ${col.title} ${i + 1}`;
        return acc;
      }, {} as Record<string, any>),
      selected: false
    }));

    return {
      columns,
      data,
      styling: {
        size: 'md',
        striped: true,
        bordered: true,
        hoverable: true,
        theme: 'default'
      },
      accessibility: {
        tableLabel: `${requestParams.description || 'Sample'} table`,
        caption: requestParams.description || 'Sample table with generated data',
        enableKeyboardNavigation: true,
        announceUpdates: true
      },
      sorting: { enabled: true },
      filtering: { enabled: true, globalSearch: true },
      pagination: { enabled: true, page: 1, pageSize: 10 },
      performance: { searchDebounce: 300, filterDebounce: 300 },
      export: {
        enableExport: true,
        formats: ['csv', 'json', 'html'],
        filename: generateFilename(requestParams.description || 'table')
      }
    };
  }, [getDefaultColumns, generateFilename]);

  const generateTable = useCallback(async () => {
    // Enhanced validation
    if (!state.description.trim()) {
      updateState({ error: 'Please provide a description for your table' });
      return;
    }

    if (state.rows < 1 || state.rows > 100) {
      updateState({ error: 'Number of rows must be between 1 and 100' });
      return;
    }

    if (state.columns < 1 || state.columns > 20) {
      updateState({ error: 'Number of columns must be between 1 and 20' });
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
        columns: state.columns,
        subject: state.subject,
        purpose: state.purpose,
        style: state.style,
        generateSampleData: state.generateSampleData
      });

      // Debug log for method availability
      if (!buildTableGenerationPrompt || !processAITableResponse) {
        throw new Error('Helper methods not available - component initialization error');
      }

      // Progress simulation
      const progressInterval = setInterval(() => {
        updateState(prev => ({ 
          generationProgress: Math.min(prev.generationProgress + 10, 90) 
        }));
      }, 200);

      // Create table generation prompt for unified AI service
      const tablePrompt = buildTableGenerationPrompt(
        state.description,
        state.rows,
        state.columns,
        state.subject,
        state.topic,
        state.purpose,
        state.style,
        state.generateSampleData,
        state.sampleDataContext
      );

      // Create direct AI message
      const messages: Message[] = [
        { role: 'system', content: 'You are a helpful assistant that creates well-structured tables. Always respond with valid HTML table markup.' },
        { role: 'user', content: tablePrompt }
      ];
      
      const response = await deepSeekService.sendMessage(messages, {
        temperature: 0.7,
        max_tokens: 2000,
        model: 'deepseek-chat'
      });
      clearInterval(progressInterval);

      if (response && response.content) {
        // Process the AI response into a table configuration
        const tableConfig = await processAITableResponse(response, {
          description: state.description,
          rows: state.rows,
          columns: state.columns,
          subject: state.subject,
          topic: state.topic,
          purpose: state.purpose,
          style: state.style,
          generateSampleData: state.generateSampleData,
          sampleDataContext: state.sampleDataContext
        });

        updateState({ 
          generationProgress: 100,
          generatedConfig: tableConfig,
          showPreview: true,
          isGenerating: false
        });

        announceToScreenReader('Table generated successfully');
        onTableGenerated?.(tableConfig);

        logger.info('Table generation completed successfully', 'TableBuilder', {
          columns: tableConfig.columns.length,
          rows: tableConfig.data.length,
          provider: 'ai-tutor'
        });
      } else {
        throw new Error('No response received from AI service');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Provide user-friendly error messages
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userFriendlyMessage = 'Network connection error. Please check your internet connection and try again.';
      } else if (errorMessage.includes('timeout')) {
        userFriendlyMessage = 'Request timed out. Please try with a simpler table description.';
      } else if (errorMessage.includes('rate limit')) {
        userFriendlyMessage = 'Too many requests. Please wait a moment before trying again.';
      } else if (errorMessage.includes('authentication')) {
        userFriendlyMessage = 'Authentication error. Please refresh the page and try again.';
      } else if (errorMessage.includes('Helper methods not available')) {
        userFriendlyMessage = 'Component initialization error. Please refresh the page.';
      } else if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
        userFriendlyMessage = 'Invalid response from AI service. Please try again with a different description.';
      }
      
      updateState({ 
        error: userFriendlyMessage,
        isGenerating: false,
        generationProgress: 0 
      });
      
      onError?.(userFriendlyMessage);
      announceToScreenReader('Table generation failed');
      
      logger.error('Table generation failed', 'TableBuilder', {
        originalError: errorMessage,
        userMessage: userFriendlyMessage,
        state: {
          description: state.description,
          rows: state.rows,
          columns: state.columns
        }
      });
    }
  }, [state, onTableGenerated, onError, buildTableGenerationPrompt, processAITableResponse]);

  const exportTable = useCallback(async (format: 'csv' | 'json' | 'html') => {
    if (!state.generatedConfig) return;

    try {
      const { data, columns } = state.generatedConfig;
      let exportContent = '';
      let mimeType = '';
      let fileExtension = '';

      switch (format) {
        case 'csv': {
          const headers = columns.map(col => col.title).join(',');
          const rows = data.map(row => 
            columns.map(col => JSON.stringify(row.data[col.key] || '')).join(',')
          );
          exportContent = [headers, ...rows].join('\n');
          mimeType = 'text/csv';
          fileExtension = 'csv';
          break;
        }

        case 'json': {
          exportContent = JSON.stringify({
            columns: columns.map(col => ({
              id: col.id,
              title: col.title,
              dataType: col.dataType
            })),
            data: data.map(row => row.data),
            metadata: {
              generated: new Date().toISOString(),
              description: state.description,
              totalRows: data.length,
              totalColumns: columns.length
            }
          }, null, 2);
          mimeType = 'application/json';
          fileExtension = 'json';
          break;
        }

        case 'html': {
          const htmlRows = data.map(row => 
            `<tr>${columns.map(col => `<td>${row.data[col.key] || ''}</td>`).join('')}</tr>`
          ).join('\n');
          
          exportContent = `<!DOCTYPE html>
<html>
<head>
  <title>Generated Table</title>
  <style>
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; font-weight: bold; }
    tbody tr:nth-child(even) { background-color: #f9f9f9; }
  </style>
</head>
<body>
  <h1>${state.description}</h1>
  <table>
    <thead>
      <tr>${columns.map(col => `<th>${col.title}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${htmlRows}
    </tbody>
  </table>
</body>
</html>`;
          mimeType = 'text/html';
          fileExtension = 'html';
          break;
        }
      }

      const blob = new Blob([exportContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generateFilename(state.description)}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      announceToScreenReader(`Table exported as ${format.toUpperCase()}`);

    } catch (error) {
      logger.error('Table export failed', 'TableBuilder', error);
      updateState({ error: 'Export failed. Please try again.' });
    }
  }, [state.generatedConfig, state.description, generateFilename]);

  // Simple rendering without complex preview to prevent duplicate function issues
  return (
    <Card className={cn('w-full max-w-6xl mx-auto', className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>AI Table Builder</span>
          <Badge variant="outline">Enhanced</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Templates section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Built-in Templates</Label>
            <div className="flex items-center gap-2">
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {TABLE_TEMPLATES.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="secondary" onClick={loadSelectedTemplate} disabled={!selectedTemplateId}>Load</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Quickly start from a curated table configuration.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Import from URL (JSON)</Label>
            <div className="flex items-center gap-2">
              <Input placeholder="https://.../table.json" value={templateUrl} onChange={(e) => setTemplateUrl(e.target.value)} />
              <Button onClick={importTemplateFromUrl}>Import</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Accepts a TableConfig JSON or an array of row objects.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="description">Table Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what kind of table you want to create..."
              value={state.description}
              onChange={(e) => updateState({ description: e.target.value })}
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rows">Rows</Label>
              <Input
                id="rows"
                type="number"
                min="1"
                max="50"
                value={state.rows}
                onChange={(e) => updateState({ rows: parseInt(e.target.value) || 5 })}
              />
            </div>
            <div>
              <Label htmlFor="columns">Columns</Label>
              <Input
                id="columns"
                type="number"
                min="1"
                max="20"
                value={state.columns}
                onChange={(e) => updateState({ columns: parseInt(e.target.value) || 3 })}
              />
            </div>
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

          {state.generatedConfig && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Generated Table</h3>
                <div className="flex gap-2">
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

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {state.generatedConfig.columns.map((col) => (
                        <TableHead key={col.id}>{col.title}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.generatedConfig.data.slice(0, 5).map((row) => (
                      <TableRow key={row.id}>
                        {state.generatedConfig!.columns.map((col) => (
                          <TableCell key={col.id}>
                            {row.data[col.key] || ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {state.generatedConfig.data.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  Showing first 5 rows of {state.generatedConfig.data.length} total rows
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TableBuilder;




