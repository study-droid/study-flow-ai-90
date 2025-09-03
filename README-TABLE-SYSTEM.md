# AI-Powered Table Creation System

A comprehensive table generation and management system integrated with DeepSeek AI for StudyFlow applications.

## Features

### 🤖 AI Integration
- **DeepSeek API Integration**: Intelligent table structure and data generation
- **Natural Language Processing**: Describe tables in plain English
- **Smart Data Generation**: AI creates realistic sample data based on context
- **Quality Assessment**: Automated evaluation of generated content

### 📊 Advanced Table Functionality
- **Interactive Tables**: Sorting, filtering, searching, and pagination
- **Data Validation**: Comprehensive schema validation and type checking
- **Performance Optimization**: Virtualization for large datasets (1000+ rows)
- **Memory Management**: Intelligent caching and cleanup

### 🎨 Professional Styling
- **Multiple Templates**: Corporate, Academic, Financial, Dashboard themes
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Dark Mode Support**: Automatic theme switching
- **Custom Styling**: Extensible CSS-in-JS system

### ♿ Accessibility (WCAG AA/AAA)
- **Screen Reader Support**: Full ARIA implementation
- **Keyboard Navigation**: Complete keyboard accessibility
- **Focus Management**: Logical tab order and focus indicators
- **High Contrast**: Color blindness and vision impairment support

### 📤 Export Capabilities
- **Multiple Formats**: HTML, CSV, JSON, Excel
- **Custom Styling**: Preserve formatting in exports
- **Metadata Inclusion**: Export with generation details
- **Batch Processing**: Handle large datasets efficiently

## Quick Start

### Basic Usage

```tsx
import { TableBuilder, AdvancedTable } from '@/components/tables';

// AI-powered table generation
<TableBuilder
  initialPrompt="Create a student grade tracking table with courses and assignments"
  onTableGenerated={(config) => console.log('Generated:', config)}
/>

// Display generated table
<AdvancedTable config={tableConfig} />
```

### Manual Table Creation

```tsx
import type { TableConfig } from '@/types/table-types';

const tableConfig: TableConfig = {
  title: "Student Grades",
  description: "Track academic performance",
  columns: [
    { accessor: 'course', header: 'Course', dataType: 'string', sortable: true },
    { accessor: 'grade', header: 'Grade', dataType: 'number', sortable: true },
    { accessor: 'date', header: 'Date', dataType: 'date', sortable: true }
  ],
  data: [
    { course: 'Math 101', grade: 95, date: '2024-01-15' },
    { course: 'Physics 201', grade: 88, date: '2024-01-20' }
  ],
  pagination: { enabled: true, pageSize: 10 },
  performance: { enableVirtualization: true }
};
```

## Components

### TableBuilder
Main component for AI-powered table generation.

```tsx
interface TableBuilderProps {
  initialPrompt?: string;
  onTableGenerated: (config: TableConfig) => void;
  onBuildingStateChange?: (isBuilding: boolean) => void;
  className?: string;
}
```

### AdvancedTable
Professional table display with full functionality.

```tsx
interface AdvancedTableProps {
  config: TableConfig;
  onConfigChange?: (config: TableConfig) => void;
  className?: string;
}
```

### ExportPanel
Export functionality with multiple format support.

```tsx
interface ExportPanelProps {
  config: TableConfig;
  onExport?: (result: ExportResult) => void;
  className?: string;
}
```

### TableDemo
Comprehensive demonstration component with examples.

```tsx
<TableDemo />
```

## Services

### AI Table Service
Handles DeepSeek API integration for intelligent table generation.

```tsx
import { aiTableService } from '@/services/tables/ai-table-service';

// Generate table from natural language
const config = await aiTableService.generateTable(
  "Create a budget tracking table with income and expenses"
);

// Analyze existing table
const analysis = await aiTableService.analyzeTable(existingConfig);
```

### Table Processor
Data validation, transformation, and processing.

```tsx
import { tableProcessor } from '@/services/tables/table-processor';

// Validate data against schema
const validation = await tableProcessor.validateData(data, schema);

// Process and transform data
const processed = await tableProcessor.processData(rawData, config);
```

### Table Formatter
Professional formatting and styling system.

```tsx
import { tableFormatter } from '@/services/tables/table-formatter';

// Apply formatting template
const formatted = await tableFormatter.formatTableData(config, 'corporate');

// Get template styles
const styles = tableFormatter.getTemplateStyles('academic');
```

### Performance Optimizer
Virtualization, caching, and performance monitoring.

```tsx
import { tablePerformanceOptimizer } from '@/services/tables/table-performance';

// Optimize configuration
const optimized = tablePerformanceOptimizer.optimizeTableConfig(config, dataSize);

// Track performance
tablePerformanceOptimizer.trackRenderPerformance(renderTime);
```

### Table Exporter
Export tables to various formats.

```tsx
import { tableExporter } from '@/services/tables/table-exporter';

// Export to HTML with styling
const result = await tableExporter.exportTable(config, {
  format: 'html',
  includeFormatting: true,
  template: 'professional'
});

// Download file
tableExporter.downloadFile(result);
```

## Configuration Types

### TableConfig
Main configuration object for tables.

