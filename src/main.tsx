import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeSecurity } from './lib/enhanced-security'
import { initializeTheme } from './lib/theme-init'
import { debugAIService } from './services/ai-debug'
import { logger } from '@/services/logging/logger';

// Initialize theme immediately to prevent flash of unstyled content
initializeTheme();

// In development, remove any existing CSP meta tags that might block localhost
if (import.meta.env.DEV) {
  // Remove all CSP meta tags that might be blocking localhost
  const cspMetas = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
  cspMetas.forEach(meta => {
    console.log('Removing existing CSP meta tag:', meta.content);
    meta.remove();
  });
  console.log('Development mode: CSP meta tags removed for localhost access');
  
  // Also check and remove CSP from head periodically (in case it gets re-added)
  const checkAndRemoveCSP = () => {
    const newCspMetas = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
    if (newCspMetas.length > 0) {
      console.log('Found and removing re-added CSP meta tags');
      newCspMetas.forEach(meta => meta.remove());
    }
  };
  
  // Check every second for first 5 seconds
  let checks = 0;
  const interval = setInterval(() => {
    checkAndRemoveCSP();
    checks++;
    if (checks >= 5) clearInterval(interval);
  }, 1000);
}

// Initialize security features before rendering the app
// (This will now skip CSP in dev mode due to our changes)
initializeSecurity();

// Add debug function to window in development
if (import.meta.env.DEV) {
  (window as any).debugAIService = debugAIService;
  logger.debug('🔧 Debug function available: window.debugAIService()', 'Main');
}

createRoot(document.getElementById("root")!).render(<App />);
