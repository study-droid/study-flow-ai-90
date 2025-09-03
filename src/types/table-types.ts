/**
 * Comprehensive Table Types and Interfaces
 * Defines all types for the advanced table creation solution
 */

// Core data types supported by the table system
export type TableDataType = 
  | 'string' 
  | 'number' 
  | 'date' 
  | 'currency' 
  | 'percentage' 
  | 'boolean' 
  | 'email' 
  | 'url' 
  | 'custom';

// Cell value types
export type CellValue = string | number | boolean | Date | null | undefined;

// Table sizing options
export type TableSize = 'sm' | 'md' | 'lg' | 'xl';

// Export formats supported
export type ExportFormat = 'html' | 'csv' | 'json' | 'xlsx';

// Alignment options
export type TextAlign = 'left' | 'center' | 'right';

// Sorting directions
export type SortDirection = 'asc' | 'desc' | null;

// Filter operators
export type FilterOperator = 
  | 'equals' 
  | 'contains' 
  | 'startsWith' 
  | 'endsWith' 
  | 'greaterThan' 
  | 'lessThan' 
  | 'between' 
  | 'isEmpty' 
  | 'isNotEmpty';

/**
 * Column Definition Interface
 */
export interface TableColumn {
  // Basic properties
  id: string;
  key: string;
  title: string;
  dataType: TableDataType;
  
  // Display options
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  align?: TextAlign;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  visible?: boolean;
  
  // Styling
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
  
  // Formatting
  formatter?: (value: CellValue, row: TableRow) => string | React.ReactNode;
  customRenderer?: (value: CellValue, row: TableRow) => React.ReactNode;
  
  // Validation (for editable cells)
  editable?: boolean;
  validator?: (value: CellValue) => string | null;
  
  // Accessibility
  ariaLabel?: string;
  description?: string;
  
  // Advanced features
  sticky?: boolean;
  priority?: number; // For responsive column hiding
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'custom';
  customAggregator?: (values: CellValue[]) => CellValue;
}

/**
 * Table Row Interface
 */
export interface TableRow {
  id: string | number;
  data: Record<string, CellValue>;
  selected?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  className?: string;
  
  // For hierarchical data
  children?: TableRow[];
  parentId?: string | number;
  level?: number;
  
  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * Filter Configuration
 */
export interface TableFilter {
  columnId: string;
  operator: FilterOperator;
  value: CellValue | CellValue[];
  caseSensitive?: boolean;
}

/**
 * Sort Configuration
 */
export interface TableSort {
  columnId: string;
  direction: SortDirection;
  priority?: number; // For multi-column sorting
}

/**
 * Pagination Configuration
 */
export interface TablePagination {
  enabled: boolean;
  page: number;
  pageSize: number;
  totalRows?: number;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showPageInfo?: boolean;
  serverSide?: boolean;
}

/**
 * Table Styling Configuration
 */
export interface TableStyling {
  size: TableSize;
  striped?: boolean;
  bordered?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  className?: string;
  
  // Color theme
  theme?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  
  // Custom styles
  headerStyle?: React.CSSProperties;
  rowStyle?: React.CSSProperties;
  cellStyle?: React.CSSProperties;
  
  // Conditional styling
  rowClassNameSelector?: (row: TableRow, index: number) => string;
  cellClassNameSelector?: (value: CellValue, row: TableRow, column: TableColumn) => string;
}

/**
 * Accessibility Configuration
 */
export interface TableAccessibility {
  // ARIA labels
  tableLabel?: string;
  caption?: string;
  sortAscendingLabel?: string;
  sortDescendingLabel?: string;
  
  // Keyboard navigation
  enableKeyboardNavigation?: boolean;
  enableRowSelection?: boolean;
  enableCellFocus?: boolean;
  
  // Screen reader support
  announceUpdates?: boolean;
  announceSort?: boolean;
  announceFilter?: boolean;
  
  // High contrast mode
  highContrastMode?: boolean;
  
  // Focus management
  focusOnLoad?: boolean;
  returnFocusOnClose?: boolean;
}

/**
 * Performance Configuration
 */
export interface TablePerformance {
  // Virtualization
  enableVirtualization?: boolean;
  virtualizationThreshold?: number;
  rowHeight?: number;
  estimatedRowHeight?: number;
  
  // Debouncing
  searchDebounce?: number;
  filterDebounce?: number;
  resizeDebounce?: number;
  
  // Loading
  lazy?: boolean;
  batchSize?: number;
  prefetchRows?: number;
  
  // Memory management
  maxCachedRows?: number;
  enableRowRecycling?: boolean;
}

/**
 * Export Configuration
 */
export interface TableExportConfig {
  enableExport?: boolean;
  formats?: ExportFormat[];
  filename?: string;
  includeHeaders?: boolean;
  includeFiltered?: boolean;
  customExporter?: (data: TableRow[], columns: TableColumn[], format: ExportFormat) => string | Blob;
}

/**
 * Main Table Configuration Interface
 */
export interface TableConfig {
  // Core data
  columns: TableColumn[];
  data: TableRow[];
  
  // Features
  pagination?: TablePagination;
  sorting?: {
    enabled: boolean;
    multiColumn?: boolean;
    defaultSort?: TableSort[];
  };
  filtering?: {
    enabled: boolean;
    globalSearch?: boolean;
    columnFilters?: boolean;
    defaultFilters?: TableFilter[];
  };
  
