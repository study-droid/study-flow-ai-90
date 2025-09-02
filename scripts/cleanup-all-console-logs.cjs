#!/usr/bin/env node

/**
 * Script to replace all console statements with logger calls
 * This will update all TypeScript and TypeScript React files
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files to skip
const SKIP_FILES = [
  'logger.ts',
  'logger.test.ts',
  'cleanup-all-console-logs.js',
  'node_modules',
  'dist',
  'build',
  '.next'
];

// Check if file should be skipped
function shouldSkip(filePath) {
  return SKIP_FILES.some(skip => filePath.includes(skip));
}

// Add logger import if not present
function addLoggerImport(content, filePath) {
  // Check if logger is already imported
  if (content.includes("from '@/services/logging/logger'") || 
      content.includes('from "@/services/logging/logger"')) {
    return content;
  }
  
  // Find the last import statement
  const importRegex = /^import .* from ['"].*['"];?$/gm;
  let lastImportIndex = -1;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    lastImportIndex = match.index + match[0].length;
  }
  
  if (lastImportIndex !== -1) {
    // Add logger import after the last import
    const before = content.substring(0, lastImportIndex);
    const after = content.substring(lastImportIndex);
    return before + "\nimport { logger } from '@/services/logging/logger';" + after;
  } else {
    // Add at the beginning of the file
    return "import { logger } from '@/services/logging/logger';\n\n" + content;
  }
}

// Get context name from file path
function getContextName(filePath) {
  const fileName = path.basename(filePath, path.extname(filePath));
  
  // Remove common suffixes
  let contextName = fileName
    .replace(/\.test$/, '')
    .replace(/\.spec$/, '')
    .replace(/\.tsx?$/, '');
  
  // Convert to PascalCase
  contextName = contextName
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  
  // Handle special cases
  if (contextName.toLowerCase().includes('hook')) {
    contextName = contextName.replace(/^use/, '');
  }
  
  return contextName;
}

// Replace console statements
function replaceConsoleStatements(content, contextName) {
  let modified = content;
  let hasChanges = false;
  
  // Replace console.log
  modified = modified.replace(/console\.log\((.*?)\);?$/gm, (match, args) => {
    hasChanges = true;
    return `logger.debug(${args}, '${contextName}');`;
  });
  
  // Replace console.info
  modified = modified.replace(/console\.info\((.*?)\);?$/gm, (match, args) => {
    hasChanges = true;
    return `logger.info(${args}, '${contextName}');`;
  });
  
  // Replace console.warn
  modified = modified.replace(/console\.warn\((.*?)\);?$/gm, (match, args) => {
    hasChanges = true;
    return `logger.warn(${args}, '${contextName}');`;
  });
  
  // Replace console.error
  modified = modified.replace(/console\.error\((.*?)\);?$/gm, (match, args) => {
    hasChanges = true;
    return `logger.error(${args}, '${contextName}');`;
  });
  
  // Handle .catch(console.error) pattern
  modified = modified.replace(/\.catch\(console\.error\)/g, (match) => {
    hasChanges = true;
    return `.catch(err => logger.error('Promise rejection', '${contextName}', err))`;
  });
  
  return { content: modified, hasChanges };
}

// Process a single file
function processFile(filePath) {
  if (shouldSkip(filePath)) {
    return { processed: false, reason: 'skipped' };
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const contextName = getContextName(filePath);
    
    // Check if file has console statements
    if (!content.match(/console\.(log|info|warn|error)/)) {
      return { processed: false, reason: 'no console statements' };
    }
    
    // Replace console statements
    const { content: modifiedContent, hasChanges } = replaceConsoleStatements(content, contextName);
    
    if (hasChanges) {
      // Add logger import if needed
      const finalContent = addLoggerImport(modifiedContent, filePath);
      
      // Write the file
      fs.writeFileSync(filePath, finalContent, 'utf8');
      
      return { 
        processed: true, 
        contextName,
        statements: (content.match(/console\.(log|info|warn|error)/g) || []).length
      };
    }
    
    return { processed: false, reason: 'no changes needed' };
  } catch (error) {
    return { processed: false, reason: `error: ${error.message}` };
  }
}

// Main function
function main() {
  console.log('🔍 Searching for TypeScript files with console statements...\n');
  
  // Find all TypeScript files
  const files = glob.sync('src/**/*.{ts,tsx}', {
    cwd: process.cwd(),
    absolute: true
  });
  
  console.log(`Found ${files.length} TypeScript files to process\n`);
  
  const results = {
    processed: [],
    skipped: [],
    errors: []
  };
  
  // Process each file
  files.forEach(filePath => {
    const result = processFile(filePath);
    const relativePath = path.relative(process.cwd(), filePath);
    
    if (result.processed) {
      results.processed.push({
        file: relativePath,
        contextName: result.contextName,
        statements: result.statements
      });
      console.log(`✅ Processed: ${relativePath} (${result.statements} statements)`);
    } else if (result.reason === 'skipped') {
      results.skipped.push(relativePath);
    } else if (result.reason?.startsWith('error')) {
      results.errors.push({ file: relativePath, error: result.reason });
      console.log(`❌ Error: ${relativePath} - ${result.reason}`);
    }
  });
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Files processed: ${results.processed.length}`);
  console.log(`⏭️  Files skipped: ${results.skipped.length}`);
  console.log(`❌ Errors: ${results.errors.length}`);
  
  if (results.processed.length > 0) {
    const totalStatements = results.processed.reduce((sum, r) => sum + r.statements, 0);
    console.log(`\n📝 Total console statements replaced: ${totalStatements}`);
    
    console.log('\nTop files by statements replaced:');
    results.processed
      .sort((a, b) => b.statements - a.statements)
      .slice(0, 10)
      .forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.file} (${r.statements} statements)`);
      });
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ Files with errors:');
    results.errors.forEach(e => {
      console.log(`  - ${e.file}: ${e.error}`);
    });
  }
  
  // Create report file
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: files.length,
      processed: results.processed.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
      totalStatements: results.processed.reduce((sum, r) => sum + r.statements, 0)
    },
    details: results
  };
  
  const reportPath = `console-cleanup-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

// Run the script
main();