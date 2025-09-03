/**
 * Table Export Service
 * Handles exporting table data to various formats (HTML, CSV, JSON, Excel)
 */

import { logger } from '../logging/logger';
import { tableFormatter } from './table-formatter';
import type { 
  TableConfig, 
  TableColumn, 
  TableRow, 
  ExportConfig, 
  ExportFormat,
  FormattingTemplate 
} from '@/types/table-types';

/**
 * Export configuration options
 */
export interface TableExportOptions {
  format: ExportFormat;
  filename?: string;
  includeHeaders: boolean;
  includeFormatting: boolean;
  template?: FormattingTemplate;
  customStyles?: string;
  compression?: boolean;
  dateFormat?: string;
  numberFormat?: string;
  encoding?: 'utf-8' | 'utf-16' | 'ascii';
  delimiter?: string; // For CSV
  includeMetadata?: boolean;
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  data?: string | Blob;
  filename: string;
  format: ExportFormat;
  size: number;
  error?: string;
  downloadUrl?: string;
}

/**
 * Export metadata
 */
interface ExportMetadata {
  exportedAt: string;
  rowCount: number;
  columnCount: number;
  format: ExportFormat;
  template?: FormattingTemplate;
  generatedBy: string;
}

class TableExporter {
  private static instance: TableExporter;
  
  private constructor() {}
  
  static getInstance(): TableExporter {
    if (!TableExporter.instance) {
      TableExporter.instance = new TableExporter();
    }
    return TableExporter.instance;
  }
  
