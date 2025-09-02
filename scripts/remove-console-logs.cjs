#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const config = {
  srcDir: path.join(__dirname, '..', 'src'),
  patterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  // Files where console.log is acceptable (like logger utilities)
  whitelistFiles: [
    'lib/logger.ts',
    'lib/secure-logger.ts'
  ],
  // Patterns to identify sensitive console.logs
  sensitivePatterns: [
    /console\.log.*(?:password|token|key|secret|api|credential|auth|session|cookie)/gi,
    /console\.log.*(?:user\.id|userId|email|phone|address)/gi,
    /console\.log.*(?:DEBUG|debug)/gi
  ],
  backupDir: path.join(__dirname, '..', 'console-log-backup'),
  dryRun: false // Set to true to preview changes without modifying files
};

// Statistics
const stats = {
  totalFiles: 0,
  filesWithLogs: 0,
  totalLogsRemoved: 0,
  sensitiveLogsRemoved: 0,
  debugLogsRemoved: 0,
  fileChanges: []
};

// Create backup directory
function createBackup(filePath, content) {
  const relativePath = path.relative(config.srcDir, filePath);
  const backupPath = path.join(config.backupDir, relativePath);
  const backupDir = path.dirname(backupPath);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  fs.writeFileSync(backupPath, content, 'utf8');
}

// Check if file is whitelisted
function isWhitelisted(filePath) {
  const relativePath = path.relative(config.srcDir, filePath);
  return config.whitelistFiles.some(pattern => 
    relativePath.includes(pattern) || relativePath.endsWith(pattern)
  );
}

// Remove console.log statements
function removeConsoleLogs(content, filePath) {
  const lines = content.split('\n');
  const removedLogs = [];
  let modifiedContent = content;
  let logsRemoved = 0;
  let sensitiveRemoved = 0;
  let debugRemoved = 0;

  // Pattern to match console.log statements (including multiline)
  const consoleLogPattern = /console\s*\.\s*log\s*\([^)]*\)\s*;?/g;
  const multilinePattern = /console\s*\.\s*log\s*\([^)]*\n[^)]*\)\s*;?/gm;
  
  // First, handle multiline console.logs
  const multilineMatches = content.match(multilinePattern) || [];
  multilineMatches.forEach(match => {
    const isSensitive = config.sensitivePatterns.some(pattern => pattern.test(match));
    const isDebug = /DEBUG|debug/.test(match);
    
    removedLogs.push({
      type: isSensitive ? 'SENSITIVE' : (isDebug ? 'DEBUG' : 'NORMAL'),
      content: match.trim(),
      line: content.substring(0, content.indexOf(match)).split('\n').length
    });
    
    modifiedContent = modifiedContent.replace(match, '');
    logsRemoved++;
    if (isSensitive) sensitiveRemoved++;
    if (isDebug) debugRemoved++;
  });

  // Then handle single-line console.logs
  const singleLineMatches = modifiedContent.match(consoleLogPattern) || [];
  singleLineMatches.forEach(match => {
    const isSensitive = config.sensitivePatterns.some(pattern => pattern.test(match));
    const isDebug = /DEBUG|debug/.test(match);
    
    removedLogs.push({
      type: isSensitive ? 'SENSITIVE' : (isDebug ? 'DEBUG' : 'NORMAL'),
      content: match.trim(),
      line: modifiedContent.substring(0, modifiedContent.indexOf(match)).split('\n').length
    });
    
    modifiedContent = modifiedContent.replace(match, '');
    logsRemoved++;
    if (isSensitive) sensitiveRemoved++;
    if (isDebug) debugRemoved++;
  });

  // Clean up empty lines left behind
  modifiedContent = modifiedContent.replace(/\n\s*\n\s*\n/g, '\n\n');

  return {
    modified: logsRemoved > 0,
    content: modifiedContent,
    logsRemoved,
    sensitiveRemoved,
    debugRemoved,
    removedLogs
  };
}

