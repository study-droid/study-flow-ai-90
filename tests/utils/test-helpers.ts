/**
 * Test Helper Utilities
 * Common utilities and helpers for E2E tests
 */

import { Page, Locator, expect } from '@playwright/test';
import { getTestUserCredentials } from '../config/user-setup';

/**
 * Common test data and constants
 */
export const TEST_DATA = {
  subjects: {
    mathematics: {
      name: 'Mathematics',
      code: 'MATH101',
      color: '#3B82F6',
      icon: '📐',
    },
    computerScience: {
      name: 'Computer Science',
      code: 'CS101',
      color: '#10B981',
      icon: '💻',
    },
  },
  tasks: {
    sample: {
      title: 'Complete Chapter 1 Reading',
      description: 'Read and summarize Chapter 1 of the textbook',
      priority: 'medium' as const,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    urgent: {
      title: 'Programming Assignment',
      description: 'Complete the sorting algorithms assignment',
      priority: 'high' as const,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  },
  goals: {
    academic: {
      title: 'Improve Math Grade',
      description: 'Get at least 85% in all math assignments',
      targetValue: 85,
      currentValue: 75,
      unit: 'percentage',
      category: 'academic' as const,
    },
    habit: {
      title: 'Study Consistency',
      description: 'Study for at least 2 hours every day',
      targetValue: 14,
      currentValue: 8,
      unit: 'hours',
      category: 'habit' as const,
    },
  },
};

/**
 * Navigation helpers
 */
export class NavigationHelper {
  constructor(private page: Page) {}

  async goToAuth() {
    await this.page.goto('/auth');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async goToDashboard() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async goToTasks() {
    await this.page.goto('/tasks');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async goToStudy() {
    await this.page.goto('/study');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async goToAITutor() {
    await this.page.goto('/ai-tutor');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async goToTables() {
    await this.page.goto('/tables');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async goToCalendar() {
    await this.page.goto('/calendar');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async goToAnalytics() {
    await this.page.goto('/analytics');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async navigateWithSidebar(section: string) {
    await this.page.click(`[data-testid="sidebar-${section}"]`);
    await this.page.waitForLoadState('domcontentloaded');
  }
}

/**
 * Authentication helpers
 */
export class AuthHelper {
  constructor(private page: Page) {}

  async signIn(userType: 'regular' | 'admin' | 'new_user' = 'regular') {
    const credentials = getTestUserCredentials(userType);
    
    await this.page.goto('/auth');
    await this.page.waitForSelector('[data-testid="auth-form"]');

    await this.page.fill('[data-testid="email-input"]', credentials.email);
    await this.page.fill('[data-testid="password-input"]', credentials.password);
    
    await this.page.click('[data-testid="sign-in-button"]');
    
    // Wait for successful login
    await this.page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() =>
      this.page.waitForURL('**/onboarding', { timeout: 15000 })
    );
  }

  async signOut() {
    // Try header sign out first
    try {
      await this.page.click('[data-testid="user-menu-trigger"]', { timeout: 5000 });
      await this.page.click('[data-testid="sign-out-button"]', { timeout: 5000 });
    } catch {
      // Fallback to direct navigation
      await this.page.goto('/auth');
    }
    
    await this.page.waitForURL('**/auth', { timeout: 10000 });
  }

  async isSignedIn(): Promise<boolean> {
    try {
      await this.page.waitForSelector('[data-testid="user-menu-trigger"]', { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  async completeOnboarding() {
    // Check if we're on onboarding page
    if (this.page.url().includes('/onboarding')) {
      await this.page.click('[data-testid="complete-onboarding"]');
      await this.page.waitForURL('**/dashboard', { timeout: 10000 });
    }
  }
}

/**
 * Form helpers
 */
export class FormHelper {
  constructor(private page: Page) {}

  async fillTaskForm(task: typeof TEST_DATA.tasks.sample) {
    await this.page.fill('[data-testid="task-title-input"]', task.title);
    await this.page.fill('[data-testid="task-description-input"]', task.description);
    await this.page.selectOption('[data-testid="task-priority-select"]', task.priority);
    
    // Format date for input
    const dateString = task.dueDate.toISOString().split('T')[0];
    await this.page.fill('[data-testid="task-due-date-input"]', dateString);
  }

  async fillSubjectForm(subject: typeof TEST_DATA.subjects.mathematics) {
    await this.page.fill('[data-testid="subject-name-input"]', subject.name);
    await this.page.fill('[data-testid="subject-code-input"]', subject.code);
    await this.page.fill('[data-testid="subject-color-input"]', subject.color);
    await this.page.fill('[data-testid="subject-icon-input"]', subject.icon);
  }

  async fillGoalForm(goal: typeof TEST_DATA.goals.academic) {
    await this.page.fill('[data-testid="goal-title-input"]', goal.title);
    await this.page.fill('[data-testid="goal-description-input"]', goal.description);
    await this.page.fill('[data-testid="goal-target-value-input"]', goal.targetValue.toString());
    await this.page.fill('[data-testid="goal-current-value-input"]', goal.currentValue.toString());
    await this.page.fill('[data-testid="goal-unit-input"]', goal.unit);
    await this.page.selectOption('[data-testid="goal-category-select"]', goal.category);
  }

  async submitForm() {
    await this.page.click('[data-testid="submit-button"]');
  }

  async cancelForm() {
    await this.page.click('[data-testid="cancel-button"]');
  }
}

/**
 * AI Tutor helpers
 */
export class AITutorHelper {
  constructor(private page: Page) {}

  async sendMessage(message: string) {
    await this.page.fill('[data-testid="ai-chat-input"]', message);
    await this.page.click('[data-testid="send-message-button"]');
  }

  async waitForResponse(timeout: number = 30000) {
    await this.page.waitForSelector('[data-testid="ai-message"]', { timeout });
  }

  async getLastMessage(): Promise<string> {
    const messages = this.page.locator('[data-testid="ai-message"]');
    const count = await messages.count();
    if (count > 0) {
      return await messages.nth(count - 1).textContent() || '';
    }
    return '';
  }

  async clearChat() {
    try {
      await this.page.click('[data-testid="clear-chat-button"]');
    } catch {
      // Button might not exist or be visible
    }
  }

  async openHistory() {
    await this.page.click('[data-testid="chat-history-button"]');
    await this.page.waitForSelector('[data-testid="chat-history-modal"]');
  }

  async selectHistorySession(index: number) {
    await this.page.click(`[data-testid="history-session-${index}"]`);
  }
}

/**
 * Table Builder helpers
 */
export class TableHelper {
  constructor(private page: Page) {}

  async createTable(prompt: string) {
    await this.page.fill('[data-testid="table-prompt-input"]', prompt);
    await this.page.click('[data-testid="generate-table-button"]');
    await this.page.waitForSelector('[data-testid="generated-table"]', { timeout: 30000 });
  }

  async editCell(row: number, col: number, value: string) {
    await this.page.click(`[data-testid="table-cell-${row}-${col}"]`);
    await this.page.fill(`[data-testid="cell-editor"]`, value);
    await this.page.press(`[data-testid="cell-editor"]`, 'Enter');
  }

  async addRow() {
    await this.page.click('[data-testid="add-row-button"]');
  }

  async addColumn() {
    await this.page.click('[data-testid="add-column-button"]');
  }

  async exportTable(format: 'csv' | 'json' | 'excel') {
    await this.page.click('[data-testid="export-dropdown"]');
    await this.page.click(`[data-testid="export-${format}"]`);
  }
}

/**
 * Assertion helpers
 */
export class AssertionHelper {
  constructor(private page: Page) {}

  async expectPageTitle(title: string) {
    await expect(this.page).toHaveTitle(title);
  }

  async expectURL(pattern: string | RegExp) {
    await expect(this.page).toHaveURL(pattern);
  }

  async expectElementVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async expectElementHidden(selector: string) {
    await expect(this.page.locator(selector)).toBeHidden();
  }

  async expectText(selector: string, text: string | RegExp) {
    await expect(this.page.locator(selector)).toContainText(text);
  }

  async expectValue(selector: string, value: string) {
    await expect(this.page.locator(selector)).toHaveValue(value);
  }

  async expectCount(selector: string, count: number) {
    await expect(this.page.locator(selector)).toHaveCount(count);
  }

  async expectToast(message: string) {
    await expect(this.page.locator('[data-testid="toast"]')).toContainText(message);
  }

  async expectNoErrors() {
    // Check for error messages
    await expect(this.page.locator('[data-testid="error-message"]')).toHaveCount(0);
    
    // Check console for errors
    const errors: string[] = [];
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    expect(errors).toHaveLength(0);
  }
}

/**
 * Wait helpers
 */
export class WaitHelper {
  constructor(private page: Page) {}

  async waitForNavigation() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForAPI(urlPattern: string | RegExp, timeout: number = 10000) {
    await this.page.waitForResponse(urlPattern, { timeout });
  }

  async waitForElement(selector: string, timeout: number = 10000) {
    await this.page.waitForSelector(selector, { timeout });
  }

  async waitForElementToDisappear(selector: string, timeout: number = 10000) {
    await this.page.waitForSelector(selector, { state: 'detached', timeout });
  }

  async waitForText(selector: string, text: string, timeout: number = 10000) {
    await this.page.waitForFunction(
      (args) => {
        const element = document.querySelector(args.selector);
        return element?.textContent?.includes(args.text) ?? false;
      },
      { selector, text },
      { timeout }
    );
  }

  async waitAndClick(selector: string, timeout: number = 10000) {
    await this.page.waitForSelector(selector, { timeout });
    await this.page.click(selector);
  }
}

/**
 * Screenshot and debugging helpers
 */
export class DebugHelper {
  constructor(private page: Page) {}

  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  async logPageInfo() {
    console.log('Current URL:', this.page.url());
    console.log('Page Title:', await this.page.title());
  }

  async logConsoleErrors() {
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('Console Error:', msg.text());
      }
    });
  }

  async dumpHTML(filename?: string) {
    const html = await this.page.content();
    const fs = await import('fs/promises');
    const path = filename || `page-dump-${Date.now()}.html`;
    await fs.writeFile(`test-results/html-dumps/${path}`, html);
  }
}

/**
 * Performance helpers
 */
export class PerformanceHelper {
  constructor(private page: Page) {}

  async measurePageLoad(): Promise<number> {
    const startTime = Date.now();
    await this.page.waitForLoadState('domcontentloaded');
    const endTime = Date.now();
    return endTime - startTime;
  }

  async measureAPICall(urlPattern: string | RegExp): Promise<number> {
    const startTime = Date.now();
    await this.page.waitForResponse(urlPattern);
    const endTime = Date.now();
    return endTime - startTime;
  }

  async getMemoryUsage(): Promise<any> {
    return await this.page.evaluate(() => {
      return (performance as any).memory;
    });
  }
}

/**
 * Main test context that combines all helpers
 */
export class TestContext {
  public navigation: NavigationHelper;
  public auth: AuthHelper;
  public form: FormHelper;
  public aiTutor: AITutorHelper;
  public table: TableHelper;
  public assertions: AssertionHelper;
  public wait: WaitHelper;
  public debug: DebugHelper;
  public performance: PerformanceHelper;

  constructor(public page: Page) {
    this.navigation = new NavigationHelper(page);
    this.auth = new AuthHelper(page);
    this.form = new FormHelper(page);
    this.aiTutor = new AITutorHelper(page);
    this.table = new TableHelper(page);
    this.assertions = new AssertionHelper(page);
    this.wait = new WaitHelper(page);
    this.debug = new DebugHelper(page);
    this.performance = new PerformanceHelper(page);
  }
}