  /**
   * Export table data to specified format
   */
  async exportTable(
    config: TableConfig,
    options: TableExportOptions
  ): Promise<ExportResult> {
    const startTime = performance.now();
    
    logger.info('Starting table export', 'TableExporter', {
      format: options.format,
      rowCount: config.data.length,
      columnCount: config.columns.length
    });
    
    try {
      let result: ExportResult;
      
      switch (options.format) {
        case 'html':
          result = await this.exportToHTML(config, options);
          break;
        case 'csv':
          result = await this.exportToCSV(config, options);
          break;
        case 'json':
          result = await this.exportToJSON(config, options);
          break;
        case 'excel':
          result = await this.exportToExcel(config, options);
          break;
        case 'pdf':
          result = await this.exportToPDF(config, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
      
      const exportTime = performance.now() - startTime;
      
      logger.info('Table export completed', 'TableExporter', {
        format: options.format,
        exportTime,
        fileSize: result.size,
        success: result.success
      });
      
      return result;
      
    } catch (error) {
      const exportTime = performance.now() - startTime;
      
      logger.error('Table export failed', 'TableExporter', {
        error: error instanceof Error ? error.message : 'Unknown error',
        format: options.format,
        exportTime
      });
      
      return {
        success: false,
        filename: options.filename || `table.${options.format}`,
        format: options.format,
        size: 0,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }
  
  /**
   * Export to HTML format
   */
  private async exportToHTML(
    config: TableConfig,
    options: TableExportOptions
  ): Promise<ExportResult> {
    const visibleColumns = config.columns.filter(col => col.visible !== false);
    const filename = options.filename || `${config.title || 'table'}.html`;
    
    // Apply formatting if requested
    const formattedData = options.includeFormatting 
      ? await tableFormatter.formatTableData(config, options.template)
      : config.data;
    
    let html = this.generateHTMLStructure(config, visibleColumns, formattedData, options);
    
    // Add metadata if requested
    if (options.includeMetadata) {
      const metadata = this.generateMetadata(config, options.format, options.template);
      html = this.addMetadataToHTML(html, metadata);
    }
    
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    
    return {
      success: true,
      data: html,
      filename,
      format: 'html',
      size: blob.size,
      downloadUrl: URL.createObjectURL(blob)
    };
  }
  
  /**
   * Generate HTML structure
   */
  private generateHTMLStructure(
    config: TableConfig,
    columns: TableColumn[],
    data: TableRow[],
    options: TableExportOptions
  ): string {
    const template = options.template || 'professional';
    const styles = this.generateHTMLStyles(template, options.customStyles);
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="${options.encoding || 'utf-8'}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.title || 'Table Export'}</title>
    <style>${styles}</style>
</head>
<body>
    <div class="table-container">`;
    
    // Add title if present
    if (config.title) {
      html += `<h1 class="table-title">${this.escapeHTML(config.title)}</h1>`;
    }
    
    // Add description if present
    if (config.description) {
      html += `<p class="table-description">${this.escapeHTML(config.description)}</p>`;
    }
    
    html += `<table class="exported-table ${template}">`;
    
    // Add headers
    if (options.includeHeaders) {
      html += '<thead><tr>';
      columns.forEach(column => {
        const headerClass = `header-${column.dataType || 'string'}`;
        html += `<th class="${headerClass}" data-sort="${column.sortable ? 'true' : 'false'}">
                   ${this.escapeHTML(column.header)}
                 </th>`;
      });
      html += '</tr></thead>';
    }
    
    // Add data rows
    html += '<tbody>';
    data.forEach((row, rowIndex) => {
      const rowClass = rowIndex % 2 === 0 ? 'even-row' : 'odd-row';
      html += `<tr class="${rowClass}">`;
      
      columns.forEach(column => {
        const cellValue = row[column.accessor];
        const formattedValue = this.formatCellForHTML(cellValue, column);
        const cellClass = `cell-${column.dataType || 'string'}`;
        
        html += `<td class="${cellClass}">${formattedValue}</td>`;
      });
      
      html += '</tr>';
    });
    html += '</tbody>';
    
    html += `</table>
    </div>
    <div class="export-footer">
        <p>Exported on ${new Date().toLocaleString()}</p>
        <p>Rows: ${data.length} | Columns: ${columns.length}</p>
    </div>
</body>
</html>`;
    
    return html;
  }
  
  /**
   * Generate CSS styles for HTML export
   */
  private generateHTMLStyles(template: FormattingTemplate, customStyles?: string): string {
    const baseStyles = `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        margin: 0;
        padding: 20px;
        background-color: #f5f5f5;
        color: #333;
      }
      
      .table-container {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        padding: 24px;
        margin-bottom: 20px;
      }
      
      .table-title {
        margin: 0 0 8px 0;
        font-size: 24px;
        font-weight: 600;
        color: #1a1a1a;
      }
      
      .table-description {
        margin: 0 0 24px 0;
        color: #666;
        line-height: 1.5;
      }
      
      .exported-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }
      
      .exported-table th,
      .exported-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .exported-table th {
        background-color: #f8f9fa;
        font-weight: 600;
        color: #495057;
        position: sticky;
        top: 0;
      }
      
      .even-row {
        background-color: #fff;
      }
      
      .odd-row {
        background-color: #f8f9fa;
      }
      
      .exported-table tr:hover {
        background-color: #e3f2fd;
      }
      
      .cell-number {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      
      .cell-currency {
        text-align: right;
        font-variant-numeric: tabular-nums;
        color: #2e7d32;
      }
      
      .cell-date {
        font-variant-numeric: tabular-nums;
      }
      
      .export-footer {
        text-align: center;
        color: #666;
        font-size: 12px;
        padding: 20px;
      }
    `;
    
    const templateStyles = this.getTemplateStyles(template);
    
    return baseStyles + templateStyles + (customStyles || '');
  }
  
  /**
   * Get template-specific styles
   */
  private getTemplateStyles(template: FormattingTemplate): string {
    switch (template) {
      case 'corporate':
        return `
          .corporate .exported-table th {
            background-color: #1976d2;
            color: white;
          }
          .corporate .exported-table {
            border: 2px solid #1976d2;
          }
        `;
      
      case 'academic':
        return `
          .academic .exported-table {
            font-family: 'Times New Roman', serif;
          }
          .academic .exported-table th {
            background-color: #37474f;
            color: white;
          }
        `;
      
      case 'financial':
        return `
          .financial .cell-currency {
            font-weight: 600;
          }
          .financial .exported-table th {
            background-color: #2e7d32;
            color: white;
          }
        `;
      
      default:
        return '';
    }
  }
  
  /**
   * Export to CSV format
   */
  private async exportToCSV(
    config: TableConfig,
    options: TableExportOptions
  ): Promise<ExportResult> {
    const visibleColumns = config.columns.filter(col => col.visible !== false);
    const filename = options.filename || `${config.title || 'table'}.csv`;
    const delimiter = options.delimiter || ',';
    
    let csv = '';
    
    // Add headers
    if (options.includeHeaders) {
      const headers = visibleColumns.map(col => this.escapeCSV(col.header, delimiter));
      csv += headers.join(delimiter) + '\n';
    }
    
    // Add data rows
    config.data.forEach(row => {
      const values = visibleColumns.map(column => {
        const value = row[column.accessor];
        return this.formatCellForCSV(value, column, delimiter);
      });
      csv += values.join(delimiter) + '\n';
    });
    
    // Add BOM for UTF-8 if specified
    if (options.encoding === 'utf-8') {
      csv = '\uFEFF' + csv;
    }
    
    const blob = new Blob([csv], { 
      type: 'text/csv;charset=utf-8' 
    });
    
    return {
      success: true,
      data: csv,
      filename,
      format: 'csv',
      size: blob.size,
      downloadUrl: URL.createObjectURL(blob)
    };
  }
  
  /**
   * Export to JSON format
   */
  private async exportToJSON(
    config: TableConfig,
    options: TableExportOptions
  ): Promise<ExportResult> {
    const visibleColumns = config.columns.filter(col => col.visible !== false);
    const filename = options.filename || `${config.title || 'table'}.json`;
    
    const exportData = {
      ...(options.includeMetadata && {
        metadata: this.generateMetadata(config, options.format, options.template)
      }),
      table: {
        title: config.title,
        description: config.description,
        columns: visibleColumns.map(col => ({
          key: col.accessor,
          header: col.header,
          dataType: col.dataType
        })),
        data: config.data.map(row => {
          const filteredRow: Record<string, any> = {};
          visibleColumns.forEach(column => {
            filteredRow[column.accessor] = this.formatCellForJSON(
              row[column.accessor], 
              column
            );
          });
          return filteredRow;
        }),
        summary: {
          totalRows: config.data.length,
          totalColumns: visibleColumns.length,
          exportedAt: new Date().toISOString()
        }
      }
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { 
      type: 'application/json;charset=utf-8' 
    });
    
    return {
      success: true,
      data: jsonString,
      filename,
      format: 'json',
      size: blob.size,
      downloadUrl: URL.createObjectURL(blob)
    };
  }
  
  /**
   * Export to Excel format (basic implementation)
   */
  private async exportToExcel(
    config: TableConfig,
    options: TableExportOptions
  ): Promise<ExportResult> {
    // For now, we'll export as CSV with .xlsx extension
    // In a full implementation, you'd use a library like SheetJS
    const csvResult = await this.exportToCSV(config, {
      ...options,
      filename: options.filename || `${config.title || 'table'}.xlsx`
    });
    
    return {
      ...csvResult,
      format: 'excel',
      filename: csvResult.filename.replace('.csv', '.xlsx')
    };
  }
  
  /**
   * Export to PDF format (placeholder)
   */
  private async exportToPDF(
    config: TableConfig,
    options: TableExportOptions
  ): Promise<ExportResult> {
    // This would require a PDF generation library like jsPDF or Puppeteer
    // For now, return an error indicating it's not implemented
    return {
      success: false,
      filename: options.filename || `${config.title || 'table'}.pdf`,
      format: 'pdf',
      size: 0,
      error: 'PDF export not yet implemented - consider using HTML export instead'
    };
  }
  
  /**
   * Format cell value for HTML export
   */
  private formatCellForHTML(value: any, column: TableColumn): string {
    if (value == null) return '';
    
    switch (column.dataType) {
      case 'currency':
        return typeof value === 'number' 
          ? new Intl.NumberFormat('en-US', { 
              style: 'currency', 
              currency: 'USD' 
            }).format(value)
          : this.escapeHTML(String(value));
      
      case 'percentage':
        return typeof value === 'number'
          ? `${(value * 100).toFixed(2)}%`
          : this.escapeHTML(String(value));
      
      case 'date':
        return value instanceof Date 
          ? value.toLocaleDateString()
          : this.escapeHTML(String(value));
      
      case 'number':
        return typeof value === 'number'
          ? value.toLocaleString()
          : this.escapeHTML(String(value));
      
      default:
        return this.escapeHTML(String(value));
    }
  }
  
  /**
   * Format cell value for CSV export
   */
  private formatCellForCSV(value: any, column: TableColumn, delimiter: string): string {
    if (value == null) return '';
    
    let formatted: string;
    
    switch (column.dataType) {
      case 'date':
        formatted = value instanceof Date 
          ? value.toISOString()
          : String(value);
        break;
      
      default:
        formatted = String(value);
    }
    
    return this.escapeCSV(formatted, delimiter);
  }
  
  /**
   * Format cell value for JSON export
   */
  private formatCellForJSON(value: any, column: TableColumn): any {
    if (value == null) return null;
    
    switch (column.dataType) {
      case 'number':
      case 'currency':
      case 'percentage':
        return typeof value === 'number' ? value : parseFloat(String(value)) || null;
      
      case 'boolean':
        return Boolean(value);
      
      case 'date':
        return value instanceof Date ? value.toISOString() : String(value);
      
      default:
        return String(value);
    }
  }
  
  /**
   * Escape HTML special characters
   */
  private escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Escape CSV special characters
   */
  private escapeCSV(text: string, delimiter: string): string {
    if (text.includes(delimiter) || text.includes('"') || text.includes('\n') || text.includes('\r')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }
  
  /**
   * Generate export metadata
   */
  private generateMetadata(
    config: TableConfig,
    format: ExportFormat,
    template?: FormattingTemplate
  ): ExportMetadata {
    return {
      exportedAt: new Date().toISOString(),
      rowCount: config.data.length,
      columnCount: config.columns.length,
      format,
      template,
      generatedBy: 'StudyFlow AI Table System'
    };
  }
  
  /**
   * Add metadata to HTML export
   */
  private addMetadataToHTML(html: string, metadata: ExportMetadata): string {
    const metadataHTML = `
    <!-- Export Metadata -->
    <!-- Generated by: ${metadata.generatedBy} -->
    <!-- Exported at: ${metadata.exportedAt} -->
    <!-- Rows: ${metadata.rowCount}, Columns: ${metadata.columnCount} -->
    <!-- Format: ${metadata.format} -->
    ${metadata.template ? `<!-- Template: ${metadata.template} -->` : ''}
    `;
    
    return html.replace('<head>', '<head>' + metadataHTML);
  }
  
  /**
   * Download file helper
   */
  downloadFile(result: ExportResult): void {
    if (!result.success || !result.downloadUrl) {
      logger.error('Cannot download file - export failed', 'TableExporter', result);
      return;
    }
    
    const link = document.createElement('a');
    link.href = result.downloadUrl;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up object URL after download
    setTimeout(() => {
      URL.revokeObjectURL(result.downloadUrl!);
    }, 1000);
    
    logger.info('File download initiated', 'TableExporter', {
      filename: result.filename,
      format: result.format,
      size: result.size
    });
  }
  
  /**
   * Get supported export formats
   */
  getSupportedFormats(): ExportFormat[] {
    return ['html', 'csv', 'json', 'excel'];
  }
  
  /**
   * Validate export options
   */
  validateExportOptions(options: TableExportOptions): string[] {
    const errors: string[] = [];
    
    if (!this.getSupportedFormats().includes(options.format)) {
      errors.push(`Unsupported export format: ${options.format}`);
    }
    
    if (options.filename && !/^[a-zA-Z0-9._-]+$/.test(options.filename)) {
      errors.push('Filename contains invalid characters');
    }
    
    if (options.delimiter && options.delimiter.length !== 1) {
      errors.push('CSV delimiter must be a single character');
    }
    
    return errors;
  }
}

export const tableExporter = TableExporter.getInstance();