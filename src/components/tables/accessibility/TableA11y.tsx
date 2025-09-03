/**
 * Table Accessibility Component
 * Comprehensive accessibility features for professional tables
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX,
  Keyboard,
  MousePointer,
  Contrast,
  Type,
  Focus,
  Navigation,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

import { 
  ariaLabels,
  announceToScreenReader,
  focusManagement,
  getProgressLabel,
  getKeyboardShortcutLabel
} from '@/lib/accessibility';
import type { 
  TableConfig,
  TableColumn,
  TableRow,
  TableAccessibility
} from '@/types/table-types';

export interface TableA11yProps {
  config: TableConfig;
  onConfigChange?: (accessibility: TableAccessibility) => void;
  className?: string;
}

interface AccessibilityState {
  // Visual accessibility
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  
  // Audio accessibility
  screenReaderEnabled: boolean;
  soundFeedback: boolean;
  
  // Keyboard navigation
  keyboardNavigation: boolean;
  focusVisible: boolean;
  
  // User preferences
  announcements: boolean;
  shortcuts: boolean;
  
  // Current state
  currentCell: { row: number; column: number } | null;
  skipLinksEnabled: boolean;
}

interface AccessibilityFeature {
  id: string;
  name: string;
  description: string;
  category: 'visual' | 'audio' | 'motor' | 'cognitive';
  enabled: boolean;
  level: 'AA' | 'AAA';
  impact: 'low' | 'medium' | 'high';
}

export const TableA11y: React.FC<TableA11yProps> = ({
  config,
  onConfigChange,
  className
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [a11yState, setA11yState] = useState<AccessibilityState>({
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    screenReaderEnabled: true,
    soundFeedback: false,
    keyboardNavigation: config.accessibility?.enableKeyboardNavigation ?? true,
    focusVisible: true,
    announcements: config.accessibility?.announceUpdates ?? true,
    shortcuts: true,
    currentCell: null,
    skipLinksEnabled: true
  });

  const [accessibilityScore, setAccessibilityScore] = useState(0);
  const [violations, setViolations] = useState<string[]>([]);

  // Update accessibility state
  const updateA11yState = useCallback((updates: Partial<AccessibilityState>) => {
    setA11yState(prev => ({ ...prev, ...updates }));
  }, []);

  // Accessibility features configuration
  const accessibilityFeatures: AccessibilityFeature[] = [
    {
      id: 'keyboard-navigation',
      name: 'Keyboard Navigation',
      description: 'Navigate table using arrow keys, Tab, and Enter',
      category: 'motor',
      enabled: a11yState.keyboardNavigation,
      level: 'AA',
      impact: 'high'
    },
    {
      id: 'screen-reader',
      name: 'Screen Reader Support',
      description: 'Proper ARIA labels and announcements',
      category: 'visual',
      enabled: a11yState.screenReaderEnabled,
      level: 'AA',
      impact: 'high'
    },
    {
      id: 'high-contrast',
      name: 'High Contrast Mode',
      description: 'Enhanced color contrast for better visibility',
      category: 'visual',
      enabled: a11yState.highContrast,
      level: 'AAA',
      impact: 'medium'
    },
    {
      id: 'large-text',
      name: 'Large Text Support',
      description: 'Scalable text up to 200% without horizontal scrolling',
      category: 'visual',
      enabled: a11yState.largeText,
      level: 'AA',
      impact: 'medium'
    },
    {
      id: 'reduced-motion',
      name: 'Reduced Motion',
      description: 'Respect user preference for reduced motion',
      category: 'cognitive',
      enabled: a11yState.reducedMotion,
      level: 'AA',
      impact: 'low'
    },
    {
      id: 'focus-visible',
      name: 'Focus Indicators',
      description: 'Clear visual focus indicators',
      category: 'visual',
      enabled: a11yState.focusVisible,
      level: 'AA',
      impact: 'high'
    }
  ];

  // Keyboard event handler
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!a11yState.keyboardNavigation) return;

    const { key, ctrlKey, metaKey, altKey, shiftKey } = event;
    const { currentCell } = a11yState;

    switch (key) {
      case 'ArrowUp':
        event.preventDefault();
        if (currentCell && currentCell.row > 0) {
          const newCell = { ...currentCell, row: currentCell.row - 1 };
          updateA11yState({ currentCell: newCell });
          announceCell(newCell);
        }
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (currentCell && currentCell.row < config.data.length - 1) {
          const newCell = { ...currentCell, row: currentCell.row + 1 };
          updateA11yState({ currentCell: newCell });
          announceCell(newCell);
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (currentCell && currentCell.column > 0) {
          const newCell = { ...currentCell, column: currentCell.column - 1 };
          updateA11yState({ currentCell: newCell });
          announceCell(newCell);
        }
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (currentCell && currentCell.column < config.columns.length - 1) {
          const newCell = { ...currentCell, column: currentCell.column + 1 };
          updateA11yState({ currentCell: newCell });
          announceCell(newCell);
        }
        break;

      case 'Home':
        event.preventDefault();
        if (currentCell) {
          const newCell = { ...currentCell, column: 0 };
          updateA11yState({ currentCell: newCell });
          announceScreenReader('Moved to first column');
        }
        break;

      case 'End':
        event.preventDefault();
        if (currentCell) {
          const newCell = { ...currentCell, column: config.columns.length - 1 };
          updateA11yState({ currentCell: newCell });
          announceScreenReader('Moved to last column');
        }
        break;

      case 'PageUp':
        event.preventDefault();
        if (currentCell) {
          const newRow = Math.max(0, currentCell.row - 10);
          const newCell = { ...currentCell, row: newRow };
          updateA11yState({ currentCell: newCell });
          announceScreenReader(`Moved up 10 rows to row ${newRow + 1}`);
        }
        break;

      case 'PageDown':
        event.preventDefault();
        if (currentCell) {
          const newRow = Math.min(config.data.length - 1, currentCell.row + 10);
          const newCell = { ...currentCell, row: newRow };
          updateA11yState({ currentCell: newCell });
          announceScreenReader(`Moved down 10 rows to row ${newRow + 1}`);
        }
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (currentCell) {
          const row = config.data[currentCell.row];
          const column = config.columns[currentCell.column];
          announceScreenReader(`Activated cell: ${column.title} - ${row.data[column.key]}`);
        }
        break;

      case 'Escape':
        event.preventDefault();
        updateA11yState({ currentCell: null });
        announceScreenReader('Exited table navigation');
        break;

      case 'F1':
        event.preventDefault();
        showKeyboardHelp();
        break;
    }

    // Shortcut keys with modifiers
    if (ctrlKey || metaKey) {
      switch (key) {
        case 'f':
          event.preventDefault();
          focusSearchInput();
          break;
        case 'Home':
          event.preventDefault();
          updateA11yState({ currentCell: { row: 0, column: 0 } });
          announceScreenReader('Moved to first cell');
          break;
        case 'End':
          event.preventDefault();
          updateA11yState({ 
            currentCell: { 
              row: config.data.length - 1, 
              column: config.columns.length - 1 
            } 
          });
          announceScreenReader('Moved to last cell');
          break;
      }
    }
  }, [a11yState, config]);

  // Announce current cell to screen reader
  const announceCell = useCallback((cell: { row: number; column: number }) => {
    if (!a11yState.announcements) return;

    const row = config.data[cell.row];
    const column = config.columns[cell.column];
    
    if (row && column) {
      const value = row.data[column.key];
      const announcement = `${column.title}: ${value || 'empty'}, Row ${cell.row + 1} of ${config.data.length}, Column ${cell.column + 1} of ${config.columns.length}`;
      announceScreenReader(announcement);
    }
  }, [config, a11yState.announcements]);

  // Screen reader announcement wrapper
  const announceScreenReader = useCallback((message: string) => {
    if (a11yState.screenReaderEnabled) {
      announceToScreenReader(message, 'polite');
    }
  }, [a11yState.screenReaderEnabled]);

  // Focus management
  const focusSearchInput = useCallback(() => {
    const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      announceScreenReader('Search input focused');
    }
  }, []);

  // Show keyboard help
  const showKeyboardHelp = useCallback(() => {
    const shortcuts = [
      'Arrow Keys: Navigate cells',
      'Home/End: Move to first/last column',
      'Ctrl+Home/End: Move to first/last cell',
      'Page Up/Down: Move 10 rows up/down',
      'Enter/Space: Activate cell',
      'Escape: Exit navigation',
      'Ctrl+F: Focus search',
      'F1: Show this help'
    ];
    
    const helpText = `Keyboard shortcuts:\n${shortcuts.join('\n')}`;
    alert(helpText); // Simple implementation - could be replaced with modal
  }, []);

  // Accessibility audit
  const runAccessibilityAudit = useCallback(() => {
    const newViolations: string[] = [];
    let score = 100;

    // Check table structure
    if (!config.accessibility?.tableLabel) {
      newViolations.push('Missing table label (aria-label)');
      score -= 10;
    }

    if (!config.accessibility?.caption) {
      newViolations.push('Missing table caption');
      score -= 5;
    }

    // Check column headers
    const columnsWithoutLabels = config.columns.filter(col => !col.ariaLabel);
    if (columnsWithoutLabels.length > 0) {
      newViolations.push(`${columnsWithoutLabels.length} columns missing ARIA labels`);
      score -= 5 * columnsWithoutLabels.length;
    }

    // Check keyboard navigation
    if (!a11yState.keyboardNavigation) {
      newViolations.push('Keyboard navigation disabled');
      score -= 20;
    }

    // Check color contrast (simplified check)
    if (!a11yState.highContrast && config.styling?.theme === 'dark') {
      newViolations.push('Consider high contrast mode for better accessibility');
      score -= 5;
    }

    // Check focus management
    if (!a11yState.focusVisible) {
      newViolations.push('Focus indicators disabled');
      score -= 15;
    }

    setAccessibilityScore(Math.max(0, score));
    setViolations(newViolations);

    announceScreenReader(`Accessibility audit complete. Score: ${score}%, ${newViolations.length} issues found`);
  }, [config, a11yState]);

  // Generate accessibility report
  const generateA11yReport = useCallback(() => {
    const report = {
      score: accessibilityScore,
      violations,
      features: accessibilityFeatures,
      recommendations: [
        'Ensure all interactive elements are keyboard accessible',
        'Provide clear focus indicators',
        'Use sufficient color contrast ratios',
        'Implement proper ARIA labels and descriptions',
        'Test with actual screen readers',
        'Provide alternative input methods where needed'
      ],
      timestamp: new Date().toISOString()
    };

    const reportText = JSON.stringify(report, null, 2);
    const blob = new Blob([reportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'table-accessibility-report.json';
    a.click();
    URL.revokeObjectURL(url);

    announceScreenReader('Accessibility report downloaded');
  }, [accessibilityScore, violations, accessibilityFeatures]);

  // Effect to update config when accessibility changes
  useEffect(() => {
    if (onConfigChange) {
      const newAccessibility: TableAccessibility = {
        ...config.accessibility,
        enableKeyboardNavigation: a11yState.keyboardNavigation,
        enableRowSelection: config.accessibility?.enableRowSelection ?? false,
        enableCellFocus: true,
        announceUpdates: a11yState.announcements,
        announceSort: a11yState.announcements,
        announceFilter: a11yState.announcements,
        highContrastMode: a11yState.highContrast,
        focusOnLoad: true,
        returnFocusOnClose: true
      };
      onConfigChange(newAccessibility);
    }
  }, [a11yState, config.accessibility, onConfigChange]);

  // Run initial accessibility audit
  useEffect(() => {
    const timer = setTimeout(() => {
      runAccessibilityAudit();
    }, 1000);
    return () => clearTimeout(timer);
  }, [runAccessibilityAudit]);

  // Apply accessibility styles
  const getAccessibilityStyles = useCallback(() => {
    const styles: React.CSSProperties = {};

    if (a11yState.highContrast) {
      styles.filter = 'contrast(150%)';
    }

    if (a11yState.largeText) {
      styles.fontSize = '1.2em';
    }

    if (a11yState.reducedMotion) {
      styles.transition = 'none';
    }

    return styles;
  }, [a11yState]);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Eye className="h-5 w-5" />
          <span>Accessibility Controls</span>
          <Badge 
            variant={accessibilityScore >= 90 ? 'default' : accessibilityScore >= 70 ? 'secondary' : 'destructive'}
            className="ml-auto"
          >
            Score: {accessibilityScore}%
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={runAccessibilityAudit}
            className="flex items-center space-x-1"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Run Audit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateA11yReport}
            className="flex items-center space-x-1"
          >
            <AlertCircle className="h-4 w-4" />
            <span>Export Report</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={showKeyboardHelp}
            className="flex items-center space-x-1"
          >
            <Keyboard className="h-4 w-4" />
            <span>Shortcuts</span>
          </Button>
        </div>

        {/* Accessibility Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Visual Accessibility */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Visual</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="high-contrast" className="text-sm">
                  High Contrast Mode
                </Label>
                <Switch
                  id="high-contrast"
                  checked={a11yState.highContrast}
                  onCheckedChange={(checked) => updateA11yState({ highContrast: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="large-text" className="text-sm">
                  Large Text Support
                </Label>
                <Switch
                  id="large-text"
                  checked={a11yState.largeText}
                  onCheckedChange={(checked) => updateA11yState({ largeText: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="focus-visible" className="text-sm">
                  Focus Indicators
                </Label>
                <Switch
                  id="focus-visible"
                  checked={a11yState.focusVisible}
                  onCheckedChange={(checked) => updateA11yState({ focusVisible: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Motor Accessibility */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Keyboard className="h-4 w-4" />
                <span>Motor</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="keyboard-nav" className="text-sm">
                  Keyboard Navigation
                </Label>
                <Switch
                  id="keyboard-nav"
                  checked={a11yState.keyboardNavigation}
                  onCheckedChange={(checked) => updateA11yState({ keyboardNavigation: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="reduced-motion" className="text-sm">
                  Reduced Motion
                </Label>
                <Switch
                  id="reduced-motion"
                  checked={a11yState.reducedMotion}
                  onCheckedChange={(checked) => updateA11yState({ reducedMotion: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Results */}
        {violations.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2 text-orange-800">
                <AlertCircle className="h-4 w-4" />
                <span>Accessibility Issues ({violations.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-orange-700 space-y-1">
                {violations.map((violation, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>{violation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Accessibility Features List */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Accessibility Features</h3>
          <div className="grid grid-cols-1 gap-2">
            {accessibilityFeatures.map(feature => (
              <div 
                key={feature.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{feature.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {feature.level}
                    </Badge>
                    <Badge 
                      variant={feature.impact === 'high' ? 'default' : 
                              feature.impact === 'medium' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {feature.impact}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{feature.description}</p>
                </div>
                <div className="ml-4">
                  {feature.enabled ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hidden elements for screen readers */}
        <div className="sr-only" aria-live="polite" id="a11y-announcements">
          {/* Dynamic announcements will be inserted here */}
        </div>
      </CardContent>
    </Card>
  );
};

export default TableA11y;