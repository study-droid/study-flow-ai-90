/**
 * Export Panel Component
 * UI for exporting table data in various formats
 */

import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Database, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { tableExporter } from '@/services/tables/table-exporter';
import type { TableConfig, ExportFormat, FormattingTemplate } from '@/types/table-types';
import type { TableExportOptions, ExportResult } from '@/services/tables/table-exporter';

interface ExportPanelProps {
  config: TableConfig;
  onExport?: (result: ExportResult) => void;
  className?: string;
}

const EXPORT_FORMATS: Array<{
  format: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
}> = [
  {
    format: 'html',
    label: 'HTML',
    description: 'Web-ready table with styling',
    icon: <FileText className="w-4 h-4" />,
    extension: '.html'
  },
  {
    format: 'csv',
    label: 'CSV',
    description: 'Comma-separated values',
    icon: <FileSpreadsheet className="w-4 h-4" />,
    extension: '.csv'
  },
  {
    format: 'json',
    label: 'JSON',
    description: 'JavaScript Object Notation',
    icon: <Database className="w-4 h-4" />,
    extension: '.json'
  },
  {
    format: 'excel',
    label: 'Excel',
    description: 'Microsoft Excel format',
    icon: <FileSpreadsheet className="w-4 h-4" />,
    extension: '.xlsx'
  }
];

const TEMPLATES: Array<{
  template: FormattingTemplate;
  label: string;
  description: string;
}> = [
  { template: 'professional', label: 'Professional', description: 'Clean, modern styling' },
  { template: 'corporate', label: 'Corporate', description: 'Business-focused design' },
  { template: 'academic', label: 'Academic', description: 'Research paper style' },
  { template: 'financial', label: 'Financial', description: 'Money-focused formatting' },
  { template: 'dashboard', label: 'Dashboard', description: 'Metrics and KPI style' }
];

export const ExportPanel: React.FC<ExportPanelProps> = ({ 
  config, 
  onExport, 
  className = '' 
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('html');
  const [options, setOptions] = useState<Partial<TableExportOptions>>({
    includeHeaders: true,
    includeFormatting: true,
    includeMetadata: false,
    template: 'professional',
    encoding: 'utf-8',
    delimiter: ','
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setExportResult(null);

    try {
      const exportOptions: TableExportOptions = {
        format: selectedFormat,
        filename: `${config.title || 'table'}.${EXPORT_FORMATS.find(f => f.format === selectedFormat)?.extension.slice(1)}`,
        includeHeaders: options.includeHeaders ?? true,
        includeFormatting: options.includeFormatting ?? true,
        template: options.template,
        includeMetadata: options.includeMetadata ?? false,
        encoding: options.encoding ?? 'utf-8',
        delimiter: options.delimiter ?? ','
      };

      const result = await tableExporter.exportTable(config, exportOptions);
      setExportResult(result);

      if (result.success && result.downloadUrl) {
        // Auto-download the file
        tableExporter.downloadFile(result);
      }

      onExport?.(result);
    } catch (error) {
      setExportResult({
        success: false,
        filename: `${config.title || 'table'}.${selectedFormat}`,
        format: selectedFormat,
        size: 0,
        error: error instanceof Error ? error.message : 'Export failed'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Export Table</h3>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-700"
          >
            <Settings className="w-4 h-4 mr-1" />
            Advanced Options
          </button>
        </div>

        {/* Format Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Export Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            {EXPORT_FORMATS.map((format) => (
              <button
                key={format.format}
                onClick={() => setSelectedFormat(format.format)}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  selectedFormat === format.format
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center mb-1">
                  {format.icon}
                  <span className="ml-2 font-medium text-gray-900">
                    {format.label}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{format.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Basic Options */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Export Options
          </label>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.includeHeaders ?? true}
                onChange={(e) => setOptions(prev => ({ 
                  ...prev, 
                  includeHeaders: e.target.checked 
                }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Include column headers</span>
            </label>

            {selectedFormat === 'html' && (
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeFormatting ?? true}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    includeFormatting: e.target.checked 
                  }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Include styling and formatting</span>
              </label>
            )}

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.includeMetadata ?? false}
                onChange={(e) => setOptions(prev => ({ 
                  ...prev, 
                  includeMetadata: e.target.checked 
                }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Include export metadata</span>
            </label>
          </div>
        </div>

        {/* Template Selection (for HTML) */}
        {selectedFormat === 'html' && options.includeFormatting && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Style Template
            </label>
            <select
              value={options.template || 'professional'}
              onChange={(e) => setOptions(prev => ({ 
                ...prev, 
                template: e.target.value as FormattingTemplate 
              }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {TEMPLATES.map((template) => (
                <option key={template.template} value={template.template}>
                  {template.label} - {template.description}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Advanced Settings</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Text Encoding
                </label>
                <select
                  value={options.encoding || 'utf-8'}
                  onChange={(e) => setOptions(prev => ({ 
                    ...prev, 
                    encoding: e.target.value as 'utf-8' | 'utf-16' | 'ascii'
                  }))}
                  className="w-full text-sm rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="utf-8">UTF-8</option>
                  <option value="utf-16">UTF-16</option>
                  <option value="ascii">ASCII</option>
                </select>
              </div>

              {selectedFormat === 'csv' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    CSV Delimiter
                  </label>
                  <select
                    value={options.delimiter || ','}
                    onChange={(e) => setOptions(prev => ({ 
                      ...prev, 
                      delimiter: e.target.value 
                    }))}
                    className="w-full text-sm rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="\t">Tab</option>
                    <option value="|">Pipe (|)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export {EXPORT_FORMATS.find(f => f.format === selectedFormat)?.label}
            </>
          )}
        </button>

        {/* Export Result */}
        {exportResult && (
          <div className={`mt-4 p-3 rounded-lg ${
            exportResult.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start">
              {exportResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              )}
              <div className="flex-1">
                {exportResult.success ? (
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Export completed successfully!
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      File: {exportResult.filename} ({formatFileSize(exportResult.size)})
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Export failed
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      {exportResult.error || 'Unknown error occurred'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Export Summary */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-600">
            <span>{config.data.length} rows</span>
            <span>{config.columns.filter(col => col.visible !== false).length} columns</span>
          </div>
        </div>
      </div>
    </div>
  );
};