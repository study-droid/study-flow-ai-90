import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Files with the most any types that need fixing
const criticalFiles = [
  { path: 'src/services/export/export-service.ts', anyCount: 21 },
  { path: 'src/services/analytics/analytics-service.ts', anyCount: 13 },
  { path: 'src/lib/secure-logger.ts', anyCount: 10 },
  { path: 'src/services/ai-tutor-gemini.ts', anyCount: 9 },
  { path: 'src/lib/secure-disposal.ts', anyCount: 9 },
  { path: 'src/services/real-analytics.ts', anyCount: 7 },
  { path: 'src/services/performance/performance-monitor.ts', anyCount: 7 }
];

// Common type replacements
const typeReplacements = [
  // Error handling
  { pattern: /catch\s*\(\s*error\s*:\s*any\s*\)/g, replacement: 'catch (error: unknown)' },
  { pattern: /catch\s*\(\s*e\s*:\s*any\s*\)/g, replacement: 'catch (e: unknown)' },
  { pattern: /catch\s*\(\s*err\s*:\s*any\s*\)/g, replacement: 'catch (err: unknown)' },
  
  // Event handlers
  { pattern: /\(e\s*:\s*any\)/g, replacement: '(e: Event)' },
  { pattern: /\(event\s*:\s*any\)/g, replacement: '(event: Event)' },
  
  // Data types
  { pattern: /data\s*:\s*any\[\]/g, replacement: 'data: unknown[]' },
  { pattern: /response\s*:\s*any/g, replacement: 'response: unknown' },
  { pattern: /result\s*:\s*any/g, replacement: 'result: unknown' },
  { pattern: /payload\s*:\s*any/g, replacement: 'payload: unknown' },
  
  // Function parameters
  { pattern: /\(value\s*:\s*any\)/g, replacement: '(value: unknown)' },
  { pattern: /\(item\s*:\s*any\)/g, replacement: '(item: unknown)' },
  { pattern: /\(obj\s*:\s*any\)/g, replacement: '(obj: Record<string, unknown>)' },
  
  // Casts
  { pattern: /as\s+any\b/g, replacement: 'as unknown' },
  
  // Return types
  { pattern: /\):\s*any\s*{/g, replacement: '): unknown {' },
  { pattern: /\):\s*Promise<any>/g, replacement: '): Promise<unknown>' },
  
  // Generic any
  { pattern: /<any>/g, replacement: '<unknown>' }
];

let totalFixed = 0;
let filesModified = 0;

function fixTypeScriptFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return 0;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let fixCount = 0;
  
  // Apply replacements
  typeReplacements.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches) {
      fixCount += matches.length;
      content = content.replace(pattern, replacement);
    }
  });
  
  // Additional specific fixes for common patterns
  
  // Fix Record<string, any>
  content = content.replace(/Record<string,\s*any>/g, 'Record<string, unknown>');
  
  // Fix function any parameters with context
  content = content.replace(/function\s+\w+\([^)]*:\s*any[^)]*\)/g, (match) => {
    return match.replace(/:\s*any/g, ': unknown');
  });
  
  // Fix arrow function any parameters
  content = content.replace(/\([^)]*:\s*any[^)]*\)\s*=>/g, (match) => {
    return match.replace(/:\s*any/g, ': unknown');
  });
  
  // Fix any[] arrays
  content = content.replace(/:\s*any\[\]/g, ': unknown[]');
  
  // Fix Promise<any>
  content = content.replace(/Promise<any>/g, 'Promise<unknown>');
  
  // Fix specific service types
  if (filePath.includes('export-service')) {
    // PDF types
    content = content.replace(/doc:\s*any/g, 'doc: PDFDocument');
    content = content.replace(/pdf:\s*any/g, 'pdf: Blob');
  }
  
  if (filePath.includes('analytics-service')) {
    // Analytics types
    content = content.replace(/metrics:\s*any/g, 'metrics: AnalyticsMetrics');
    content = content.replace(/event:\s*any/g, 'event: AnalyticsEvent');
  }
  
  if (fixCount > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ ${filePath}: Fixed ${fixCount} any types`);
    totalFixed += fixCount;
    filesModified++;
  } else {
    console.log(`⚪ ${filePath}: No any types to fix`);
  }
  
  return fixCount;
}

// Add type definitions for common interfaces
const typeDefinitions = `// Common type definitions to replace 'any'
export type UnknownObject = Record<string, unknown>;
export type UnknownArray = unknown[];
export type AsyncFunction<T = unknown> = () => Promise<T>;
export type EventHandler = (event: Event) => void;
export type ErrorHandler = (error: unknown) => void;

// Analytics types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
}

export interface AnalyticsMetrics {
  [key: string]: number | string | boolean;
}

// PDF types
export interface PDFDocument {
  addPage: () => void;
  text: (text: string, x?: number, y?: number) => void;
  save: () => Blob;
}
`;

// Create types file
const typesPath = path.join(__dirname, '..', 'src', 'types', 'common.ts');
const typesDir = path.dirname(typesPath);

if (!fs.existsSync(typesDir)) {
  fs.mkdirSync(typesDir, { recursive: true });
}

fs.writeFileSync(typesPath, typeDefinitions, 'utf8');
console.log('✅ Created common type definitions at src/types/common.ts');

console.log('\n========================================');
console.log('TypeScript Any Type Fixer');
console.log('========================================\n');

// Fix critical files first
console.log('Fixing critical files with most any types...\n');
criticalFiles.forEach(({ path }) => {
  fixTypeScriptFile(path);
});

// Fix other files with any types
console.log('\nFixing other files...\n');
const otherFiles = [
  'src/hooks/useAuth.tsx',
  'src/hooks/useCalendarSync.ts',
  'src/hooks/useNotifications.ts',
  'src/hooks/useProfile.ts',
  'src/hooks/useSearch.ts',
  'src/hooks/useStudyGoals.ts',
  'src/hooks/useStudySessions.ts',
  'src/hooks/useSubjects.ts',
  'src/hooks/useTasks.ts',
  'src/hooks/useTimetable.ts',
  'src/lib/api-extended.ts',
  'src/lib/csrf-protection.ts',
  'src/lib/distributed-rate-limiter.ts',
  'src/lib/enhanced-security.ts',
  'src/lib/file-validation.ts',
  'src/lib/logger.ts',
  'src/lib/pdfExport.ts',
  'src/lib/request-signer.ts',
  'src/lib/security-middleware.ts'
];

otherFiles.forEach(file => {
  fixTypeScriptFile(file);
});

console.log('\n========================================');
console.log('Summary');
console.log('========================================');
console.log(`Total any types fixed: ${totalFixed}`);
console.log(`Files modified: ${filesModified}`);
console.log('\n✅ TypeScript types have been improved!');
console.log('\nNote: Some "unknown" types may need more specific types based on context.');
console.log('Run "npm run type-check" to verify no type errors were introduced.');