import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Files to process (from grep results)
const filesToProcess = [
  'src/components/layout/ProtectedRoute.tsx',
  'src/hooks/useAchievements.ts',
  'src/hooks/useCalendarSync.ts',
  'src/hooks/useProfile.ts',
  'src/hooks/useSettings.ts',
  'src/services/ai-debug.ts',
  'src/services/ambientAudioService.ts',
  'src/services/audio/audioService.ts',
  'src/services/audio/timer-sounds.ts',
  'src/services/search/searchService.ts',
  'src/services/security/api-vault.ts',
  'src/components/study/AmbientSoundPlayer.tsx'
];

// Files to skip (logger utilities)
const skipFiles = [
  'src/lib/logger.ts',
  'src/lib/secure-logger.ts',
  'src/main.tsx' // Keep main.tsx logs for debugging
];

let totalRemoved = 0;
let filesModified = 0;

filesToProcess.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Remove console.log statements (including multiline)
  const newContent = content
    // Remove simple console.log
    .replace(/console\.log\([^)]*\);?\n?/g, '')
    // Remove multiline console.log
    .replace(/console\.log\([^)]*\n[^)]*\);?\n?/gm, '')
    // Remove DEBUG console.log specifically
    .replace(/console\.log\(['"]DEBUG[^)]*\);?\n?/g, '')
    // Clean up extra blank lines
    .replace(/\n\s*\n\s*\n/g, '\n\n');
  
  if (content !== newContent) {
    // Count removed logs
    const originalLogs = (content.match(/console\.log/g) || []).length;
    const newLogs = (newContent.match(/console\.log/g) || []).length;
    const removed = originalLogs - newLogs;
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ ${file}: Removed ${removed} console.log statements`);
    totalRemoved += removed;
    filesModified++;
  }
});

console.log(`\n✅ Summary: Removed ${totalRemoved} console.log statements from ${filesModified} files`);