/**
 * Table Data Processing and Validation Engine
 * Handles data transformation, validation, and performance optimization
 */

import { logger } from '../logging/logger';
import { performanceMonitor } from '../performance/performance-monitor';
import type { 
  TableConfig,
  TableColumn,
  TableRow,
  TableDataType,
  CellValue,
  TableError,
  TableErrorCode,
  TablePerformanceMetrics,
  TableValidator,
  TableFormatter
} from '@/types/table-types';

/**
 * Data validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: TableError[];
  warnings: string[];
  statistics: {
    totalCells: number;
    validCells: number;
    invalidCells: number;
    emptyCells: number;
    processingTime: number;
  };
}

/**
 * Data processing options
 */
export interface ProcessingOptions {
  // Validation
  strictValidation?: boolean;
  skipInvalidRows?: boolean;
  
  // Performance
  batchSize?: number;
  enableCaching?: boolean;
  maxMemoryUsage?: number;
  
  // Transformation
  autoFormatting?: boolean;
  dataTypeInference?: boolean;
  
  // Error handling
  errorThreshold?: number;
  warningThreshold?: number;
}

/**
 * Schema validation for table configuration
 */
export interface TableSchema {
  columns: ColumnSchema[];
  constraints?: TableConstraint[];
  indexes?: TableIndex[];
}

export interface ColumnSchema {
  id: string;
  dataType: TableDataType;
  required: boolean;
  unique?: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: RegExp;
  enum?: string[];
  validator?: TableValidator;
  transformer?: (value: CellValue) => CellValue;
}

export interface TableConstraint {
  type: 'unique' | 'foreign_key' | 'check';
  columns: string[];
  condition?: (row: TableRow) => boolean;
  message?: string;
}

export interface TableIndex {
  columns: string[];
  unique?: boolean;
  name?: string;
}

class TableProcessor {
  private static instance: TableProcessor;
  private cache = new Map<string, any>();
  private metrics: TablePerformanceMetrics[] = [];
  
  private constructor() {}
  
  static getInstance(): TableProcessor {
    if (!TableProcessor.instance) {
      TableProcessor.instance = new TableProcessor();
    }
    return TableProcessor.instance;
  }
  
  /**
   * Process and validate table data
   */
  async processTableData(
    data: TableRow[],
    columns: TableColumn[],
    options: ProcessingOptions = {}
  ): Promise<{
    processedData: TableRow[];
    validation: ValidationResult;
    metrics: TablePerformanceMetrics;
  }> {
    const startTime = performance.now();
    
    logger.info('Starting table data processing', 'TableProcessor', {
      rows: data.length,
      columns: columns.length,
      options
    });

    try {
      // Create schema from columns
      const schema = this.createSchemaFromColumns(columns);
      
      // Validate data against schema
      const validation = await this.validateData(data, schema, options);
      
      // Process data based on validation results
      let processedData = data;
      
      if (options.skipInvalidRows && !validation.isValid) {
        processedData = await this.filterValidRows(data, schema, options);
      }
      
      // Apply transformations
      if (options.autoFormatting) {
        processedData = await this.applyAutoFormatting(processedData, columns);
      }
      
      // Optimize data types if inference is enabled
      if (options.dataTypeInference) {
        const optimizedColumns = await this.inferDataTypes(processedData, columns);
        processedData = await this.applyDataTypeOptimizations(processedData, optimizedColumns);
      }
      
      const processingTime = performance.now() - startTime;
      
      // Create performance metrics
      const metrics: TablePerformanceMetrics = {
        renderTime: processingTime,
        dataProcessingTime: processingTime,
        filterTime: 0,
        sortTime: 0,
        exportTime: 0,
        memoryUsage: this.estimateMemoryUsage(processedData, columns),
        rowsPerSecond: Math.round(data.length / (processingTime / 1000)),
        totalRows: data.length,
        visibleRows: processedData.length,
        timestamp: Date.now()
      };
      
      this.metrics.push(metrics);
      
      logger.info('Table data processing completed', 'TableProcessor', {
        processingTime,
        validRows: processedData.length,
        invalidRows: data.length - processedData.length,
        memoryUsage: metrics.memoryUsage
      });
      
      return {
        processedData,
        validation,
        metrics
      };
      
    } catch (error) {
      logger.error('Table data processing failed', 'TableProcessor', error);
      throw error;
    }
  }
  
