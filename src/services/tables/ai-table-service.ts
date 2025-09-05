/**
 * AI-Powered Table Service
 * Integrates DeepSeek API for intelligent table generation and data processing
 */

import { logger } from '../logging/logger';
import { performanceMonitor } from '../performance/performance-monitor';
import type { 
  TableConfig, 
  TableColumn, 
  TableRow, 
  TableBuilderParams,
  TableDataType,
  CellValue
} from '@/types/table-types';
import type {
  AITableResult,
  AITableConfig,
  AITableColumnConfig,
  AITableRowData,
  AITableAnalysisResult,
  TableGenerationResponse,
  TableAnalysisResponse,
  FormatterFunction,
  ValidatorFunction,
  AIFormatterConfig,
  AIValidatorConfig,
  AIProcessingContext
} from '@/types/ai-table-service';

/**
 * AI Table Generation Request
 */
export interface AITableRequest {
  // User description
  description: string;
  
  // Table parameters
  rows?: number;
  columns?: number;
  
  // Context for better generation
  subject?: string;
  topic?: string;
  purpose?: 'study' | 'analysis' | 'presentation' | 'reference' | 'comparison';
  
  // Data preferences
  dataTypes?: TableDataType[];
  includeHeaders?: boolean;
  includeFooters?: boolean;
  
  // Styling preferences
  style?: 'professional' | 'academic' | 'dashboard' | 'financial' | 'educational';
  
  // Sample data generation
  generateSampleData?: boolean;
  sampleDataContext?: string;
}

/**
 * AI Table Analysis Request
 */
export interface AITableAnalysisRequest {
  data: TableRow[];
  columns: TableColumn[];
  analysisType: 'structure' | 'data-quality' | 'insights' | 'recommendations' | 'optimization';
  focus?: string[];
}

/**
 * AI Generated Table Response
 */
export interface AITableResponse {
  success: boolean;
  config: TableConfig;
  metadata: {
    generatedAt: number;
    processingTime: number;
    model: string;
    confidence: number;
    suggestions: string[];
    warnings: string[];
  };
  error?: string;
}

/**
 * AI Table Analysis Response
 */
export interface AITableAnalysisResponse {
  success: boolean;
  insights: {
    structure: {
      score: number;
      issues: string[];
      recommendations: string[];
    };
    dataQuality: {
      score: number;
      completeness: number;
      consistency: number;
      accuracy: number;
      issues: string[];
    };
    performance: {
      estimatedRenderTime: number;
      memoryUsage: number;
      optimizations: string[];
    };
    accessibility: {
      score: number;
      violations: string[];
      improvements: string[];
    };
  };
  recommendations: string[];
  metadata: {
    analyzedAt: number;
    processingTime: number;
    model: string;
  };
}

class AITableService {
  private static instance: AITableService;
  private readonly baseUrl = '/supabase/functions/v1';
  
  private constructor() {}
  
  static getInstance(): AITableService {
    if (!AITableService.instance) {
      AITableService.instance = new AITableService();
    }
    return AITableService.instance;
  }
  
