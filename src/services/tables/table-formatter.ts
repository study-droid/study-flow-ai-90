/**
 * Professional Table Formatting System
 * Handles visual formatting, styling, and professional presentation of table data
 */

import { logger } from '../logging/logger';
import type { 
  TableConfig,
  TableColumn,
  TableRow,
  TableStyling,
  CellValue,
  TableDataType
} from '@/types/table-types';

/**
 * Formatting context for cell rendering
 */
export interface FormattingContext {
  row: TableRow;
  column: TableColumn;
  rowIndex: number;
  columnIndex: number;
  isSelected: boolean;
  isHovered: boolean;
  isEditing: boolean;
}

/**
 * Professional formatting options
 */
export interface FormattingOptions {
  // Locale settings
  locale?: string;
  timezone?: string;
  
  // Number formatting
  currency?: string;
  decimalPlaces?: number;
  thousandsSeparator?: boolean;
  
  // Date formatting
  dateFormat?: 'short' | 'medium' | 'long' | 'full' | string;
  timeFormat?: '12hour' | '24hour';
  
  // Text formatting
  capitalization?: 'none' | 'first' | 'words' | 'all';
  truncation?: {
    enabled: boolean;
    maxLength: number;
    showTooltip: boolean;
  };
  
  // Professional styling
  theme?: 'corporate' | 'academic' | 'financial' | 'healthcare' | 'technology';
  colorScheme?: 'light' | 'dark' | 'auto';
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

/**
 * Template configurations for different professional contexts
 */
export interface ProfessionalTemplate {
  id: string;
  name: string;
  description: string;
  styling: TableStyling;
  formatting: FormattingOptions;
  columnDefaults: Partial<TableColumn>;
  customCSS?: string;
}

/**
 * Conditional formatting rule
 */
export interface ConditionalRule {
  id: string;
  condition: (value: CellValue, context: FormattingContext) => boolean;
  style: React.CSSProperties;
  className?: string;
  priority: number;
}

class TableFormatter {
  private static instance: TableFormatter;
  private templates: Map<string, ProfessionalTemplate> = new Map();
  private formatters: Map<string, (value: CellValue, context: FormattingContext) => string | React.ReactNode> = new Map();
  
  private constructor() {
    this.initializeProfessionalTemplates();
    this.initializeFormatters();
  }
  
  static getInstance(): TableFormatter {
    if (!TableFormatter.instance) {
      TableFormatter.instance = new TableFormatter();
    }
    return TableFormatter.instance;
  }
  
