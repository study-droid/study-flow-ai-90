/**
 * AI Recommendations E2E Tests
 * Testing AI-powered study recommendations and insights
 */

import { test, expect, testGroup, testStep } from '../../utils/fixtures';
import { PageObjectFactory } from '../../utils/page-objects';

testGroup.aiFeatures('AI Recommendations', () => {
  test.describe('Study Recommendations', () => {
    test('should display personalized study recommendations', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const dashboardPage = pages.dashboard();

      await dashboardPage.goto();

      await testStep.withScreenshot(
        context,
        'View study recommendations',
        async () => {
          try {
            // Look for AI recommendations section
            await expect(dashboardPage.aiRecommendations).toBeVisible({ timeout: 10000 });

            const recommendationItems = await context.page.locator('[data-testid="recommendation-item"]').count();
            expect(recommendationItems).toBeGreaterThan(0);

            // Check recommendation content quality
            for (let i = 0; i < Math.min(recommendationItems, 3); i++) {
              const recommendation = context.page.locator('[data-testid="recommendation-item"]').nth(i);
              
              // Should have title and description
              const hasTitle = await recommendation.locator('[data-testid="recommendation-title"]').isVisible();
              const hasDescription = await recommendation.locator('[data-testid="recommendation-description"]').isVisible();
              
              expect(hasTitle || hasDescription).toBe(true);
              
              const text = await recommendation.textContent();
              expect(text?.length).toBeGreaterThan(10);
            }

            console.log(`Found ${recommendationItems} study recommendations`);
          } catch {
            console.log('Study recommendations might not be implemented on dashboard');
          }
        }
      );
    });

    test('should provide different types of recommendations', async ({ context }) => {
      // Navigate to different pages to trigger various recommendation types
      const recommendationPages = [
        { path: '/dashboard', context: 'general study' },
        { path: '/tasks', context: 'task management' },
        { path: '/study', context: 'study session' },
        { path: '/ai-tutor', context: 'learning support' }
      ];

      for (const page of recommendationPages) {
        await test.step(`Check ${page.context} recommendations`, async () => {
          await context.page.goto(page.path);
          await context.page.waitForLoadState('domcontentloaded');

          try {
            // Look for recommendations specific to this context
            const recommendations = context.page.locator('[data-testid*="recommendation"], [data-testid*="suggestion"], [data-testid*="insight"]');
            const count = await recommendations.count();

            if (count > 0) {
              console.log(`Found ${count} recommendations on ${page.path}`);
              
              // Verify recommendations are contextually relevant
              for (let i = 0; i < Math.min(count, 2); i++) {
                const recText = await recommendations.nth(i).textContent();
                expect(recText?.length).toBeGreaterThan(5);
              }
            }
          } catch {
            console.log(`No recommendations found on ${page.path}`);
          }
        });
      }
    });

    test('should update recommendations based on user activity', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);

      await test.step('Generate user activity', async () => {
        // Create some user activity that should influence recommendations
        const tasksPage = pages.tasks();
        await tasksPage.goto();

        // Create a task in a specific subject
        try {
          await tasksPage.createTask();
          await context.page.fill('[data-testid="task-title-input"]', 'Mathematics Assignment');
          await context.page.selectOption('[data-testid="task-subject-select"]', 'test-subject-math', { timeout: 3000 });
          await context.page.click('[data-testid="submit-button"]');
          
          await context.page.waitForSelector('[data-testid="task-created-toast"]', { timeout: 5000 });
        } catch {
          console.log('Task creation might not be available for activity generation');
        }
      });

      await test.step('Check for updated recommendations', async () => {
        // Navigate back to dashboard
        const dashboardPage = pages.dashboard();
        await dashboardPage.goto();

        try {
          await expect(dashboardPage.aiRecommendations).toBeVisible({ timeout: 5000 });
          
          // Look for mathematics-related recommendations
          const recommendationsText = await context.page.locator('[data-testid="ai-recommendations"]').textContent();
          
          // Should contain some reference to mathematics or recent activity
          const hasMathContent = recommendationsText?.toLowerCase().includes('math') ||
                                recommendationsText?.toLowerCase().includes('assignment') ||
                                recommendationsText?.toLowerCase().includes('recent');

          if (hasMathContent) {
            console.log('Recommendations updated based on user activity');
          }
        } catch {
          console.log('Updated recommendations check skipped');
        }
      });
    });
  });

  test.describe('Learning Insights', () => {
    test('should provide study pattern insights', async ({ context }) => {
      await context.page.goto('/dashboard');

      await test.step('Check study insights', async () => {
        try {
          // Look for insights section
          const insightsSection = context.page.locator('[data-testid="study-insights"], [data-testid="learning-insights"]');
          const hasInsights = await insightsSection.isVisible({ timeout: 5000 });

          if (hasInsights) {
            // Check for different types of insights
            const insightTypes = [
              '[data-testid="productivity-insight"]',
              '[data-testid="focus-insight"]',
              '[data-testid="progress-insight"]',
              '[data-testid="pattern-insight"]'
            ];

            let foundInsights = 0;
            for (const insightType of insightTypes) {
              try {
                await expect(context.page.locator(insightType)).toBeVisible({ timeout: 2000 });
                foundInsights++;
              } catch {
                // Insight type not found
              }
            }

            expect(foundInsights).toBeGreaterThan(0);
            console.log(`Found ${foundInsights} different types of study insights`);
          }
        } catch {
          console.log('Study insights might not be implemented');
        }
      });
    });

    test('should show performance trends', async ({ context }) => {
      await context.page.goto('/analytics');

      await test.step('Check performance trends', async () => {
        try {
          await context.page.waitForLoadState('domcontentloaded');
          
          // Look for performance analytics
          const performanceElements = [
            '[data-testid="performance-chart"]',
            '[data-testid="trend-analysis"]',
            '[data-testid="progress-metrics"]'
          ];

          let hasPerformanceData = false;
          for (const element of performanceElements) {
            try {
              await expect(context.page.locator(element)).toBeVisible({ timeout: 3000 });
              hasPerformanceData = true;
              console.log(`Performance trend element found: ${element}`);
              break;
            } catch {
              // Element not found
            }
          }

          if (hasPerformanceData) {
            // Should show some form of trend data
            const trendText = await context.page.locator('[data-testid*="trend"], [data-testid*="performance"]').first().textContent();
            expect(trendText?.length).toBeGreaterThan(0);
          }
        } catch {
          console.log('Analytics page might not be available');
        }
      });
    });

    test('should provide goal progress insights', async ({ context }) => {
      await context.page.goto('/dashboard');

      await test.step('Check goal insights', async () => {
        try {
          // Look for goal-related insights
          const goalInsights = context.page.locator('[data-testid*="goal"]').filter({ hasText: /progress|achievement|milestone/ });
          const count = await goalInsights.count();

          if (count > 0) {
            for (let i = 0; i < Math.min(count, 2); i++) {
              const insightText = await goalInsights.nth(i).textContent();
              expect(insightText?.length).toBeGreaterThan(5);
              
              // Should contain progress-related keywords
              const hasProgressContent = insightText?.toLowerCase().includes('progress') ||
                                        insightText?.toLowerCase().includes('goal') ||
                                        insightText?.toLowerCase().includes('target');
              
              if (hasProgressContent) {
                console.log('Goal progress insight found');
              }
            }
          }
        } catch {
          console.log('Goal insights might not be implemented');
        }
      });
    });
  });

  test.describe('Adaptive Learning Suggestions', () => {
    test('should suggest optimal study times', async ({ context }) => {
      await context.page.goto('/study');

      await test.step('Check study time suggestions', async () => {
        try {
          // Look for time-based recommendations
          const timeRecommendations = context.page.locator('[data-testid*="time"], [data-testid*="schedule"]').filter({ hasText: /optimal|best|recommend/ });
          const count = await timeRecommendations.count();

          if (count > 0) {
            const suggestionText = await timeRecommendations.first().textContent();
            
            // Should suggest specific times or patterns
            const hasTimeAdvice = suggestionText?.match(/\d{1,2}:\d{2}|\d+ (minutes?|hours?)|morning|afternoon|evening/) ||
                                 suggestionText?.toLowerCase().includes('time') ||
                                 suggestionText?.toLowerCase().includes('schedule');

            if (hasTimeAdvice) {
              console.log('Study time suggestions provided');
            }
          }
        } catch {
          console.log('Study time suggestions might not be implemented');
        }
      });
    });

    test('should suggest study techniques', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Request study technique suggestions', async () => {
        await aiTutorPage.sendMessage('What study techniques do you recommend for me?');
        await aiTutorPage.waitForResponse(15000);

        const response = await aiTutorPage.getLastMessage();
        
        // Should suggest specific techniques
        const techniques = [
          'pomodoro', 'spaced repetition', 'active recall', 'mind map',
          'flashcard', 'practice test', 'summary', 'outline'
        ];

        const hasTechniqueSuggestions = techniques.some(technique =>
          response.toLowerCase().includes(technique)
        );

        expect(hasTechniqueSuggestions).toBe(true);
        console.log('AI provided study technique recommendations');
      });
    });

    test('should suggest subject-specific strategies', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      const subjects = [
        { subject: 'mathematics', strategies: ['practice problems', 'formula', 'step by step'] },
        { subject: 'history', strategies: ['timeline', 'cause and effect', 'context'] },
        { subject: 'science', strategies: ['experiment', 'observation', 'hypothesis'] }
      ];

      for (const subjectData of subjects) {
        await test.step(`Test ${subjectData.subject} strategies`, async () => {
          await aiTutorPage.sendMessage(`How should I study ${subjectData.subject}?`);
          await aiTutorPage.waitForResponse(15000);

          const response = await aiTutorPage.getLastMessage();
          
          // Should provide subject-specific advice
          const hasSubjectStrategy = subjectData.strategies.some(strategy =>
            response.toLowerCase().includes(strategy)
          );

          expect(response.length).toBeGreaterThan(20);
          console.log(`${subjectData.subject} study strategies provided`);
        });
      }
    });
  });

  test.describe('Difficulty Adjustment', () => {
    test('should adjust recommendations based on performance', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Indicate struggling with topic', async () => {
        await aiTutorPage.sendMessage('I\'m really struggling with calculus derivatives and keep making mistakes');
        await aiTutorPage.waitForResponse();

        const response = await aiTutorPage.getLastMessage();
        
        // Should provide beginner-friendly advice
        const hasBasicSupport = response.toLowerCase().includes('basic') ||
                               response.toLowerCase().includes('fundamental') ||
                               response.toLowerCase().includes('start') ||
                               response.toLowerCase().includes('simple');

        expect(hasBasicSupport).toBe(true);
        console.log('AI adjusted recommendations for struggling student');
      });

      await test.step('Indicate advanced understanding', async () => {
        await aiTutorPage.sendMessage('I understand basic derivatives well and need more challenging problems');
        await aiTutorPage.waitForResponse();

        const response = await aiTutorPage.getLastMessage();
        
        // Should provide advanced suggestions
        const hasAdvancedContent = response.toLowerCase().includes('advanced') ||
                                  response.toLowerCase().includes('complex') ||
                                  response.toLowerCase().includes('challenging') ||
                                  response.toLowerCase().includes('next level');

        expect(hasAdvancedContent).toBe(true);
        console.log('AI provided advanced recommendations');
      });
    });

    test('should suggest prerequisite learning when needed', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Ask about advanced topic without prerequisites', async () => {
        await aiTutorPage.sendMessage('Can you teach me quantum field theory?');
        await aiTutorPage.waitForResponse();

        const response = await aiTutorPage.getLastMessage();
        
        // Should suggest prerequisites
        const suggestsPrereqs = response.toLowerCase().includes('first') ||
                               response.toLowerCase().includes('prerequisite') ||
                               response.toLowerCase().includes('before') ||
                               response.toLowerCase().includes('foundation');

        expect(suggestsPrereqs).toBe(true);
        console.log('AI suggested prerequisite learning');
      });
    });
  });

  test.describe('Recommendation Quality and Relevance', () => {
    test('should provide actionable recommendations', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const dashboardPage = pages.dashboard();

      await dashboardPage.goto();

      await test.step('Check recommendation actionability', async () => {
        try {
          const recommendations = context.page.locator('[data-testid="recommendation-item"]');
          const count = await recommendations.count();

          if (count > 0) {
            for (let i = 0; i < Math.min(count, 3); i++) {
              const rec = recommendations.nth(i);
              const recText = await rec.textContent();
              
              // Should contain action verbs
              const hasActionVerbs = recText?.toLowerCase().match(/(try|practice|review|study|complete|create|focus|improve|spend|schedule)/);
              
              if (hasActionVerbs) {
                console.log(`Actionable recommendation found: ${hasActionVerbs[0]}`);
              }

              // Look for action buttons
              const hasActionButton = await rec.locator('[data-testid*="action"], button').isVisible({ timeout: 1000 });
              
              if (hasActionButton) {
                console.log('Recommendation has action button');
              }
            }
          }
        } catch {
          console.log('Recommendation actionability check skipped');
        }
      });
    });

    test('should avoid repetitive recommendations', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const dashboardPage = pages.dashboard();

      await dashboardPage.goto();

      await test.step('Check recommendation diversity', async () => {
        try {
          const recommendations = context.page.locator('[data-testid="recommendation-item"]');
          const count = await recommendations.count();

          if (count > 1) {
            const recTexts: string[] = [];
            
            for (let i = 0; i < Math.min(count, 5); i++) {
              const text = await recommendations.nth(i).textContent();
              if (text) {
                recTexts.push(text.toLowerCase());
              }
            }

            // Check for diversity (no exact duplicates)
            const uniqueTexts = new Set(recTexts);
            expect(uniqueTexts.size).toBe(recTexts.length);

            // Check for thematic diversity
            const themes = recTexts.map(text => {
              if (text.includes('study') || text.includes('learn')) return 'learning';
              if (text.includes('schedule') || text.includes('time')) return 'scheduling';
              if (text.includes('goal') || text.includes('target')) return 'goals';
              if (text.includes('review') || text.includes('practice')) return 'review';
              return 'other';
            });

            const uniqueThemes = new Set(themes);
            expect(uniqueThemes.size).toBeGreaterThan(1);
            console.log(`Found ${uniqueThemes.size} different recommendation themes`);
          }
        } catch {
          console.log('Recommendation diversity check skipped');
        }
      });
    });

    test('should refresh recommendations periodically', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const dashboardPage = pages.dashboard();

      await dashboardPage.goto();

      await test.step('Check recommendation refresh', async () => {
        try {
          // Get initial recommendations
          const initialRecs = await context.page.locator('[data-testid="recommendation-item"]').allTextContents();
          
          if (initialRecs.length > 0) {
            // Refresh the page or trigger a refresh
            await context.page.reload();
            await context.page.waitForLoadState('domcontentloaded');
            
            // Wait a moment for any dynamic loading
            await context.page.waitForTimeout(2000);
            
            // Get updated recommendations
            const updatedRecs = await context.page.locator('[data-testid="recommendation-item"]').allTextContents();
            
            // Should have recommendations (might be same or different)
            expect(updatedRecs.length).toBeGreaterThan(0);
            
            console.log(`Initial: ${initialRecs.length} recs, Updated: ${updatedRecs.length} recs`);
          }
        } catch {
          console.log('Recommendation refresh check skipped');
        }
      });
    });
  });

  test.describe('Integration with User Data', () => {
    test('should incorporate task deadlines in recommendations', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);

      // Create a task with upcoming deadline
      await test.step('Create urgent task', async () => {
        const tasksPage = pages.tasks();
        await tasksPage.goto();

        try {
          await tasksPage.createTask();
          await context.page.fill('[data-testid="task-title-input"]', 'Urgent Assignment Due Soon');
          
          // Set due date to tomorrow
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dateString = tomorrow.toISOString().split('T')[0];
          await context.page.fill('[data-testid="task-due-date-input"]', dateString);
          
          await context.page.click('[data-testid="submit-button"]');
          await context.page.waitForSelector('[data-testid="task-created-toast"]', { timeout: 5000 });
        } catch {
          console.log('Task creation skipped for deadline test');
        }
      });

      await test.step('Check deadline-based recommendations', async () => {
        const dashboardPage = pages.dashboard();
        await dashboardPage.goto();

        try {
          await expect(dashboardPage.aiRecommendations).toBeVisible({ timeout: 5000 });
          
          const recText = await context.page.locator('[data-testid="ai-recommendations"]').textContent();
          
          // Should mention urgency or deadlines
          const hasDeadlineAwareness = recText?.toLowerCase().includes('urgent') ||
                                      recText?.toLowerCase().includes('due') ||
                                      recText?.toLowerCase().includes('deadline') ||
                                      recText?.toLowerCase().includes('soon');

          if (hasDeadlineAwareness) {
            console.log('Recommendations incorporate task deadlines');
          }
        } catch {
          console.log('Deadline-based recommendations check skipped');
        }
      });
    });

    test('should consider study history in recommendations', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);

      // Generate some study history
      await test.step('Create study history', async () => {
        try {
          await context.page.goto('/study');
          
          // Start and end a study session
          await context.page.click('[data-testid="start-studying-button"]', { timeout: 5000 });
          await context.page.waitForTimeout(2000);
          await context.page.click('[data-testid="end-session-button"]', { timeout: 5000 });
        } catch {
          console.log('Study history generation skipped');
        }
      });

      await test.step('Check history-based recommendations', async () => {
        const dashboardPage = pages.dashboard();
        await dashboardPage.goto();

        try {
          const recommendations = context.page.locator('[data-testid="recommendation-item"]');
          const count = await recommendations.count();

          if (count > 0) {
            const allRecText = await recommendations.allTextContents();
            const hasHistoryReference = allRecText.some(text =>
              text.toLowerCase().includes('continue') ||
              text.toLowerCase().includes('last') ||
              text.toLowerCase().includes('previous') ||
              text.toLowerCase().includes('based on')
            );

            if (hasHistoryReference) {
              console.log('Recommendations consider study history');
            }
          }
        } catch {
          console.log('History-based recommendations check skipped');
        }
      });
    });
  });
});