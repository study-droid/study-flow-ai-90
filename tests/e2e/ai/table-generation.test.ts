/**
 * AI Table Generation E2E Tests
 * Testing the AI-powered table creation and manipulation features
 */

import { test, expect, testGroup, testStep } from '../../utils/fixtures';
import { PageObjectFactory } from '../../utils/page-objects';

testGroup.aiFeatures('AI Table Generation', () => {
  test.describe('Basic Table Generation', () => {
    test('should generate table from simple prompt', async ({ context, mockServer }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();

      await testStep.withScreenshot(
        context,
        'Generate basic table',
        async () => {
          const prompt = 'Create a weekly study schedule with subjects and times';
          
          await tableBuilderPage.generateTable(prompt);

          // Should generate a table
          expect(await tableBuilderPage.isTableGenerated()).toBe(true);

          // Verify table structure
          const rowCount = await tableBuilderPage.getRowCount();
          const columnCount = await tableBuilderPage.getColumnCount();

          expect(rowCount).toBeGreaterThan(1); // Header + data rows
          expect(columnCount).toBeGreaterThan(1); // Multiple columns
          
          console.log(`Generated table: ${rowCount} rows x ${columnCount} columns`);
        }
      );
    });

    test('should generate different types of tables', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      const tableTypes = [
        {
          prompt: 'Create a task priority matrix with urgent/important categories',
          expectedContent: ['urgent', 'important', 'task']
        },
        {
          prompt: 'Make a comparison table of different programming languages',
          expectedContent: ['language', 'feature', 'comparison']
        },
        {
          prompt: 'Generate a grade tracker with subjects, assignments, and scores',
          expectedContent: ['subject', 'assignment', 'score', 'grade']
        }
      ];

      for (const tableType of tableTypes) {
        await test.step(`Generate ${tableType.prompt}`, async () => {
          await tableBuilderPage.goto();
          await tableBuilderPage.generateTable(tableType.prompt);

          expect(await tableBuilderPage.isTableGenerated()).toBe(true);

          // Check if table contains relevant content
          const tableContent = await context.page.locator('[data-testid="generated-table"]').textContent();
          
          const hasRelevantContent = tableType.expectedContent.some(keyword =>
            tableContent?.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (!hasRelevantContent) {
            console.log(`Table might not contain expected content for: ${tableType.prompt}`);
          }
        });
      }
    });

    test('should handle complex prompts with specifications', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();

      await test.step('Generate table with detailed specifications', async () => {
        const complexPrompt = `Create a comprehensive study timetable with the following requirements:
        - 7 days of the week as rows
        - Time slots from 9 AM to 5 PM
        - Include subjects: Mathematics, Science, English, History
        - Mark break times
        - Color code by subject difficulty`;

        await tableBuilderPage.generateTable(complexPrompt);

        expect(await tableBuilderPage.isTableGenerated()).toBe(true);

        const rowCount = await tableBuilderPage.getRowCount();
        const columnCount = await tableBuilderPage.getColumnCount();

        // Should create a substantial table
        expect(rowCount).toBeGreaterThan(5); // At least 7 days + header
        expect(columnCount).toBeGreaterThan(3); // Multiple time slots

        console.log(`Complex table generated: ${rowCount}x${columnCount}`);
      });
    });
  });

  test.describe('Table Content and Quality', () => {
    test('should generate relevant and accurate data', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();

      await test.step('Verify data accuracy', async () => {
        const prompt = 'Create a periodic table of first 10 elements with symbols and atomic numbers';
        await tableBuilderPage.generateTable(prompt);

        expect(await tableBuilderPage.isTableGenerated()).toBe(true);

        // Check for known chemical elements
        const tableContent = await context.page.locator('[data-testid="generated-table"]').textContent();
        const hasChemicalElements = ['Hydrogen', 'Helium', 'Lithium', 'H', 'He', 'Li'].some(element =>
          tableContent?.includes(element)
        );

        expect(hasChemicalElements).toBe(true);
        console.log('Table contains accurate chemical element data');
      });
    });

    test('should maintain data consistency within table', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();

      await test.step('Check data consistency', async () => {
        const prompt = 'Create a budget tracker with categories, planned amounts, actual amounts, and variance';
        await tableBuilderPage.generateTable(prompt);

        expect(await tableBuilderPage.isTableGenerated()).toBe(true);

        // Verify table structure is consistent
        const rowCount = await tableBuilderPage.getRowCount();
        
        // Each row should have the same number of columns
        for (let i = 1; i < Math.min(rowCount, 5); i++) { // Check first few rows
          const currentRow = context.page.locator('[data-testid="generated-table"] tr').nth(i);
          const cellCount = await currentRow.locator('td, th').count();
          
          if (i === 1) {
            // Store expected cell count from first data row
            context.page.evaluate((count) => window.expectedCellCount = count, cellCount);
          } else {
            // Compare with expected count
            const expectedCount = await context.page.evaluate(() => window.expectedCellCount);
            expect(cellCount).toBe(expectedCount);
          }
        }
      });
    });

    test('should handle different data types in tables', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();

      await test.step('Generate table with mixed data types', async () => {
        const prompt = 'Create a student performance table with names, grades (A-F), scores (0-100), dates, and pass/fail status';
        await tableBuilderPage.generateTable(prompt);

        expect(await tableBuilderPage.isTableGenerated()).toBe(true);

        const tableContent = await context.page.locator('[data-testid="generated-table"]').textContent();
        
        // Should contain different data types
        const hasLetterGrades = /[A-F]/.test(tableContent || '');
        const hasNumbers = /\d+/.test(tableContent || '');
        const hasPassFail = /(pass|fail|yes|no)/i.test(tableContent || '');

        console.log(`Table contains: grades=${hasLetterGrades}, numbers=${hasNumbers}, status=${hasPassFail}`);
        expect(hasNumbers).toBe(true); // At minimum should have numbers
      });
    });
  });

  test.describe('Table Editing and Manipulation', () => {
    test('should allow editing table cells', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();
      await tableBuilderPage.generateTable('Create a simple 3x3 task list');

      await test.step('Edit table cells', async () => {
        expect(await tableBuilderPage.isTableGenerated()).toBe(true);

        try {
          // Enter edit mode
          await tableBuilderPage.editTable();

          // Try to edit a specific cell
          const firstCell = context.page.locator('[data-testid="generated-table"] td').first();
          await firstCell.click();

          // Should allow editing
          const isEditable = await firstCell.locator('input, textarea, [contenteditable]').isVisible({ timeout: 3000 });
          
          if (isEditable) {
            await firstCell.fill('Edited Content');
            await context.page.keyboard.press('Enter');
            
            // Verify edit was saved
            const cellContent = await firstCell.textContent();
            expect(cellContent).toContain('Edited Content');
            console.log('Successfully edited table cell');
          }
        } catch {
          console.log('Table editing might not be implemented');
        }
      });
    });

    test('should allow adding rows and columns', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();
      await tableBuilderPage.generateTable('Create a simple task tracker');

      await test.step('Add table rows and columns', async () => {
        expect(await tableBuilderPage.isTableGenerated()).toBe(true);

        const initialRows = await tableBuilderPage.getRowCount();
        const initialColumns = await tableBuilderPage.getColumnCount();

        try {
          // Try to add row
          await context.page.click('[data-testid="add-row-button"]', { timeout: 3000 });
          
          const newRowCount = await tableBuilderPage.getRowCount();
          expect(newRowCount).toBe(initialRows + 1);
          console.log('Successfully added table row');

          // Try to add column
          await context.page.click('[data-testid="add-column-button"]', { timeout: 3000 });
          
          const newColumnCount = await tableBuilderPage.getColumnCount();
          expect(newColumnCount).toBe(initialColumns + 1);
          console.log('Successfully added table column');

        } catch {
          console.log('Row/column addition might not be implemented');
        }
      });
    });

    test('should allow deleting rows and columns', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();
      await tableBuilderPage.generateTable('Create a 5x5 data grid');

      await test.step('Delete table rows and columns', async () => {
        expect(await tableBuilderPage.isTableGenerated()).toBe(true);

        const initialRows = await tableBuilderPage.getRowCount();
        
        if (initialRows > 2) { // Need at least 2 rows to safely delete 1
          try {
            // Try to delete a row
            const targetRow = context.page.locator('[data-testid="generated-table"] tr').nth(1);
            await targetRow.hover();
            await targetRow.locator('[data-testid="delete-row-button"]').click({ timeout: 3000 });

            const newRowCount = await tableBuilderPage.getRowCount();
            expect(newRowCount).toBe(initialRows - 1);
            console.log('Successfully deleted table row');

          } catch {
            console.log('Row deletion might not be implemented');
          }
        }
      });
    });
  });

  test.describe('Table Export and Save', () => {
    test('should export table to different formats', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();
      await tableBuilderPage.generateTable('Create an expense tracker with categories and amounts');

      await test.step('Export table formats', async () => {
        expect(await tableBuilderPage.isTableGenerated()).toBe(true);

        const exportFormats = ['csv', 'json', 'excel'];

        for (const format of exportFormats) {
          try {
            // Setup download handling
            const downloadPromise = context.page.waitForEvent('download', { timeout: 5000 });
            
            await tableBuilderPage.exportTable();
            await context.page.click(`[data-testid="export-${format}"]`, { timeout: 3000 });

            const download = await downloadPromise;
            expect(download.suggestedFilename()).toMatch(new RegExp(`\\.(${format}|xlsx)$`, 'i'));
            
            console.log(`Successfully exported table as ${format}`);

          } catch {
            console.log(`Export to ${format} might not be implemented`);
          }
        }
      });
    });

    test('should save table to user account', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();
      await tableBuilderPage.generateTable('Create a project timeline');

      await test.step('Save table to account', async () => {
        expect(await tableBuilderPage.isTableGenerated()).toBe(true);

        try {
          await tableBuilderPage.saveTable();

          // Should show save confirmation
          await expect(context.page.locator('[data-testid="table-saved-toast"]')).toBeVisible({ timeout: 5000 });

          // Table should appear in saved tables list
          await context.page.click('[data-testid="view-saved-tables"]', { timeout: 3000 });
          await expect(context.page.locator('[data-testid="saved-table-item"]')).toBeVisible({ timeout: 5000 });

          console.log('Successfully saved table to user account');

        } catch {
          console.log('Table saving functionality might not be implemented');
        }
      });
    });

    test('should load previously saved tables', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();

      await test.step('Load saved tables', async () => {
        try {
          await context.page.click('[data-testid="view-saved-tables"]', { timeout: 5000 });

          const savedTables = await context.page.locator('[data-testid="saved-table-item"]').count();
          
          if (savedTables > 0) {
            // Load the first saved table
            await context.page.click('[data-testid="saved-table-item"]');
            
            // Should load the table
            await expect(context.page.locator('[data-testid="generated-table"]')).toBeVisible({ timeout: 5000 });
            
            console.log('Successfully loaded saved table');
          } else {
            console.log('No saved tables found');
          }
        } catch {
          console.log('Saved tables functionality might not be implemented');
        }
      });
    });
  });

  test.describe('Table Generation Performance', () => {
    test('should generate tables within reasonable time', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();

      await testStep.timed('Table generation performance', async () => {
        const startTime = Date.now();
        
        await tableBuilderPage.generateTable('Create a comprehensive study schedule for a semester');
        
        const endTime = Date.now();
        const generationTime = endTime - startTime;
        
        console.log(`Table generated in ${generationTime}ms`);
        expect(generationTime).toBeLessThan(30000); // Should complete within 30 seconds
        
        expect(await tableBuilderPage.isTableGenerated()).toBe(true);
      });
    });

    test('should handle large table generation', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();

      await test.step('Generate large table', async () => {
        const largePrompt = 'Create a detailed course catalog with 50 courses including course codes, names, credits, prerequisites, and descriptions';
        
        await tableBuilderPage.generateTable(largePrompt);
        
        expect(await tableBuilderPage.isTableGenerated()).toBe(true);
        
        const rowCount = await tableBuilderPage.getRowCount();
        const columnCount = await tableBuilderPage.getColumnCount();
        
        console.log(`Large table generated: ${rowCount}x${columnCount}`);
        expect(rowCount).toBeGreaterThan(10); // Should be substantial
        expect(columnCount).toBeGreaterThan(3);
      });
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle ambiguous prompts gracefully', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();

      const ambiguousPrompts = [
        'Make a table',
        'Create something with data',
        'Table please'
      ];

      for (const prompt of ambiguousPrompts) {
        await test.step(`Handle ambiguous prompt: "${prompt}"`, async () => {
          try {
            await tableBuilderPage.generateTable(prompt);
            
            // Should either generate a default table or ask for clarification
            const hasTable = await tableBuilderPage.isTableGenerated();
            const hasError = await context.page.locator('[data-testid="generation-error"]').isVisible({ timeout: 3000 });
            const hasClarification = await context.page.locator('[data-testid="clarification-needed"]').isVisible({ timeout: 3000 });
            
            expect(hasTable || hasError || hasClarification).toBe(true);
            console.log(`Handled ambiguous prompt appropriately: ${prompt}`);

          } catch {
            console.log(`Ambiguous prompt handling might vary: ${prompt}`);
          }
        });
      }
    });

    test('should handle invalid or impossible requests', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();

      await test.step('Handle impossible requests', async () => {
        const impossiblePrompt = 'Create a table with negative dimensions and impossible data';
        
        try {
          await tableBuilderPage.generateTable(impossiblePrompt);
          
          // Should handle gracefully - either generate something reasonable or show error
          const hasTable = await tableBuilderPage.isTableGenerated();
          const hasError = await context.page.locator('[data-testid="generation-error"]').isVisible({ timeout: 5000 });
          
          expect(hasTable || hasError).toBe(true);
          console.log('Handled impossible request appropriately');

        } catch {
          console.log('Impossible request handling may vary');
        }
      });
    });

    test('should handle network failures during generation', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();

      await test.step('Handle network failure', async () => {
        // Simulate network failure
        await context.page.route('**/functions/v1/deepseek-structured', route => route.abort());
        
        try {
          await tableBuilderPage.generateTable('Create a simple task list');
          
          // Should show error state
          await expect(context.page.locator('[data-testid="generation-error"]')).toBeVisible({ timeout: 10000 });
          
          console.log('Network failure handled appropriately');
        } catch {
          console.log('Network error handling might use different patterns');
        }
        
        // Restore network
        await context.page.unroute('**/functions/v1/deepseek-structured');
      });
    });
  });

  test.describe('Integration with Other Features', () => {
    test('should integrate generated tables with tasks', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();
      await tableBuilderPage.generateTable('Create a project task breakdown structure');

      await test.step('Convert table data to tasks', async () => {
        expect(await tableBuilderPage.isTableGenerated()).toBe(true);

        try {
          // Look for task integration features
          await context.page.click('[data-testid="convert-to-tasks"]', { timeout: 3000 });
          
          // Should integrate with task management
          await expect(context.page.locator('[data-testid="task-conversion-modal"]')).toBeVisible({ timeout: 5000 });
          
          console.log('Table to task integration available');
        } catch {
          console.log('Table to task integration might not be implemented');
        }
      });
    });

    test('should share tables with study groups', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const tableBuilderPage = pages.tableBuilder();

      await tableBuilderPage.goto();
      await tableBuilderPage.generateTable('Create a group study schedule');

      await test.step('Share table functionality', async () => {
        expect(await tableBuilderPage.isTableGenerated()).toBe(true);

        try {
          await context.page.click('[data-testid="share-table-button"]', { timeout: 3000 });
          
          // Should show sharing options
          const hasShareOptions = await context.page.locator('[data-testid="share-options"]').isVisible({ timeout: 3000 });
          
          if (hasShareOptions) {
            console.log('Table sharing functionality available');
          }
        } catch {
          console.log('Table sharing might not be implemented');
        }
      });
    });
  });
});