  // Selection
  selection?: {
    enabled: boolean;
    mode: 'single' | 'multiple';
    checkboxColumn?: boolean;
    selectedRows?: (string | number)[];
    onSelectionChange?: (selectedRows: (string | number)[]) => void;
  };
  
  // Editing
  editing?: {
    enabled: boolean;
    mode: 'cell' | 'row' | 'inline';
    onCellEdit?: (rowId: string | number, columnId: string, value: CellValue) => void;
    onRowEdit?: (row: TableRow) => void;
  };
  
  // Styling
  styling: TableStyling;
  accessibility: TableAccessibility;
  performance?: TablePerformance;
  export?: TableExportConfig;
  
  // Event handlers
  onRowClick?: (row: TableRow, event: React.MouseEvent) => void;
  onRowDoubleClick?: (row: TableRow, event: React.MouseEvent) => void;
  onCellClick?: (value: CellValue, row: TableRow, column: TableColumn, event: React.MouseEvent) => void;
  onSort?: (sorts: TableSort[]) => void;
  onFilter?: (filters: TableFilter[]) => void;
  onPageChange?: (page: number, pageSize: number) => void;
  
  // Loading states
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  
  // Advanced features
  expandable?: {
    enabled: boolean;
    expandedRows?: (string | number)[];
    onExpandChange?: (expandedRows: (string | number)[]) => void;
    rowExpansionTemplate?: (row: TableRow) => React.ReactNode;
  };
  
  // Drag and drop
  dragDrop?: {
    enabled: boolean;
    reorderRows?: boolean;
    reorderColumns?: boolean;
    onRowReorder?: (fromIndex: number, toIndex: number) => void;
    onColumnReorder?: (fromIndex: number, toIndex: number) => void;
  };
}

/**
 * Table State Interface
 */
export interface TableState {
  // Data state
  processedData: TableRow[];
  filteredData: TableRow[];
  sortedData: TableRow[];
  paginatedData: TableRow[];
  
  // UI state
  currentPage: number;
  pageSize: number;
  totalRows: number;
  sorts: TableSort[];
  filters: TableFilter[];
  selectedRows: (string | number)[];
  expandedRows: (string | number)[];
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Interaction state
  focusedCell?: { rowId: string | number; columnId: string };
  editingCell?: { rowId: string | number; columnId: string };
  isDragging: boolean;
  
  // Performance metrics
  renderTime?: number;
  dataProcessingTime?: number;
  lastUpdate: number;
}

/**
 * Table Builder Input Parameters
 */
export interface TableBuilderParams {
  // Required parameters
  rows: number;
  columns: number;
  
  // Column specifications
  columnSpecs?: Partial<TableColumn>[];
  
  // Data generation
  generateSampleData?: boolean;
  dataGenerator?: (row: number, column: TableColumn) => CellValue;
  
  // Default configurations
  defaultStyling?: Partial<TableStyling>;
  defaultAccessibility?: Partial<TableAccessibility>;
  
  // Template selection
  template?: 'basic' | 'professional' | 'dashboard' | 'financial' | 'educational';
  
  // Advanced options
  enableAllFeatures?: boolean;
  customConfig?: Partial<TableConfig>;
}

/**
 * Error Handling Types
 */
export interface TableError {
  code: string;
  message: string;
  details?: unknown;
  column?: string;
  row?: number;
  timestamp: number;
}

export type TableErrorCode =
  | 'INVALID_DATA_TYPE'
  | 'VALIDATION_FAILED'
  | 'EXPORT_FAILED'
  | 'PERFORMANCE_THRESHOLD_EXCEEDED'
  | 'ACCESSIBILITY_VIOLATION'
  | 'COLUMN_NOT_FOUND'
  | 'ROW_NOT_FOUND'
  | 'INSUFFICIENT_MEMORY'
  | 'NETWORK_ERROR'
  | 'PERMISSION_DENIED';

/**
 * Performance Metrics
 */
export interface TablePerformanceMetrics {
  renderTime: number;
  dataProcessingTime: number;
  filterTime: number;
  sortTime: number;
  exportTime: number;
  memoryUsage: number;
  rowsPerSecond: number;
  totalRows: number;
  visibleRows: number;
  timestamp: number;
}

/**
 * Utility Types
 */
export type TableEventHandler<T = void> = (event: T) => void;
export type TableAsyncHandler<T = void> = (event: T) => Promise<void>;
export type TableValidator = (value: CellValue) => string | null;
export type TableFormatter = (value: CellValue, row: TableRow) => string | React.ReactNode;

/**
 * Context Types for React Context API
 */
export interface TableContextValue {
  config: TableConfig;
  state: TableState;
  actions: {
    updateConfig: (config: Partial<TableConfig>) => void;
    updateData: (data: TableRow[]) => void;
    sortBy: (columnId: string, direction?: SortDirection) => void;
    filterBy: (filters: TableFilter[]) => void;
    selectRows: (rowIds: (string | number)[]) => void;
    expandRows: (rowIds: (string | number)[]) => void;
    goToPage: (page: number) => void;
    setPageSize: (pageSize: number) => void;
    exportData: (format: ExportFormat, filename?: string) => void;
    resetTable: () => void;
  };
  utils: {
    getColumnById: (id: string) => TableColumn | undefined;
    getRowById: (id: string | number) => TableRow | undefined;
    isRowSelected: (id: string | number) => boolean;
    isRowExpanded: (id: string | number) => boolean;
    formatCellValue: (value: CellValue, column: TableColumn, row: TableRow) => string | React.ReactNode;
    validateCellValue: (value: CellValue, column: TableColumn) => string | null;
  };
}