```typescript
interface TableConfig {
  title?: string;
  description?: string;
  columns: TableColumn[];
  data: TableRow[];
  pagination?: PaginationConfig;
  sorting?: SortingConfig;
  filtering?: FilteringConfig;
  performance?: PerformanceConfig;
  accessibility?: AccessibilityConfig;
  styling?: StylingConfig;
}
```

### Column Definition
Configure individual table columns.

```typescript
interface TableColumn {
  accessor: string;
  header: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'currency' | 'percentage';
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  visible?: boolean;
  width?: number | string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  priority?: number;
  formatter?: (value: any) => string;
  validator?: (value: any) => boolean;
}
```

## Templates

### Available Templates
- **Professional**: Clean, modern styling
- **Corporate**: Business-focused design  
- **Academic**: Research paper style
- **Financial**: Money-focused formatting
- **Dashboard**: Metrics and KPI style

### Template Usage

```tsx
// In TableBuilder
<TableBuilder
  template="corporate"
  onTableGenerated={handleGenerated}
/>

// In Export
await tableExporter.exportTable(config, {
  format: 'html',
  template: 'academic',
  includeFormatting: true
});
```

## Performance Guidelines

### Large Dataset Optimization
- Enable virtualization for 500+ rows
- Use server-side pagination for 10,000+ rows
- Implement column virtualization for 20+ columns
- Enable row recycling for memory efficiency

### Memory Management
- Monitor cache size (default: 100MB limit)
- Use LRU eviction strategy
- Clean up observers and timers
- Implement batch processing for transforms

### Rendering Performance
- Target 60fps for scroll performance
- Debounce search/filter inputs (150ms)
- Throttle scroll events (16ms)
- Use requestAnimationFrame for animations

## Accessibility Features

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to activate buttons
- Arrow keys for table navigation
- Escape to close modals/menus

### Screen Reader Support
- ARIA labels for all controls
- Table headers properly associated
- Status announcements for actions
- Descriptive error messages

### Visual Accessibility
- High contrast mode support
- Focus indicators clearly visible
- Minimum 4.5:1 color contrast ratio
- Scalable fonts and spacing

## API Integration

### DeepSeek Configuration
Ensure your DeepSeek API configuration is set up:

```typescript
// In environment variables
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/v1

// The system automatically uses these for table generation
```

### Custom AI Providers
To integrate with other AI providers:

```typescript
// Extend the AI service
import { aiTableService } from '@/services/tables/ai-table-service';

// Override the generateTable method
aiTableService.setCustomProvider({
  generateTable: async (prompt: string) => {
    // Your custom AI logic here
  }
});
```

## Error Handling

### Validation Errors
```typescript
try {
  const result = await tableProcessor.validateData(data, schema);
  if (!result.isValid) {
    console.log('Validation errors:', result.errors);
  }
} catch (error) {
  console.error('Validation failed:', error);
}
```

### Export Errors
```typescript
const exportResult = await tableExporter.exportTable(config, options);
if (!exportResult.success) {
  console.error('Export failed:', exportResult.error);
}
```

### AI Generation Errors
```typescript
try {
  const config = await aiTableService.generateTable(prompt);
} catch (error) {
  if (error.name === 'AIServiceError') {
    // Handle AI-specific errors
  }
}
```

## Best Practices

### Performance
1. Enable virtualization for large datasets
2. Use appropriate page sizes (50-100 rows)
3. Implement proper caching strategies
4. Monitor memory usage regularly

### Accessibility
1. Always provide meaningful labels
2. Test with screen readers
3. Ensure keyboard navigation works
4. Maintain focus management

### Data Quality
1. Validate data before processing
2. Handle missing/null values gracefully
3. Provide meaningful error messages
4. Use appropriate data types

### User Experience
1. Show loading states during generation
2. Provide clear feedback for actions
3. Allow customization of table features
4. Make export options discoverable

## Examples

### Educational Use Cases
```tsx
// Study schedule generator
<TableBuilder
  initialPrompt="Create a weekly study schedule for computer science courses"
  template="academic"
/>

// Grade tracking system  
<TableBuilder
  initialPrompt="Generate a grade book for tracking student assignments and exams"
  template="professional"
/>
```

### Business Applications
```tsx
// Project management
<TableBuilder
  initialPrompt="Create a project timeline with tasks, deadlines, and team assignments"
  template="corporate"
/>

// Sales analytics
<TableBuilder
  initialPrompt="Generate a sales performance table with revenue metrics"
  template="financial"
/>
```

### Personal Productivity
```tsx
// Budget tracking
<TableBuilder
  initialPrompt="Create a monthly budget planner with income and expense categories"
  template="dashboard"
/>

// Task management
<TableBuilder
  initialPrompt="Generate a personal task tracker with priorities and due dates"
  template="professional"
/>
```

## Contributing

When adding new features:

1. Follow TypeScript strict mode
2. Include comprehensive JSDoc comments  
3. Add accessibility considerations
4. Write unit tests for services
5. Update type definitions
6. Document performance implications

## License

This table system is part of the StudyFlow AI project and follows the same license terms.

---

For technical support or feature requests, please refer to the main StudyFlow documentation or create an issue in the project repository.