  /**
   * Validate table data against schema
   */
  async validateData(
    data: TableRow[],
    schema: TableSchema,
    options: ProcessingOptions = {}
  ): Promise<ValidationResult> {
    const errors: TableError[] = [];
    const warnings: string[] = [];
    let validCells = 0;
    let invalidCells = 0;
    let emptyCells = 0;
    
    const startTime = performance.now();
    
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      
      for (const columnSchema of schema.columns) {
        const cellValue = row.data[columnSchema.id];
        
        try {
          const cellValidation = await this.validateCell(
            cellValue,
            columnSchema,
            row,
            rowIndex
          );
          
          if (cellValidation.isValid) {
            validCells++;
          } else {
            invalidCells++;
            errors.push(...cellValidation.errors);
          }
          
          if (cellValue === null || cellValue === undefined || cellValue === '') {
            emptyCells++;
          }
          
        } catch (error) {
          invalidCells++;
          errors.push({
            code: 'VALIDATION_FAILED',
            message: `Validation failed for cell at row ${rowIndex}, column ${columnSchema.id}`,
            details: error,
            row: rowIndex,
            column: columnSchema.id,
            timestamp: Date.now()
          });
        }
      }
      
      // Validate row constraints
      if (schema.constraints) {
        for (const constraint of schema.constraints) {
          const constraintResult = await this.validateConstraint(row, constraint, rowIndex);
          if (!constraintResult.isValid) {
            errors.push(...constraintResult.errors);
          }
        }
      }
    }
    
    const totalCells = data.length * schema.columns.length;
    const processingTime = performance.now() - startTime;
    
    // Generate warnings based on thresholds
    const errorRate = (errors.length / totalCells) * 100;
    const emptyRate = (emptyCells / totalCells) * 100;
    
    if (errorRate > (options.errorThreshold || 5)) {
      warnings.push(`High error rate: ${errorRate.toFixed(1)}% of cells have validation errors`);
    }
    
    if (emptyRate > (options.warningThreshold || 20)) {
      warnings.push(`High empty cell rate: ${emptyRate.toFixed(1)}% of cells are empty`);
    }
    
    const isValid = errors.length === 0;
    
