/**
 * Table Formatter Service
 * Handles table data formatting and styling
 */

import React from 'react';
import { logger } from '@/lib/logger';

export type TableDataType = 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url';
export type CellValue = string | number | boolean | Date | null | undefined;

export interface TableRow {
  [key: string]: CellValue;
}

export interface TableColumn {
  key: string;
  label: string;
  type?: TableDataType;
  sortable?: boolean;
  filterable?: boolean;
}

export interface TableConfig {
  columns: TableColumn[];
  styling?: {
    theme?: string;
    headerColor?: string;
    accentColor?: string;
  };
}

export interface ProfessionalTemplate {
  id: string;
  name: string;
  styling: {
    theme: string;
    headerColor: string;
    accentColor: string;
  };
}

export class TableFormatterService {
  private formatters = new Map<TableDataType, (value: CellValue, row: TableRow) => string | React.ReactNode>();
  private templates = new Map<string, ProfessionalTemplate>();

  constructor() {
    this.initializeFormatters();
    this.initializeTemplates();
  }

  private initializeFormatters(): void {
    // String formatter
    this.formatters.set('string', (value: CellValue) => {
      return String(value || '');
    });

    // Number formatter
    this.formatters.set('number', (value: CellValue) => {
      if (typeof value === 'number') {
        return value.toLocaleString();
      }
      return String(value || '0');
    });

    // Boolean formatter
    this.formatters.set('boolean', (value: CellValue) => {
      const boolValue = Boolean(value);
      return React.createElement('span', {
        className: `px-2 py-1 rounded-full text-xs font-medium ${
          boolValue 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`
      }, boolValue ? 'Yes' : 'No');
    });

    // Date formatter
    this.formatters.set('date', (value: CellValue) => {
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      if (typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
      }
      return String(value || '');
    });

    // Email formatter
    this.formatters.set('email', (value: CellValue) => {
      const email = String(value || '');
      if (email && email.includes('@')) {
        return React.createElement('a', {
          href: `mailto:${email}`,
          className: 'text-blue-600 hover:text-blue-800 underline'
        }, email);
      }
      return email;
    });

    // URL formatter
    this.formatters.set('url', (value: CellValue) => {
      const url = String(value || '');
      if (url && (url.startsWith('http') || url.startsWith('www'))) {
        return React.createElement('a', {
          href: url.startsWith('http') ? url : `https://${url}`,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'text-blue-600 hover:text-blue-800 underline'
        }, url);
      }
      return url;
    });
  }

  private initializeTemplates(): void {
    const templates: ProfessionalTemplate[] = [
      {
        id: 'primary',
        name: 'Primary Theme',
        styling: {
          theme: 'primary',
          headerColor: '#3b82f6',
          accentColor: '#3b82f6'
        }
      },
      {
        id: 'secondary',
        name: 'Secondary Theme',
        styling: {
          theme: 'secondary',
          headerColor: '#64748b',
          accentColor: '#64748b'
        }
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Format cell value based on data type
   */
  formatCellValue(value: CellValue, type: TableDataType = 'string', row: TableRow = {}): string | React.ReactNode {
    const formatter = this.formatters.get(type);
    if (!formatter) {
      return String(value || '');
    }
    return formatter(value, row);
  }

  /**
   * Apply template to configuration
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
      }
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
    return formatter;
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
}

export const tableFormatter = new TableFormatterService();
export default tableFormatter;