// Process a single file
function processFile(filePath) {
  if (isWhitelisted(filePath)) {
    console.log(`⚪ Skipping whitelisted file: ${path.relative(config.srcDir, filePath)}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const result = removeConsoleLogs(content, filePath);

  if (result.modified) {
    const relativePath = path.relative(config.srcDir, filePath);
    
    stats.filesWithLogs++;
    stats.totalLogsRemoved += result.logsRemoved;
    stats.sensitiveLogsRemoved += result.sensitiveRemoved;
    stats.debugLogsRemoved += result.debugRemoved;
    
    stats.fileChanges.push({
      file: relativePath,
      logsRemoved: result.logsRemoved,
      sensitiveRemoved: result.sensitiveRemoved,
      debugRemoved: result.debugRemoved,
      removedLogs: result.removedLogs
    });

    if (!config.dryRun) {
      // Create backup
      createBackup(filePath, content);
      
      // Write modified content
      fs.writeFileSync(filePath, result.content, 'utf8');
      console.log(`✅ Processed: ${relativePath} (${result.logsRemoved} logs removed)`);
    } else {
      console.log(`🔍 Would process: ${relativePath} (${result.logsRemoved} logs to remove)`);
    }

    // Show sensitive logs being removed
    result.removedLogs.forEach(log => {
      if (log.type === 'SENSITIVE') {
        console.log(`   ⚠️  SENSITIVE at line ${log.line}: ${log.content.substring(0, 50)}...`);
      } else if (log.type === 'DEBUG') {
        console.log(`   🐛 DEBUG at line ${log.line}: ${log.content.substring(0, 50)}...`);
      }
    });
  }
}

// Main execution
function main() {
  console.log('========================================');
  console.log('Console.log Removal Script');
  console.log('========================================');
  console.log(`Mode: ${config.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (files will be modified)'}`);
  console.log(`Source directory: ${config.srcDir}`);
  console.log(`Backup directory: ${config.backupDir}`);
  console.log('');

  // Find all files to process
  const files = [];
  config.patterns.forEach(pattern => {
    const matches = glob.sync(path.join(config.srcDir, pattern), {
      ignore: config.excludePatterns.map(p => path.join(config.srcDir, p))
    });
    files.push(...matches);
  });

  stats.totalFiles = files.length;
  console.log(`Found ${stats.totalFiles} files to scan`);
  console.log('');

  // Process each file
  files.forEach(processFile);

  // Print summary
  console.log('');
  console.log('========================================');
  console.log('Summary');
  console.log('========================================');
  console.log(`Total files scanned: ${stats.totalFiles}`);
  console.log(`Files with console.logs: ${stats.filesWithLogs}`);
  console.log(`Total console.logs removed: ${stats.totalLogsRemoved}`);
  console.log(`  - Sensitive logs: ${stats.sensitiveLogsRemoved} ⚠️`);
  console.log(`  - Debug logs: ${stats.debugLogsRemoved} 🐛`);
  console.log(`  - Other logs: ${stats.totalLogsRemoved - stats.sensitiveLogsRemoved - stats.debugLogsRemoved}`);
  
  if (stats.fileChanges.length > 0) {
    console.log('');
    console.log('Files modified:');
    stats.fileChanges.forEach(change => {
      console.log(`  - ${change.file}: ${change.logsRemoved} logs (${change.sensitiveRemoved} sensitive, ${change.debugRemoved} debug)`);
    });
  }

  if (config.dryRun) {
    console.log('');
    console.log('⚠️  This was a DRY RUN. No files were modified.');
    console.log('To apply changes, set dryRun: false in the script configuration.');
  } else {
    console.log('');
    console.log(`✅ Backup created at: ${config.backupDir}`);
    console.log('✅ All console.logs have been removed successfully!');
  }

  // Generate detailed report
  const report = {
    timestamp: new Date().toISOString(),
    mode: config.dryRun ? 'dry-run' : 'live',
    statistics: stats,
    fileChanges: stats.fileChanges
  };

  const reportPath = path.join(__dirname, '..', `console-log-removal-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📊 Detailed report saved to: ${reportPath}`);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { removeConsoleLogs, config };