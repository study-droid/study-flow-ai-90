/**
 * Page Object Models
 * Structured page representations for better test maintainability
 */

import { Page, Locator } from '@playwright/test';

/**
 * Base Page Object
 */
export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  abstract goto(): Promise<void>;
  abstract isLoaded(): Promise<boolean>;

  async waitForLoad() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  async getURL(): Promise<string> {
    return this.page.url();
  }
}

/**
 * Authentication Page
 */
export class AuthPage extends BasePage {
  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly signUpButton: Locator;
  readonly googleSignInButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorMessage: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('[data-testid="email-input"]');
    this.passwordInput = page.locator('[data-testid="password-input"]');
    this.signInButton = page.locator('[data-testid="sign-in-button"]');
    this.signUpButton = page.locator('[data-testid="sign-up-button"]');
    this.googleSignInButton = page.locator('[data-testid="google-signin-button"]');
    this.forgotPasswordLink = page.locator('[data-testid="forgot-password-link"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
  }

  async goto() {
    await this.page.goto('/auth');
    await this.waitForLoad();
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.emailInput.waitFor({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async signUp(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signUpButton.click();
  }

  async signInWithGoogle() {
    await this.googleSignInButton.click();
  }

  async forgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  async getErrorText(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible();
  }
}

/**
 * Dashboard Page
 */
export class DashboardPage extends BasePage {
  // Locators
  readonly welcomeMessage: Locator;
  readonly quickActions: Locator;
  readonly recentTasks: Locator;
  readonly studyProgress: Locator;
  readonly upcomingDeadlines: Locator;
  readonly aiRecommendations: Locator;
  readonly statsCards: Locator;

  constructor(page: Page) {
    super(page);
    this.welcomeMessage = page.locator('[data-testid="welcome-message"]');
    this.quickActions = page.locator('[data-testid="quick-actions"]');
    this.recentTasks = page.locator('[data-testid="recent-tasks"]');
    this.studyProgress = page.locator('[data-testid="study-progress"]');
    this.upcomingDeadlines = page.locator('[data-testid="upcoming-deadlines"]');
    this.aiRecommendations = page.locator('[data-testid="ai-recommendations"]');
    this.statsCards = page.locator('[data-testid="stats-card"]');
  }

  async goto() {
    await this.page.goto('/dashboard');
    await this.waitForLoad();
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.welcomeMessage.waitFor({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async getWelcomeText(): Promise<string> {
    return await this.welcomeMessage.textContent() || '';
  }

  async clickQuickAction(action: string) {
    await this.page.click(`[data-testid="quick-action-${action}"]`);
  }

  async getTaskCount(): Promise<number> {
    return await this.recentTasks.locator('[data-testid="task-item"]').count();
  }

  async clickCreateTask() {
    await this.page.click('[data-testid="create-task-button"]');
  }

  async clickViewAllTasks() {
    await this.page.click('[data-testid="view-all-tasks"]');
  }
}

/**
 * Tasks Page
 */
export class TasksPage extends BasePage {
  // Locators
  readonly createTaskButton: Locator;
  readonly taskList: Locator;
  readonly filterSelect: Locator;
  readonly sortSelect: Locator;
  readonly searchInput: Locator;
  readonly taskModal: Locator;

  constructor(page: Page) {
    super(page);
    this.createTaskButton = page.locator('[data-testid="create-task-button"]');
    this.taskList = page.locator('[data-testid="task-list"]');
    this.filterSelect = page.locator('[data-testid="task-filter"]');
    this.sortSelect = page.locator('[data-testid="task-sort"]');
    this.searchInput = page.locator('[data-testid="task-search"]');
    this.taskModal = page.locator('[data-testid="task-modal"]');
  }

  async goto() {
    await this.page.goto('/tasks');
    await this.waitForLoad();
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.createTaskButton.waitFor({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async createTask() {
    await this.createTaskButton.click();
    await this.taskModal.waitFor();
  }

  async getTaskCount(): Promise<number> {
    return await this.taskList.locator('[data-testid="task-item"]').count();
  }

  async searchTasks(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
  }

  async filterTasks(filter: string) {
    await this.filterSelect.selectOption(filter);
  }

  async sortTasks(sort: string) {
    await this.sortSelect.selectOption(sort);
  }

  async clickTask(index: number) {
    await this.taskList.locator('[data-testid="task-item"]').nth(index).click();
  }

  async toggleTaskComplete(index: number) {
    await this.taskList.locator('[data-testid="task-checkbox"]').nth(index).click();
  }
}

/**
 * AI Tutor Page
 */
export class AITutorPage extends BasePage {
  // Locators
  readonly chatContainer: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly clearButton: Locator;
  readonly historyButton: Locator;
  readonly messages: Locator;
  readonly typingIndicator: Locator;
  readonly suggestions: Locator;

  constructor(page: Page) {
    super(page);
    this.chatContainer = page.locator('[data-testid="chat-container"]');
    this.messageInput = page.locator('[data-testid="ai-chat-input"]');
    this.sendButton = page.locator('[data-testid="send-message-button"]');
    this.clearButton = page.locator('[data-testid="clear-chat-button"]');
    this.historyButton = page.locator('[data-testid="chat-history-button"]');
    this.messages = page.locator('[data-testid="chat-message"]');
    this.typingIndicator = page.locator('[data-testid="typing-indicator"]');
    this.suggestions = page.locator('[data-testid="suggestion-chip"]');
  }

  async goto() {
    await this.page.goto('/ai-tutor');
    await this.waitForLoad();
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.messageInput.waitFor({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async sendMessage(message: string) {
    await this.messageInput.fill(message);
    await this.sendButton.click();
  }

  async waitForResponse(timeout: number = 30000) {
    await this.typingIndicator.waitFor({ timeout: 2000 }).catch(() => {}); // Wait for typing
    await this.typingIndicator.waitFor({ state: 'detached', timeout }); // Wait for completion
  }

  async getMessageCount(): Promise<number> {
    return await this.messages.count();
  }

  async getLastMessage(): Promise<string> {
    const count = await this.messages.count();
    if (count > 0) {
      return await this.messages.nth(count - 1).textContent() || '';
    }
    return '';
  }

  async clickSuggestion(index: number) {
    await this.suggestions.nth(index).click();
  }

  async clearChat() {
    await this.clearButton.click();
  }

  async openHistory() {
    await this.historyButton.click();
  }
}

/**
 * Table Builder Page
 */
export class TableBuilderPage extends BasePage {
  // Locators
  readonly promptInput: Locator;
  readonly generateButton: Locator;
  readonly table: Locator;
  readonly editButton: Locator;
  readonly exportButton: Locator;
  readonly saveButton: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    super(page);
    this.promptInput = page.locator('[data-testid="table-prompt-input"]');
    this.generateButton = page.locator('[data-testid="generate-table-button"]');
    this.table = page.locator('[data-testid="generated-table"]');
    this.editButton = page.locator('[data-testid="edit-table-button"]');
    this.exportButton = page.locator('[data-testid="export-table-button"]');
    this.saveButton = page.locator('[data-testid="save-table-button"]');
    this.loadingIndicator = page.locator('[data-testid="table-loading"]');
  }

  async goto() {
    await this.page.goto('/tables');
    await this.waitForLoad();
  }

  async isLoaded(): Promise<boolean> {
    try {
      await this.promptInput.waitFor({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async generateTable(prompt: string) {
    await this.promptInput.fill(prompt);
    await this.generateButton.click();
    await this.loadingIndicator.waitFor();
    await this.loadingIndicator.waitFor({ state: 'detached', timeout: 30000 });
  }

  async isTableGenerated(): Promise<boolean> {
    return await this.table.isVisible();
  }

  async getRowCount(): Promise<number> {
    return await this.table.locator('tr').count();
  }

  async getColumnCount(): Promise<number> {
    const firstRow = this.table.locator('tr').first();
    return await firstRow.locator('td, th').count();
  }

  async getCellText(row: number, col: number): Promise<string> {
    return await this.table
      .locator('tr')
      .nth(row)
      .locator('td, th')
      .nth(col)
      .textContent() || '';
  }

  async editTable() {
    await this.editButton.click();
  }

  async exportTable() {
    await this.exportButton.click();
  }

  async saveTable() {
    await this.saveButton.click();
  }
}

/**
 * Layout Components
 */
export class Header {
  readonly page: Page;
  readonly logo: Locator;
  readonly navigation: Locator;
  readonly userMenu: Locator;
  readonly signOutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.logo = page.locator('[data-testid="header-logo"]');
    this.navigation = page.locator('[data-testid="main-navigation"]');
    this.userMenu = page.locator('[data-testid="user-menu-trigger"]');
    this.signOutButton = page.locator('[data-testid="sign-out-button"]');
  }

  async clickLogo() {
    await this.logo.click();
  }

  async openUserMenu() {
    await this.userMenu.click();
  }

  async signOut() {
    await this.openUserMenu();
    await this.signOutButton.click();
  }

  async navigateTo(page: string) {
    await this.page.click(`[data-testid="nav-${page}"]`);
  }
}

export class Sidebar {
  readonly page: Page;
  readonly container: Locator;
  readonly menuItems: Locator;
  readonly collapseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.container = page.locator('[data-testid="sidebar"]');
    this.menuItems = page.locator('[data-testid^="sidebar-"]');
    this.collapseButton = page.locator('[data-testid="sidebar-collapse"]');
  }

  async navigateTo(section: string) {
    await this.page.click(`[data-testid="sidebar-${section}"]`);
  }

  async collapse() {
    await this.collapseButton.click();
  }

  async isCollapsed(): Promise<boolean> {
    return await this.container.getAttribute('data-collapsed') === 'true';
  }
}

/**
 * Page Object Factory
 */
export class PageObjectFactory {
  constructor(private page: Page) {}

  auth() {
    return new AuthPage(this.page);
  }

  dashboard() {
    return new DashboardPage(this.page);
  }

  tasks() {
    return new TasksPage(this.page);
  }

  aiTutor() {
    return new AITutorPage(this.page);
  }

  tableBuilder() {
    return new TableBuilderPage(this.page);
  }

  header() {
    return new Header(this.page);
  }

  sidebar() {
    return new Sidebar(this.page);
  }
}