  /**
   * Generate table using AI based on natural language description
   */
  async generateTable(request: AITableRequest): Promise<AITableResponse> {
    const startTime = performance.now();
    
    try {
      logger.info('Starting AI table generation', 'AITableService', { 
        description: request.description,
        rows: request.rows,
        columns: request.columns 
      });
      
      // Prepare the AI prompt for table generation
      const aiPrompt = this.buildTableGenerationPrompt(request);
      
      // Call DeepSeek AI API
      const response = await fetch(`${this.baseUrl}/deepseek-ai-professional`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          responseType: 'table_generation',
          context: {
            subject: request.subject || 'general',
            topic: request.topic,
            purpose: request.purpose || 'presentation'
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.statusText}`);
      }
      
      const aiResult = await response.json();
      const processingTime = performance.now() - startTime;
      
      // Process AI response into table configuration
      const tableConfig = await this.processAITableResponse(aiResult, request);
      
      // Performance tracking
      performanceMonitor.getCurrentMetrics();
      
      logger.info('AI table generation completed', 'AITableService', {
        processingTime,
        columns: tableConfig.columns.length,
        rows: tableConfig.data.length
      });
      
      return {
        success: true,
        config: tableConfig,
        metadata: {
          generatedAt: Date.now(),
          processingTime,
          model: 'deepseek-chat',
          confidence: aiResult.confidence || 85,
          suggestions: aiResult.suggestions || [],
          warnings: aiResult.warnings || []
        }
      };
      
    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      logger.error('AI table generation failed', 'AITableService', error);
      
      return {
        success: false,
        config: this.getFallbackTableConfig(request),
        metadata: {
          generatedAt: Date.now(),
          processingTime,
          model: 'fallback',
          confidence: 0,
          suggestions: ['AI generation failed, using fallback template'],
          warnings: ['Consider manually configuring the table for better results']
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Analyze existing table for improvements and insights
   */
  async analyzeTable(request: AITableAnalysisRequest): Promise<AITableAnalysisResponse> {
    const startTime = performance.now();
    
    try {
      logger.info('Starting AI table analysis', 'AITableService', {
        analysisType: request.analysisType,
        rows: request.data.length,
        columns: request.columns.length
      });
      
      const aiPrompt = this.buildTableAnalysisPrompt(request);
      
      const response = await fetch(`${this.baseUrl}/deepseek-ai-professional`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          responseType: 'table_analysis',
          context: {
            analysisType: request.analysisType,
            focus: request.focus
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.statusText}`);
      }
      
      const aiResult = await response.json();
      const processingTime = performance.now() - startTime;
      
      // Process AI analysis response
      const analysis = this.processAIAnalysisResponse(aiResult, request);
      
      logger.info('AI table analysis completed', 'AITableService', {
        processingTime,
        structureScore: analysis.insights.structure.score,
        dataQualityScore: analysis.insights.dataQuality.score
      });
      
      return {
        success: true,
        insights: analysis.insights,
        recommendations: analysis.recommendations,
        metadata: {
          analyzedAt: Date.now(),
          processingTime,
          model: 'deepseek-chat'
        }
      };
      
    } catch (error) {
      logger.error('AI table analysis failed', 'AITableService', error);
      
      return {
        success: false,
        insights: this.getFallbackAnalysis(request),
        recommendations: ['Analysis failed - consider manual review'],
        metadata: {
          analyzedAt: Date.now(),
          processingTime: performance.now() - startTime,
          model: 'fallback'
        }
      };
    }
  }
  
  /**
   * Generate intelligent sample data for table columns
   */
  async generateSampleData(
    columns: TableColumn[], 
    rows: number, 
    context?: string
  ): Promise<TableRow[]> {
    try {
      const aiPrompt = this.buildSampleDataPrompt(columns, rows, context);
      
      const response = await fetch(`${this.baseUrl}/deepseek-ai-professional`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          responseType: 'sample_data_generation',
          context: { columns: columns.length, rows }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Sample data generation failed: ${response.statusText}`);
      }
      
      const aiResult = await response.json();
      return this.processSampleDataResponse(aiResult, columns, rows);
      
    } catch (error) {
      logger.error('Sample data generation failed', 'AITableService', error);
      return this.getFallbackSampleData(columns, rows);
    }
  }
  
  /**
   * Build AI prompt for table generation
   */
  private buildTableGenerationPrompt(request: AITableRequest): string {
    return `
Generate a professional table configuration based on the following requirements:

Description: ${request.description}

Requirements:
- Rows: ${request.rows || 'auto-determine'}
- Columns: ${request.columns || 'auto-determine'}
- Subject: ${request.subject || 'general'}
- Topic: ${request.topic || 'not specified'}
- Purpose: ${request.purpose || 'presentation'}
- Style: ${request.style || 'professional'}

Please provide:
1. Table structure with appropriate column definitions
2. Column data types and formatting
3. Professional styling recommendations
4. Accessibility considerations
5. Sample data if requested: ${request.generateSampleData ? 'Yes' : 'No'}

Context: ${request.sampleDataContext || 'General purpose table'}

Return the response as a structured JSON with table configuration that can be directly used to create a professional table.

Focus on:
- Educational value and clarity
- Professional appearance
- Data integrity and validation
- User experience optimization
- Accessibility compliance

Please ensure all column definitions include proper data types, formatting, and validation rules.
`;
  }
  
  /**
   * Build AI prompt for table analysis
   */
  private buildTableAnalysisPrompt(request: AITableAnalysisRequest): string {
    const tableInfo = {
      columns: request.columns.map(col => ({
        id: col.id,
        title: col.title,
        dataType: col.dataType,
        sortable: col.sortable,
        filterable: col.filterable
      })),
      sampleData: request.data.slice(0, 5), // First 5 rows for analysis
      totalRows: request.data.length
    };
    
    return `
Analyze the following table structure and data for improvements and insights:

Analysis Type: ${request.analysisType}
Focus Areas: ${request.focus?.join(', ') || 'all aspects'}

Table Structure:
${JSON.stringify(tableInfo, null, 2)}

Please provide a comprehensive analysis including:

1. Structure Analysis:
   - Column organization and naming
   - Data type appropriateness
   - Relationships between columns
   - Missing columns or redundancies

2. Data Quality Assessment:
   - Data completeness and consistency
   - Potential data integrity issues
   - Value distributions and patterns
   - Outliers or anomalies

3. Performance Considerations:
   - Estimated rendering performance
   - Memory usage optimization
   - Pagination and virtualization needs
   - Index and sorting optimization

4. Accessibility Review:
   - ARIA compliance
   - Screen reader compatibility
   - Keyboard navigation support
   - Color contrast and visibility

5. User Experience:
   - Column ordering and priorities
   - Display formatting improvements
   - Interactive features recommendations
   - Mobile responsiveness considerations

6. Specific Recommendations:
   - Immediate improvements
   - Long-term enhancements
   - Best practices implementation
   - Performance optimizations

Return a structured analysis with scores, specific issues, and actionable recommendations.
`;
  }
  
  /**
   * Build AI prompt for sample data generation
   */
  private buildSampleDataPrompt(
    columns: TableColumn[], 
    rows: number, 
    context?: string
  ): string {
    const columnInfo = columns.map(col => ({
      id: col.id,
      title: col.title,
      dataType: col.dataType,
      description: col.description
    }));
    
    return `
Generate realistic sample data for a table with the following structure:

Columns: ${JSON.stringify(columnInfo, null, 2)}
Number of rows: ${rows}
Context: ${context || 'Professional/educational content'}

Requirements:
- Data should be realistic and contextually appropriate
- Follow proper data types and formatting
- Include variety while maintaining consistency
- Ensure data relationships make sense
- Use educational or professional examples where applicable

For each column:
- Respect the specified data type
- Generate appropriate sample values
- Maintain data integrity across related columns
- Include some variation but keep it realistic

Return the sample data as an array of objects with proper formatting for each data type.
`;
  }
  
  /**
   * Process AI response for table generation
   */
  private async processAITableResponse(
    aiResult: AITableResult, 
    request: AITableRequest
  ): Promise<TableConfig> {
    try {
      // Parse AI response
      const aiConfig = typeof aiResult.content === 'string' 
        ? JSON.parse(aiResult.content) 
        : aiResult.content;
      
      // Build columns from AI response
      const columns: TableColumn[] = aiConfig.columns?.map((col: AITableColumnConfig, index: number) => ({
        id: col.id || `col-${index}`,
        key: col.key || col.id || `col-${index}`,
        title: col.title || `Column ${index + 1}`,
        dataType: col.dataType || 'string',
        width: col.width,
        align: col.align || 'left',
        sortable: col.sortable !== false,
        filterable: col.filterable !== false,
        formatter: col.formatter ? this.createFormatter(col.formatter) : undefined,
        validator: col.validator ? this.createValidator(col.validator) : undefined,
        ariaLabel: col.ariaLabel || col.title,
        description: col.description
      })) || this.getDefaultColumns(request.columns || 3);
      
      // Generate sample data if requested
      let data: TableRow[] = [];
      if (request.generateSampleData) {
        if (aiConfig.sampleData) {
          data = aiConfig.sampleData.map((row: AITableRowData, index: number) => ({
            id: row.id || index,
            data: row.data || row,
            selected: false
          }));
        } else {
          data = await this.generateSampleData(columns, request.rows || 10, request.sampleDataContext);
        }
      }
      
      // Build complete table configuration
      const tableConfig: TableConfig = {
        columns,
        data,
        styling: {
          size: 'md',
          striped: true,
          bordered: true,
          hoverable: true,
          theme: this.mapStyleToTheme(request.style)
        },
        accessibility: {
          tableLabel: aiConfig.tableLabel || `Generated table: ${request.description}`,
          caption: aiConfig.caption || request.description,
          enableKeyboardNavigation: true,
          enableRowSelection: false,
          announceUpdates: true
        },
        pagination: {
          enabled: (request.rows || data.length) > 20,
          page: 1,
          pageSize: 20,
          showPageSizeSelector: true
        },
        sorting: {
          enabled: true,
          multiColumn: false
        },
        filtering: {
          enabled: true,
          globalSearch: true,
          columnFilters: true
        },
        performance: {
          enableVirtualization: (request.rows || data.length) > 100,
          searchDebounce: 300,
          filterDebounce: 300
        },
        export: {
          enableExport: true,
          formats: ['csv', 'json', 'html'],
          filename: this.generateFilename(request.description)
        }
      };
      
      return tableConfig;
      
    } catch (error) {
      logger.error('Failed to process AI table response', 'AITableService', error);
      return this.getFallbackTableConfig(request);
    }
  }
  
  /**
   * Process AI analysis response
   */
  private processAIAnalysisResponse(aiResult: AITableResult, request: AITableAnalysisRequest): AITableAnalysisResult {
    try {
      const analysis = typeof aiResult.content === 'string' 
        ? JSON.parse(aiResult.content) 
        : aiResult.content;
      
      return {
        insights: {
          structure: {
            score: analysis.structure?.score || 75,
            issues: analysis.structure?.issues || [],
            recommendations: analysis.structure?.recommendations || []
          },
          dataQuality: {
            score: analysis.dataQuality?.score || 80,
            completeness: analysis.dataQuality?.completeness || 90,
            consistency: analysis.dataQuality?.consistency || 85,
            accuracy: analysis.dataQuality?.accuracy || 80,
            issues: analysis.dataQuality?.issues || []
          },
          performance: {
            estimatedRenderTime: analysis.performance?.estimatedRenderTime || 100,
            memoryUsage: analysis.performance?.memoryUsage || 50,
            optimizations: analysis.performance?.optimizations || []
          },
          accessibility: {
            score: analysis.accessibility?.score || 70,
            violations: analysis.accessibility?.violations || [],
            improvements: analysis.accessibility?.improvements || []
          }
        },
        recommendations: analysis.recommendations || []
      };
      
    } catch (error) {
      logger.error('Failed to process AI analysis response', 'AITableService', error);
      return this.getFallbackAnalysis(request);
    }
  }
  
  /**
   * Process sample data response
   */
  private processSampleDataResponse(
    aiResult: AITableResult, 
    columns: TableColumn[], 
    rows: number
  ): TableRow[] {
    try {
      const sampleData = typeof aiResult.content === 'string' 
        ? JSON.parse(aiResult.content) 
        : aiResult.content;
      
      return sampleData.map((row: AITableRowData, index: number) => ({
        id: index,
        data: row,
        selected: false
      }));
      
    } catch (error) {
      logger.error('Failed to process sample data response', 'AITableService', error);
      return this.getFallbackSampleData(columns, rows);
    }
  }
  
  /**
   * Create formatter function from AI description
   */
  private createFormatter(formatterConfig: AIFormatterConfig): FormatterFunction {
    return (value: CellValue, row: TableRow) => {
      // Basic formatting based on AI configuration
      if (formatterConfig.type === 'currency') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
      }
      if (formatterConfig.type === 'percentage') {
        return `${(Number(value) || 0)}%`;
      }
      if (formatterConfig.type === 'date') {
        return new Date(value as string).toLocaleDateString();
      }
      return String(value || '');
    };
  }
  
  /**
   * Create validator function from AI description
   */
  private createValidator(validatorConfig: AIValidatorConfig): ValidatorFunction {
    return (value: CellValue) => {
      if (validatorConfig.required && !value) {
        return 'This field is required';
      }
      if (validatorConfig.minLength && String(value).length < validatorConfig.minLength) {
        return `Minimum length is ${validatorConfig.minLength}`;
      }
      return null;
    };
  }
  
  /**
   * Map AI style preference to theme
   */
  private mapStyleToTheme(style?: string): string {
    const styleMap: Record<string, string> = {
      professional: 'default',
      academic: 'secondary',
      dashboard: 'primary',
      financial: 'success',
      educational: 'primary'
    };
    return styleMap[style || 'professional'] || 'default';
  }
  
  /**
   * Generate filename from description
   */
  private generateFilename(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50) + '-table';
  }
  
  /**
   * Get fallback table configuration
   */
  private getFallbackTableConfig(request: AITableRequest): TableConfig {
    const columns = this.getDefaultColumns(request.columns || 3);
    const data = this.getFallbackSampleData(columns, request.rows || 5);
    
    return {
      columns,
      data,
      styling: {
        size: 'md',
        striped: true,
        bordered: true,
        hoverable: true
      },
      accessibility: {
        tableLabel: `Table: ${request.description}`,
        caption: request.description,
        enableKeyboardNavigation: true
      },
      pagination: { enabled: false, page: 1, pageSize: 20 },
      sorting: { enabled: true },
      filtering: { enabled: true, globalSearch: true }
    };
  }
  
  /**
   * Get default columns
   */
  private getDefaultColumns(count: number): TableColumn[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `col-${i}`,
      key: `col-${i}`,
      title: `Column ${i + 1}`,
      dataType: 'string' as TableDataType,
      sortable: true,
      filterable: true
    }));
  }
  
  /**
   * Get fallback sample data
   */
  private getFallbackSampleData(columns: TableColumn[], rows: number): TableRow[] {
    return Array.from({ length: rows }, (_, i) => ({
      id: i,
      data: columns.reduce((acc, col) => {
        acc[col.key] = `Sample ${col.title} ${i + 1}`;
        return acc;
      }, {} as Record<string, CellValue>),
      selected: false
    }));
  }
  
  /**
   * Get fallback analysis
   */
  private getFallbackAnalysis(request: AITableAnalysisRequest): AITableAnalysisResult {
    return {
      structure: { score: 70, issues: [], recommendations: [] },
      dataQuality: { score: 75, completeness: 80, consistency: 75, accuracy: 70, issues: [] },
      performance: { estimatedRenderTime: 100, memoryUsage: 50, optimizations: [] },
      accessibility: { score: 65, violations: [], improvements: [] }
    };
  }
}

export const aiTableService = AITableService.getInstance();