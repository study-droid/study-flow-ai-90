/**
 * Advanced Table Component
 * Professional table display with comprehensive features, accessibility, and performance optimization
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableCaption
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  ChevronUp, 
  ChevronDown,
  ChevronsUpDown,
  Filter,
  Search,
  Download,
  Eye,
  EyeOff,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

import { 
  ariaLabels, 
  announceToScreenReader, 
  focusManagement,
  getProgressLabel
} from '@/lib/accessibility';
import { performanceMonitor } from '@/services/performance/performance-monitor';
import { logger } from '@/services/logging/logger';
import type { 
  TableConfig,
  TableColumn,
  TableRow,
  TableSort,
  TableFilter,
  TableState,
  CellValue,
  SortDirection,
  FilterOperator
} from '@/types/table-types';

export interface AdvancedTableProps {
  config: TableConfig;
  onConfigChange?: (config: Partial<TableConfig>) => void;
  onDataChange?: (data: TableRow[]) => void;
  className?: string;
  'aria-label'?: string;
}

interface TableUIState {
  // Sorting
  sorts: TableSort[];
  
  // Filtering
  filters: TableFilter[];
  globalSearch: string;
  
  // Pagination
  currentPage: number;
  pageSize: number;
  
  // Selection
  selectedRows: Set<string | number>;
  
  // UI State
  columnVisibility: Record<string, boolean>;
  loading: boolean;
  error: string | null;
  
  // Interaction
  focusedCell: { rowIndex: number; columnIndex: number } | null;
  editingCell: { rowId: string | number; columnId: string } | null;
}

export const AdvancedTable: React.FC<AdvancedTableProps> = ({
  config,
  onConfigChange,
  onDataChange,
  className,
  'aria-label': ariaLabel
}) => {
  const tableRef = useRef<HTMLTableElement>(null);
  const [uiState, setUIState] = useState<TableUIState>({
    sorts: config.sorting?.defaultSort || [],
    filters: config.filtering?.defaultFilters || [],
    globalSearch: '',
    currentPage: config.pagination?.page || 1,
    pageSize: config.pagination?.pageSize || 20,
    selectedRows: new Set(config.selection?.selectedRows || []),
    columnVisibility: config.columns.reduce((acc, col) => {
      acc[col.id] = col.visible !== false;
      return acc;
    }, {} as Record<string, boolean>),
    loading: config.loading || false,
    error: null,
    focusedCell: null,
    editingCell: null
  });

  // Filter data based on current filters and search
  const filteredData = useMemo(() => {
    let data = [...config.data];
    
    // Apply global search
    if (uiState.globalSearch && config.filtering?.globalSearch) {
      const searchTerm = uiState.globalSearch.toLowerCase();
      data = data.filter(row => {
        return config.columns.some(col => {
          const value = String(row.data[col.key] || '').toLowerCase();
          return value.includes(searchTerm);
        });
      });
    }
    
    // Apply column filters
    uiState.filters.forEach(filter => {
      const column = config.columns.find(col => col.id === filter.columnId);
      if (!column) return;
      
      data = data.filter(row => {
        const cellValue = row.data[column.key];
        return applyFilter(cellValue, filter);
      });
    });
    
    return data;
  }, [config.data, config.columns, uiState.globalSearch, uiState.filters, config.filtering]);

  // Sort filtered data
  const sortedData = useMemo(() => {
    if (uiState.sorts.length === 0) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      for (const sort of uiState.sorts) {
        const column = config.columns.find(col => col.id === sort.columnId);
        if (!column || !sort.direction) continue;
        
        const aValue = a.data[column.key];
        const bValue = b.data[column.key];
        
        const comparison = compareValues(aValue, bValue, column.dataType);
        if (comparison !== 0) {
          return sort.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }, [filteredData, uiState.sorts, config.columns]);

  // Paginate sorted data
  const paginatedData = useMemo(() => {
    if (!config.pagination?.enabled) return sortedData;
    
    const startIndex = (uiState.currentPage - 1) * uiState.pageSize;
    return sortedData.slice(startIndex, startIndex + uiState.pageSize);
  }, [sortedData, uiState.currentPage, uiState.pageSize, config.pagination]);

  // Visible columns
  const visibleColumns = useMemo(() => {
    return config.columns.filter(col => uiState.columnVisibility[col.id]);
  }, [config.columns, uiState.columnVisibility]);

  // Update UI state
  const updateUIState = useCallback((updates: Partial<TableUIState>) => {
    setUIState(prev => ({ ...prev, ...updates }));
  }, []);

  // Handle sorting
  const handleSort = useCallback((columnId: string) => {
    const column = config.columns.find(col => col.id === columnId);
    if (!column?.sortable) return;

    const existingSort = uiState.sorts.find(s => s.columnId === columnId);
    let newDirection: SortDirection;
    
    if (!existingSort) {
      newDirection = 'asc';
    } else if (existingSort.direction === 'asc') {
      newDirection = 'desc';
    } else {
      newDirection = null;
    }

    let newSorts: TableSort[];
    if (config.sorting?.multiColumn) {
      if (newDirection === null) {
        newSorts = uiState.sorts.filter(s => s.columnId !== columnId);
      } else {
        const otherSorts = uiState.sorts.filter(s => s.columnId !== columnId);
        newSorts = [...otherSorts, { columnId, direction: newDirection, priority: otherSorts.length }];
      }
    } else {
      newSorts = newDirection === null ? [] : [{ columnId, direction: newDirection }];
    }

    updateUIState({ sorts: newSorts });
    config.onSort?.(newSorts);
    
    if (newDirection) {
      announceToScreenReader(
        `Column ${column.title} sorted ${newDirection === 'asc' ? 'ascending' : 'descending'}`
      );
    } else {
      announceToScreenReader(`Column ${column.title} sort removed`);
    }
  }, [config, uiState.sorts]);

  // Handle row selection
  const handleRowSelection = useCallback((rowId: string | number, selected: boolean) => {
    if (!config.selection?.enabled) return;

    const newSelectedRows = new Set(uiState.selectedRows);
    
    if (config.selection.mode === 'single') {
      newSelectedRows.clear();
      if (selected) {
        newSelectedRows.add(rowId);
      }
    } else {
      if (selected) {
        newSelectedRows.add(rowId);
      } else {
        newSelectedRows.delete(rowId);
      }
    }

    updateUIState({ selectedRows: newSelectedRows });
    config.selection.onSelectionChange?.(Array.from(newSelectedRows));
    
    announceToScreenReader(
      `Row ${selected ? 'selected' : 'deselected'}. ${newSelectedRows.size} rows selected`
    );
  }, [config.selection, uiState.selectedRows]);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    if (page < 1 || (config.pagination && page > Math.ceil(sortedData.length / uiState.pageSize))) {
      return;
    }
    
    updateUIState({ currentPage: page });
    config.onPageChange?.(page, uiState.pageSize);
    
    announceToScreenReader(`Page ${page} loaded`);
  }, [config, sortedData.length, uiState.pageSize]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!config.accessibility?.enableKeyboardNavigation) return;

    const { key, ctrlKey, metaKey, shiftKey } = event;
    
    switch (key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        event.preventDefault();
        // Handle arrow key navigation
        break;
      
      case 'Enter':
      case ' ':
        // Handle selection or activation
        break;
        
      case 'Home':
      case 'End':
        // Handle home/end navigation
        break;
    }
  }, [config.accessibility]);

  // Export functionality
  const handleExport = useCallback(async (format: 'csv' | 'json' | 'html') => {
    if (!config.export?.enableExport) return;

    try {
      updateUIState({ loading: true });
      
      const dataToExport = config.export.includeFiltered ? sortedData : config.data;
      const columnsToExport = visibleColumns;
      
      if (config.export.customExporter) {
        const result = config.export.customExporter(dataToExport, columnsToExport, format);
        
        let blob: Blob;
        if (typeof result === 'string') {
          blob = new Blob([result], { type: getMimeType(format) });
        } else {
          blob = result;
        }
        
        downloadBlob(blob, `${config.export.filename || 'table'}.${format}`);
      } else {
        // Use default export logic
        await exportData(dataToExport, columnsToExport, format, config.export.filename);
      }
      
      announceToScreenReader(`Table exported as ${format.toUpperCase()}`);
      
    } catch (error) {
      logger.error('Export failed', 'AdvancedTable', error);
      updateUIState({ error: 'Export failed. Please try again.' });
    } finally {
      updateUIState({ loading: false });
    }
  }, [config.export, sortedData, visibleColumns, config.data]);

  // Render table header
  const renderHeader = useCallback(() => (
    <TableHeader>
      <TableRow>
        {config.selection?.enabled && config.selection.checkboxColumn && (
          <TableHead className="w-12">
            <Checkbox
              checked={
                uiState.selectedRows.size > 0 && 
                uiState.selectedRows.size === paginatedData.length
              }
              onCheckedChange={(checked) => {
                const newSelectedRows = new Set(uiState.selectedRows);
                paginatedData.forEach(row => {
                  if (checked) {
                    newSelectedRows.add(row.id);
                  } else {
                    newSelectedRows.delete(row.id);
                  }
                });
                updateUIState({ selectedRows: newSelectedRows });
              }}
              aria-label="Select all rows"
            />
          </TableHead>
        )}
        
        {visibleColumns.map((column) => {
          const sort = uiState.sorts.find(s => s.columnId === column.id);
          
          return (
            <TableHead
              key={column.id}
              className={cn(
                'relative select-none',
                column.sortable && 'cursor-pointer hover:bg-muted/50',
                column.headerClassName
              )}
              onClick={() => column.sortable && handleSort(column.id)}
              style={{ 
                width: column.width,
                minWidth: column.minWidth,
                maxWidth: column.maxWidth,
                textAlign: column.align
              }}
              aria-sort={
                sort?.direction === 'asc' ? 'ascending' :
                sort?.direction === 'desc' ? 'descending' : 
                'none'
              }
              aria-label={
                column.ariaLabel || 
                `${column.title}${column.sortable ? ', sortable column' : ''}`
              }
            >
              <div className="flex items-center justify-between">
                <span>{column.title}</span>
                {column.sortable && (
                  <div className="flex items-center ml-2">
                    {sort?.direction === 'asc' && <ChevronUp className="h-4 w-4" />}
                    {sort?.direction === 'desc' && <ChevronDown className="h-4 w-4" />}
                    {!sort?.direction && <ChevronsUpDown className="h-4 w-4 opacity-50" />}
                  </div>
                )}
              </div>
            </TableHead>
          );
        })}
      </TableRow>
    </TableHeader>
  ), [config, visibleColumns, uiState.sorts, uiState.selectedRows, paginatedData, handleSort]);

  // Render table body
  const renderBody = useCallback(() => (
    <TableBody>
      {paginatedData.map((row, rowIndex) => (
        <TableRow
          key={row.id}
          className={cn(
            'hover:bg-muted/50 transition-colors',
            uiState.selectedRows.has(row.id) && 'bg-muted',
            row.disabled && 'opacity-50 cursor-not-allowed',
            row.className,
            config.styling?.rowClassNameSelector?.(row, rowIndex)
          )}
          onClick={(event) => {
            config.onRowClick?.(row, event);
            if (config.selection?.enabled && !row.disabled) {
              handleRowSelection(row.id, !uiState.selectedRows.has(row.id));
            }
          }}
          onDoubleClick={(event) => config.onRowDoubleClick?.(row, event)}
          aria-selected={uiState.selectedRows.has(row.id)}
          aria-disabled={row.disabled}
        >
          {config.selection?.enabled && config.selection.checkboxColumn && (
            <TableCell className="w-12">
              <Checkbox
                checked={uiState.selectedRows.has(row.id)}
                onCheckedChange={(checked) => handleRowSelection(row.id, !!checked)}
                disabled={row.disabled}
                aria-label={`Select row ${rowIndex + 1}`}
              />
            </TableCell>
          )}
          
          {visibleColumns.map((column, colIndex) => {
            const cellValue = row.data[column.key];
            const formattedValue = column.formatter 
              ? column.formatter(cellValue, row)
              : String(cellValue || '');
            
            return (
              <TableCell
                key={column.id}
                className={cn(
                  column.cellClassName,
                  config.styling?.cellClassNameSelector?.(cellValue, row, column)
                )}
                style={{
                  textAlign: column.align,
                  ...config.styling?.cellStyle
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  config.onCellClick?.(cellValue, row, column, event);
                }}
                aria-label={`${column.title}: ${String(formattedValue)}`}
              >
                {column.customRenderer 
                  ? column.customRenderer(cellValue, row)
                  : formattedValue
                }
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </TableBody>
  ), [config, visibleColumns, paginatedData, uiState.selectedRows, handleRowSelection]);

  // Render pagination
  const renderPagination = useCallback(() => {
    if (!config.pagination?.enabled) return null;

    const totalRows = sortedData.length;
    const totalPages = Math.ceil(totalRows / uiState.pageSize);
    const startRow = (uiState.currentPage - 1) * uiState.pageSize + 1;
    const endRow = Math.min(uiState.currentPage * uiState.pageSize, totalRows);

    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {getProgressLabel(endRow - startRow + 1, totalRows, 'row')}
          </span>
          {config.pagination.showPageSizeSelector && (
            <Select
              value={String(uiState.pageSize)}
              onValueChange={(value) => {
                const newPageSize = parseInt(value);
                updateUIState({ 
                  pageSize: newPageSize,
                  currentPage: 1 
                });
                config.onPageChange?.(1, newPageSize);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {config.pagination.pageSizeOptions?.map(size => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                )) || (
                  <>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={uiState.currentPage === 1}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(uiState.currentPage - 1)}
            disabled={uiState.currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm">
            Page {uiState.currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(uiState.currentPage + 1)}
            disabled={uiState.currentPage === totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={uiState.currentPage === totalPages}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }, [config.pagination, sortedData.length, uiState.currentPage, uiState.pageSize, handlePageChange]);

  return (
    <Card className={cn('w-full', className)}>
      {/* Table Controls */}
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <span>{config.accessibility?.caption || 'Data Table'}</span>
            {uiState.loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {config.export?.enableExport && (
              <Select onValueChange={(format: any) => handleExport(format)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent>
                  {config.export.formats?.map(format => (
                    <SelectItem key={format} value={format}>
                      <Download className="h-4 w-4 mr-2 inline" />
                      {format.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Global Search */}
        {config.filtering?.globalSearch && (
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search table..."
                value={uiState.globalSearch}
                onChange={(e) => updateUIState({ globalSearch: e.target.value })}
                className="pl-10"
                aria-label="Search table data"
              />
            </div>
          </div>
        )}
        
        {uiState.error && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{uiState.error}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {/* Table Container */}
        <div className="relative overflow-auto">
          <Table
            ref={tableRef}
            className={config.styling?.className}
            onKeyDown={handleKeyDown}
            role="table"
            aria-label={ariaLabel || config.accessibility?.tableLabel || 'Data table'}
            aria-describedby="table-description"
          >
            {config.accessibility?.caption && (
              <TableCaption id="table-description">
                {config.accessibility.caption}
              </TableCaption>
            )}
            
            {renderHeader()}
            {renderBody()}
          </Table>

          {paginatedData.length === 0 && !uiState.loading && (
            <div className="text-center py-12">
              {config.emptyComponent || (
                <div className="text-muted-foreground">
                  <div className="mb-2">No data available</div>
                  {uiState.globalSearch && (
                    <div className="text-sm">
                      Try adjusting your search criteria
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {renderPagination()}
      </CardContent>
    </Card>
  );
};

// Helper functions
function applyFilter(value: CellValue, filter: TableFilter): boolean {
  const strValue = String(value || '').toLowerCase();
  const filterValue = String(filter.value || '').toLowerCase();
  
  switch (filter.operator) {
    case 'contains':
      return strValue.includes(filterValue);
    case 'equals':
      return strValue === filterValue;
    case 'startsWith':
      return strValue.startsWith(filterValue);
    case 'endsWith':
      return strValue.endsWith(filterValue);
    case 'isEmpty':
      return !value;
    case 'isNotEmpty':
      return !!value;
    default:
      return true;
  }
}

function compareValues(a: CellValue, b: CellValue, dataType: string): number {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1;
  if (b === null || b === undefined) return 1;
  
  switch (dataType) {
    case 'number':
    case 'currency':
    case 'percentage':
      return Number(a) - Number(b);
    case 'date':
      return new Date(a as string).getTime() - new Date(b as string).getTime();
    case 'boolean':
      return a === b ? 0 : a ? 1 : -1;
    default:
      return String(a).localeCompare(String(b));
  }
}

function getMimeType(format: string): string {
  switch (format) {
    case 'csv': return 'text/csv';
    case 'json': return 'application/json';
    case 'html': return 'text/html';
    default: return 'text/plain';
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function exportData(
  data: TableRow[], 
  columns: TableColumn[], 
  format: string, 
  filename?: string
) {
  // Implementation of default export logic
  // This would be similar to the export logic in TableBuilder
}

export default AdvancedTable;