    return {
      isValid,
      errors,
      warnings,
      statistics: {
        totalCells,
        validCells,
        invalidCells,
        emptyCells,
        processingTime
      }
    };
  }
  
  /**
   * Validate individual cell
   */
  private async validateCell(
    value: CellValue,
    schema: ColumnSchema,
    row: TableRow,
    rowIndex: number
  ): Promise<{ isValid: boolean; errors: TableError[] }> {
    const errors: TableError[] = [];
    
    // Required field validation
    if (schema.required && (value === null || value === undefined || value === '')) {
      errors.push({
        code: 'VALIDATION_FAILED',
        message: `Required field '${schema.id}' is empty`,
        row: rowIndex,
        column: schema.id,
        timestamp: Date.now()
      });
    }
    
    // Skip further validation if empty and not required
    if (!schema.required && (value === null || value === undefined || value === '')) {
      return { isValid: true, errors: [] };
    }
    
    // Data type validation
    const dataTypeValid = this.validateDataType(value, schema.dataType);
    if (!dataTypeValid) {
      errors.push({
        code: 'INVALID_DATA_TYPE',
        message: `Invalid data type for '${schema.id}'. Expected ${schema.dataType}, got ${typeof value}`,
        row: rowIndex,
        column: schema.id,
        timestamp: Date.now()
      });
    }
    
    // Length validation for strings
    if (schema.dataType === 'string' || schema.dataType === 'email' || schema.dataType === 'url') {
      const strValue = String(value);
      
      if (schema.minLength && strValue.length < schema.minLength) {
        errors.push({
          code: 'VALIDATION_FAILED',
          message: `'${schema.id}' must be at least ${schema.minLength} characters long`,
          row: rowIndex,
          column: schema.id,
          timestamp: Date.now()
        });
      }
      
      if (schema.maxLength && strValue.length > schema.maxLength) {
        errors.push({
          code: 'VALIDATION_FAILED',
          message: `'${schema.id}' must not exceed ${schema.maxLength} characters`,
          row: rowIndex,
          column: schema.id,
          timestamp: Date.now()
        });
      }
    }
    
    // Numeric range validation
    if (schema.dataType === 'number' || schema.dataType === 'currency' || schema.dataType === 'percentage') {
      const numValue = Number(value);
      
      if (!isNaN(numValue)) {
        if (schema.minValue !== undefined && numValue < schema.minValue) {
          errors.push({
            code: 'VALIDATION_FAILED',
            message: `'${schema.id}' must be at least ${schema.minValue}`,
            row: rowIndex,
            column: schema.id,
            timestamp: Date.now()
          });
        }
        
        if (schema.maxValue !== undefined && numValue > schema.maxValue) {
          errors.push({
            code: 'VALIDATION_FAILED',
            message: `'${schema.id}' must not exceed ${schema.maxValue}`,
            row: rowIndex,
            column: schema.id,
            timestamp: Date.now()
          });
        }
      }
    }
    
    // Pattern validation
    if (schema.pattern && typeof value === 'string') {
      if (!schema.pattern.test(value)) {
        errors.push({
          code: 'VALIDATION_FAILED',
          message: `'${schema.id}' does not match the required pattern`,
          row: rowIndex,
          column: schema.id,
          timestamp: Date.now()
        });
      }
    }
    
    // Enum validation
    if (schema.enum && schema.enum.length > 0) {
      if (!schema.enum.includes(String(value))) {
        errors.push({
          code: 'VALIDATION_FAILED',
          message: `'${schema.id}' must be one of: ${schema.enum.join(', ')}`,
          row: rowIndex,
          column: schema.id,
          timestamp: Date.now()
        });
      }
    }
    
    // Custom validator
    if (schema.validator) {
      const customError = schema.validator(value);
      if (customError) {
        errors.push({
          code: 'VALIDATION_FAILED',
          message: customError,
          row: rowIndex,
          column: schema.id,
          timestamp: Date.now()
        });
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * Validate data type
   */
  private validateDataType(value: CellValue, expectedType: TableDataType): boolean {
    if (value === null || value === undefined) return true; // Null values are handled separately
    
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      
      case 'number':
        return typeof value === 'number' || !isNaN(Number(value));
      
      case 'boolean':
        return typeof value === 'boolean' || 
               value === 'true' || value === 'false' ||
               value === 1 || value === 0;
      
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(String(value)));
      
      case 'email':
        return typeof value === 'string' && 
               /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      
      case 'url':
        try {
          new URL(String(value));
          return true;
        } catch {
          return false;
        }
      
      case 'currency':
      case 'percentage':
        return typeof value === 'number' || !isNaN(Number(value));
      
      case 'custom':
        return true; // Custom types are handled by custom validators
      
      default:
        return true;
    }
  }
  
  /**
   * Validate table constraint
   */
  private async validateConstraint(
    row: TableRow,
    constraint: TableConstraint,
    rowIndex: number
  ): Promise<{ isValid: boolean; errors: TableError[] }> {
    const errors: TableError[] = [];
    
    switch (constraint.type) {
      case 'check':
        if (constraint.condition && !constraint.condition(row)) {
          errors.push({
            code: 'VALIDATION_FAILED',
            message: constraint.message || 'Row constraint violation',
            row: rowIndex,
            timestamp: Date.now()
          });
        }
        break;
      
      // Other constraint types can be implemented here
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * Create schema from table columns
   */
  private createSchemaFromColumns(columns: TableColumn[]): TableSchema {
    const columnSchemas: ColumnSchema[] = columns.map(col => ({
      id: col.id,
      dataType: col.dataType,
      required: false, // Can be inferred from data or specified in column config
      validator: col.validator,
      // Additional schema properties can be derived from column configuration
    }));
    
    return {
      columns: columnSchemas
    };
  }
  
  /**
   * Filter rows that pass validation
   */
  private async filterValidRows(
    data: TableRow[],
    schema: TableSchema,
    options: ProcessingOptions
  ): Promise<TableRow[]> {
    const validRows: TableRow[] = [];
    
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      let isRowValid = true;
      
      for (const columnSchema of schema.columns) {
        const cellValue = row.data[columnSchema.id];
        const cellValidation = await this.validateCell(cellValue, columnSchema, row, rowIndex);
        
        if (!cellValidation.isValid) {
          isRowValid = false;
          break;
        }
      }
      
      if (isRowValid) {
        validRows.push(row);
      }
    }
    
    return validRows;
  }
  
  /**
   * Apply automatic formatting based on data types
   */
  private async applyAutoFormatting(
    data: TableRow[],
    columns: TableColumn[]
  ): Promise<TableRow[]> {
    return data.map(row => ({
      ...row,
      data: columns.reduce((formattedData, col) => {
        let value = row.data[col.key];
        
        // Apply type-specific formatting
        switch (col.dataType) {
          case 'date':
            if (value && !isNaN(Date.parse(String(value)))) {
              value = new Date(value as string).toISOString().split('T')[0];
            }
            break;
          
          case 'number':
            if (value !== null && value !== undefined && value !== '') {
              const numValue = Number(value);
              if (!isNaN(numValue)) {
                value = numValue;
              }
            }
            break;
          
          case 'boolean':
            if (typeof value === 'string') {
              value = value.toLowerCase() === 'true' || value === '1';
            }
            break;
          
          case 'email':
            if (typeof value === 'string') {
              value = value.toLowerCase().trim();
            }
            break;
          
          case 'url':
            if (typeof value === 'string' && value && !value.startsWith('http')) {
              value = 'https://' + value;
            }
            break;
        }
        
        formattedData[col.key] = value;
        return formattedData;
      }, {} as Record<string, CellValue>)
    }));
  }
  
  /**
   * Infer optimal data types from actual data
   */
  private async inferDataTypes(
    data: TableRow[],
    columns: TableColumn[]
  ): Promise<TableColumn[]> {
    const optimizedColumns = [...columns];
    
    for (let colIndex = 0; colIndex < columns.length; colIndex++) {
      const column = columns[colIndex];
      const values = data.map(row => row.data[column.key]).filter(v => v !== null && v !== undefined && v !== '');
      
      if (values.length === 0) continue;
      
      // Analyze value patterns
      const patterns = this.analyzeValuePatterns(values);
      const inferredType = this.inferDataTypeFromPatterns(patterns);
      
      if (inferredType && inferredType !== column.dataType) {
        optimizedColumns[colIndex] = {
          ...column,
          dataType: inferredType
        };
      }
    }
    
    return optimizedColumns;
  }
  
  /**
   * Analyze patterns in cell values
   */
  private analyzeValuePatterns(values: CellValue[]): any {
    const patterns = {
      numbers: 0,
      dates: 0,
      emails: 0,
      urls: 0,
      booleans: 0,
      strings: 0
    };
    
    values.forEach(value => {
      const str = String(value);
      
      if (!isNaN(Number(str))) patterns.numbers++;
      else if (!isNaN(Date.parse(str))) patterns.dates++;
      else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) patterns.emails++;
      else if (str.startsWith('http') || str.includes('www.')) patterns.urls++;
      else if (str.toLowerCase() === 'true' || str.toLowerCase() === 'false') patterns.booleans++;
      else patterns.strings++;
    });
    
    return patterns;
  }
  
  /**
   * Infer data type from patterns
   */
  private inferDataTypeFromPatterns(patterns: any): TableDataType | null {
    const total = Object.values(patterns).reduce((sum: number, count: any) => sum + count, 0);
    const threshold = 0.8; // 80% confidence threshold
    
    if (patterns.numbers / total > threshold) return 'number';
    if (patterns.dates / total > threshold) return 'date';
    if (patterns.emails / total > threshold) return 'email';
    if (patterns.urls / total > threshold) return 'url';
    if (patterns.booleans / total > threshold) return 'boolean';
    
    return null; // Keep original type
  }
  
  /**
   * Apply data type optimizations
   */
  private async applyDataTypeOptimizations(
    data: TableRow[],
    columns: TableColumn[]
  ): Promise<TableRow[]> {
    // This would apply the inferred data types to convert values
    return this.applyAutoFormatting(data, columns);
  }
  
  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(data: TableRow[], columns: TableColumn[]): number {
    // Rough estimation in MB
    const avgStringLength = 50;
    const bytesPerRow = columns.length * avgStringLength + 100; // overhead
    return (data.length * bytesPerRow) / (1024 * 1024);
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): TablePerformanceMetrics[] {
    return [...this.metrics];
  }
  
  /**
   * Clear performance metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const tableProcessor = TableProcessor.getInstance();