  /**
   * Initialize professional templates
   */
  private initializeProfessionalTemplates(): void {
    // Corporate Template
    this.templates.set('corporate', {
      id: 'corporate',
      name: 'Corporate Professional',
      description: 'Clean, professional styling suitable for business reports and presentations',
      styling: {
        size: 'md',
        striped: false,
        bordered: true,
        hoverable: true,
        compact: false,
        theme: 'default',
        headerStyle: {
          backgroundColor: '#f8fafc',
          fontWeight: '600',
          color: '#334155',
          borderBottom: '2px solid #e2e8f0'
        },
        rowStyle: {
          borderBottom: '1px solid #e2e8f0'
        },
        cellStyle: {
          padding: '12px 16px',
          fontSize: '14px',
          lineHeight: '1.5'
        }
      },
      formatting: {
        locale: 'en-US',
        currency: 'USD',
        decimalPlaces: 2,
        thousandsSeparator: true,
        dateFormat: 'short',
        capitalization: 'none',
        theme: 'corporate'
      },
      columnDefaults: {
        align: 'left',
        sortable: true,
        filterable: true
      }
    });
    
    // Academic Template
    this.templates.set('academic', {
      id: 'academic',
      name: 'Academic Research',
      description: 'Scholarly formatting with emphasis on data clarity and citations',
      styling: {
        size: 'sm',
        striped: true,
        bordered: true,
        hoverable: false,
        compact: true,
        theme: 'secondary',
        headerStyle: {
          backgroundColor: '#1e293b',
          color: 'white',
          fontWeight: '500',
          fontSize: '13px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        },
        rowStyle: {
          fontSize: '13px',
          lineHeight: '1.4'
        }
      },
      formatting: {
        locale: 'en-US',
        decimalPlaces: 3,
        dateFormat: 'full',
        capitalization: 'first',
        theme: 'academic'
      },
      columnDefaults: {
        align: 'left',
        sortable: true,
        filterable: true
      }
    });
    
    // Financial Template
    this.templates.set('financial', {
      id: 'financial',
      name: 'Financial Reports',
      description: 'Optimized for financial data with currency formatting and emphasis on numbers',
      styling: {
        size: 'md',
        striped: false,
        bordered: true,
        hoverable: true,
        theme: 'success',
        headerStyle: {
          backgroundColor: '#059669',
          color: 'white',
          fontWeight: '600'
        },
        rowStyle: {
          fontFamily: 'ui-monospace, "SF Mono", Monaco, monospace'
        }
      },
      formatting: {
        locale: 'en-US',
        currency: 'USD',
        decimalPlaces: 2,
        thousandsSeparator: true,
        dateFormat: 'medium',
        theme: 'financial'
      },
      columnDefaults: {
        align: 'right',
        sortable: true,
        filterable: true
      }
    });
    
    // Dashboard Template
    this.templates.set('dashboard', {
      id: 'dashboard',
      name: 'Analytics Dashboard',
      description: 'Modern dashboard styling with emphasis on data visualization',
      styling: {
        size: 'lg',
        striped: true,
        bordered: false,
        hoverable: true,
        theme: 'primary',
        headerStyle: {
          backgroundColor: 'transparent',
          borderBottom: '3px solid #3b82f6',
          color: '#1e40af',
          fontWeight: '600',
          fontSize: '16px'
        },
        rowStyle: {
          backgroundColor: '#fefefe',
          borderRadius: '8px',
          margin: '4px 0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }
      },
      formatting: {
        locale: 'en-US',
        decimalPlaces: 1,
        dateFormat: 'short',
        theme: 'technology'
      },
      columnDefaults: {
        align: 'center',
        sortable: true,
        filterable: true
      }
    });
  }
  
  /**
   * Initialize data type formatters
   */
  private initializeFormatters(): void {
    // String formatter
    this.formatters.set('string', (value: CellValue, context: FormattingContext) => {
      if (value === null || value === undefined) return '';
      
      let str = String(value);
      const options = context.column.formatter as any; // Type assertion for demo
      
      // Apply capitalization
      if (options?.capitalization) {
        switch (options.capitalization) {
          case 'first':
            str = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
            break;
          case 'words':
            str = str.replace(/\w\S*/g, (txt) => 
              txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
            break;
          case 'all':
            str = str.toUpperCase();
            break;
        }
      }
      
      // Apply truncation
      if (options?.truncation?.enabled && str.length > options.truncation.maxLength) {
        str = str.substring(0, options.truncation.maxLength) + '...';
      }
      
      return str;
    });
    
    // Number formatter
    this.formatters.set('number', (value: CellValue, context: FormattingContext) => {
      if (value === null || value === undefined || value === '') return '';
      
      const num = Number(value);
      if (isNaN(num)) return String(value);
      
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        useGrouping: true
      }).format(num);
    });
    
    // Currency formatter
    this.formatters.set('currency', (value: CellValue, context: FormattingContext) => {
      if (value === null || value === undefined || value === '') return '';
      
      const num = Number(value);
      if (isNaN(num)) return String(value);
      
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num);
    });
    
    // Percentage formatter
    this.formatters.set('percentage', (value: CellValue, context: FormattingContext) => {
      if (value === null || value === undefined || value === '') return '';
      
      const num = Number(value);
      if (isNaN(num)) return String(value);
      
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 2
      }).format(num / 100);
    });
    
    // Date formatter
    this.formatters.set('date', (value: CellValue, context: FormattingContext) => {
      if (value === null || value === undefined || value === '') return '';
      
      const date = new Date(value as string);
      if (isNaN(date.getTime())) return String(value);
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    });
    
    // Boolean formatter
    this.formatters.set('boolean', (value: CellValue, context: FormattingContext) => {
      if (value === null || value === undefined) return '';
      
      const boolValue = Boolean(value);
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          boolValue 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {boolValue ? 'Yes' : 'No'}
        </span>
      );
    });
    
    // Email formatter
    this.formatters.set('email', (value: CellValue, context: FormattingContext) => {
      if (value === null || value === undefined || value === '') return '';
      
      const email = String(value);
      return (
        <a 
          href={`mailto:${email}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {email}
        </a>
      );
    });
    
    // URL formatter
    this.formatters.set('url', (value: CellValue, context: FormattingContext) => {
      if (value === null || value === undefined || value === '') return '';
      
      const url = String(value);
      const displayText = url.length > 30 ? url.substring(0, 30) + '...' : url;
      
      return (
        <a 
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {displayText}
        </a>
      );
    });
  }
  
  /**
   * Apply professional template to table configuration
   */
  applyTemplate(config: TableConfig, templateId: string): TableConfig {
    const template = this.templates.get(templateId);
    if (!template) {
      logger.warn(`Template '${templateId}' not found`, 'TableFormatter');
      return config;
    }
    
    return {
      ...config,
      styling: {
        ...config.styling,
        ...template.styling
      },
      columns: config.columns.map(column => ({
        ...template.columnDefaults,
        ...column,
        formatter: column.formatter || this.getFormatterForDataType(column.dataType)
      }))
    };
  }
  
  /**
   * Get formatter function for data type
   */
  getFormatterForDataType(dataType: TableDataType): (value: CellValue, row: TableRow) => string | React.ReactNode {
    const formatter = this.formatters.get(dataType);
    if (!formatter) {
      return (value: CellValue) => String(value || '');
    }
    
    return (value: CellValue, row: TableRow) => {
      const context: FormattingContext = {
        row,
        column: {} as TableColumn, // Will be provided in actual usage
        rowIndex: 0,
        columnIndex: 0,
        isSelected: false,
        isHovered: false,
        isEditing: false
      };
      
      return formatter(value, context);
    };
  }
  
  /**
   * Format cell value with professional styling
   */
  formatCellValue(
    value: CellValue,
    column: TableColumn,
    context: Partial<FormattingContext> = {}
  ): string | React.ReactNode {
    const formatter = this.formatters.get(column.dataType);
    if (!formatter) {
      return String(value || '');
    }
    
    const fullContext: FormattingContext = {
      row: {} as TableRow,
      column,
      rowIndex: 0,
      columnIndex: 0,
      isSelected: false,
      isHovered: false,
      isEditing: false,
      ...context
    };
    
    try {
      return formatter(value, fullContext);
    } catch (error) {
      logger.error('Cell formatting error', 'TableFormatter', error);
      return String(value || '');
    }
  }
  
  /**
   * Apply conditional formatting
   */
  applyConditionalFormatting(
    value: CellValue,
    context: FormattingContext,
    rules: ConditionalRule[]
  ): { style: React.CSSProperties; className: string } {
    let combinedStyle: React.CSSProperties = {};
    const classNames: string[] = [];
    
    // Sort rules by priority (higher priority first)
    const sortedRules = rules.sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      if (rule.condition(value, context)) {
        combinedStyle = { ...combinedStyle, ...rule.style };
        if (rule.className) {
          classNames.push(rule.className);
        }
      }
    }
    
    return {
      style: combinedStyle,
      className: classNames.join(' ')
    };
  }
  
  /**
   * Generate professional CSS for table
   */
  generateProfessionalCSS(config: TableConfig): string {
    const styling = config.styling;
    
    let css = `
      /* Professional Table Styling */
      .professional-table {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        border-collapse: collapse;
        width: 100%;
        background-color: white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        overflow: hidden;
      }
      
      .professional-table th {
        font-weight: 600;
        text-align: left;
        padding: 12px 16px;
        background-color: #f8fafc;
        border-bottom: 2px solid #e2e8f0;
        color: #334155;
        font-size: 14px;
        line-height: 1.5;
      }
      
      .professional-table td {
        padding: 12px 16px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 14px;
        line-height: 1.5;
        color: #475569;
      }
      
      .professional-table tr:hover {
        background-color: #f1f5f9;
      }
      
      .professional-table tr:last-child td {
        border-bottom: none;
      }
    `;
    
    // Add size-specific styles
    if (styling.size === 'sm') {
      css += `
        .professional-table th,
        .professional-table td {
          padding: 8px 12px;
          font-size: 13px;
        }
      `;
    } else if (styling.size === 'lg') {
      css += `
        .professional-table th,
        .professional-table td {
          padding: 16px 20px;
          font-size: 15px;
        }
      `;
    }
    
    // Add striped styling
    if (styling.striped) {
      css += `
        .professional-table tr:nth-child(even) {
          background-color: #f8fafc;
        }
      `;
    }
    
    // Add theme-specific colors
    if (styling.theme) {
      css += this.generateThemeCSS(styling.theme);
    }
    
    return css;
  }
  
  /**
   * Generate theme-specific CSS
   */
  private generateThemeCSS(theme: string): string {
    const themes = {
      primary: {
        headerBg: '#3b82f6',
        headerColor: 'white',
        accentColor: '#3b82f6'
      },
      secondary: {
        headerBg: '#64748b',
        headerColor: 'white', 
        accentColor: '#64748b'
      },
      success: {
        headerBg: '#059669',
        headerColor: 'white',
        accentColor: '#059669'
      },
      warning: {
        headerBg: '#d97706',
        headerColor: 'white',
        accentColor: '#d97706'
      },
      error: {
        headerBg: '#dc2626',
        headerColor: 'white',
        accentColor: '#dc2626'
      }
    };
    
    const themeConfig = themes[theme as keyof typeof themes];
    if (!themeConfig) return '';
    
    return `
      .professional-table.theme-${theme} th {
        background-color: ${themeConfig.headerBg};
        color: ${themeConfig.headerColor};
      }
      
      .professional-table.theme-${theme} .accent {
        color: ${themeConfig.accentColor};
      }
    `;
  }
  
  /**
   * Get all available templates
   */
  getAvailableTemplates(): ProfessionalTemplate[] {
    return Array.from(this.templates.values());
  }
  
  /**
   * Register custom template
   */
  registerTemplate(template: ProfessionalTemplate): void {
    this.templates.set(template.id, template);
  }
  
  /**
   * Register custom formatter
   */
  registerFormatter(
    dataType: string, 
    formatter: (value: CellValue, context: FormattingContext) => string | React.ReactNode
  ): void {
    this.formatters.set(dataType, formatter);
  }
}

export const tableFormatter = TableFormatter.getInstance();