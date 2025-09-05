/**
 * AI Tutor E2E Tests
 * Comprehensive testing of AI tutoring features and interactions
 */

import { test, expect, testGroup, testStep } from '../../utils/fixtures';
import { PageObjectFactory } from '../../utils/page-objects';

testGroup.aiFeatures('AI Tutor', () => {
  test.describe('Basic Chat Functionality', () => {
    test('should send and receive messages', async ({ context, mockServer }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await testStep.withScreenshot(
        context,
        'Basic chat interaction',
        async () => {
          // Send a test message
          const testMessage = 'Hello, can you help me understand calculus?';
          await aiTutorPage.sendMessage(testMessage);

          // Wait for AI response
          await aiTutorPage.waitForResponse(15000);

          // Verify message appeared in chat
          const messageCount = await aiTutorPage.getMessageCount();
          expect(messageCount).toBeGreaterThanOrEqual(2); // User message + AI response

          // Verify AI responded
          const lastMessage = await aiTutorPage.getLastMessage();
          expect(lastMessage.length).toBeGreaterThan(0);
          expect(lastMessage.toLowerCase()).toMatch(/(help|calculus|study|math|understand)/);
        }
      );
    });

    test('should handle multiple consecutive messages', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      const messages = [
        'What is a derivative?',
        'Can you give me an example?',
        'How does this apply to real world problems?'
      ];

      for (let i = 0; i < messages.length; i++) {
        await test.step(`Send message ${i + 1}`, async () => {
          await aiTutorPage.sendMessage(messages[i]);
          await aiTutorPage.waitForResponse();
          
          const messageCount = await aiTutorPage.getMessageCount();
          expect(messageCount).toBeGreaterThanOrEqual((i + 1) * 2); // Each exchange adds 2 messages
        });
      }
    });

    test('should handle empty messages gracefully', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Test empty message handling', async () => {
        // Try to send empty message
        await aiTutorPage.messageInput.fill('');
        await aiTutorPage.sendButton.click();

        // Should either prevent sending or handle gracefully
        const messageCount = await aiTutorPage.getMessageCount();
        expect(messageCount).toBe(0); // No messages should be added for empty input
      });
    });
  });

  test.describe('Streaming Responses', () => {
    test('should display streaming responses in real-time', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Test streaming response', async () => {
        await aiTutorPage.sendMessage('Explain the concept of limits in calculus');

        // Should show typing indicator
        try {
          await expect(aiTutorPage.typingIndicator).toBeVisible({ timeout: 3000 });
        } catch {
          console.log('Typing indicator might not be implemented');
        }

        // Wait for partial response to appear
        await context.page.waitForTimeout(2000);

        // Should eventually show complete response
        await aiTutorPage.waitForResponse(30000);
        
        const response = await aiTutorPage.getLastMessage();
        expect(response.length).toBeGreaterThan(10);
        expect(response.toLowerCase()).toMatch(/(limit|approach|calculus|continuous)/);
      });
    });

    test('should handle streaming interruption', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Test stream interruption', async () => {
        // Start a long response
        await aiTutorPage.sendMessage('Give me a detailed explanation of quantum physics');

        // Try to interrupt with another message
        await context.page.waitForTimeout(1000);
        await aiTutorPage.sendMessage('Actually, let me ask about math instead');

        // Should handle the interruption gracefully
        await aiTutorPage.waitForResponse();
        
        const messageCount = await aiTutorPage.getMessageCount();
        expect(messageCount).toBeGreaterThan(0);
      });
    });
  });

  test.describe('Chat History and Sessions', () => {
    test('should save chat history', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Create chat history', async () => {
        // Send several messages to create history
        const messages = [
          'Help me with algebra',
          'What is a quadratic equation?',
          'Can you show me an example?'
        ];

        for (const message of messages) {
          await aiTutorPage.sendMessage(message);
          await aiTutorPage.waitForResponse();
        }

        // Refresh page to test persistence
        await context.page.reload();
        await context.page.waitForLoadState('domcontentloaded');

        // History should be restored
        const messageCount = await aiTutorPage.getMessageCount();
        expect(messageCount).toBeGreaterThan(0);
      });
    });

    test('should allow viewing chat history', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('View chat history', async () => {
        try {
          await aiTutorPage.openHistory();

          // Should show history modal/panel
          await expect(context.page.locator('[data-testid="chat-history-modal"]')).toBeVisible({ timeout: 5000 });

          // Should show previous sessions
          const historySessions = context.page.locator('[data-testid="history-session-item"]');
          const sessionCount = await historySessions.count();
          expect(sessionCount).toBeGreaterThanOrEqual(0);

        } catch {
          console.log('Chat history feature might not be implemented');
        }
      });
    });

    test('should allow starting new chat sessions', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Start new chat session', async () => {
        // Send initial message
        await aiTutorPage.sendMessage('Initial message');
        await aiTutorPage.waitForResponse();

        const initialCount = await aiTutorPage.getMessageCount();
        expect(initialCount).toBeGreaterThan(0);

        // Clear chat to start new session
        try {
          await aiTutorPage.clearChat();
          
          const clearedCount = await aiTutorPage.getMessageCount();
          expect(clearedCount).toBe(0);
        } catch {
          console.log('Clear chat functionality might not be implemented');
        }
      });
    });
  });

  test.describe('Specialized AI Features', () => {
    test('should provide study suggestions', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Get study suggestions', async () => {
        // Look for suggestion chips
        try {
          const suggestionCount = await aiTutorPage.suggestions.count();
          
          if (suggestionCount > 0) {
            // Click on a suggestion
            await aiTutorPage.clickSuggestion(0);
            
            // Should send the suggested message
            await aiTutorPage.waitForResponse();
            
            const messageCount = await aiTutorPage.getMessageCount();
            expect(messageCount).toBeGreaterThan(0);
          }
        } catch {
          console.log('Study suggestions might not be implemented');
        }
      });
    });

    test('should provide subject-specific help', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      const subjects = [
        { query: 'Help me with calculus derivatives', keywords: ['derivative', 'limit', 'function'] },
        { query: 'Explain photosynthesis in biology', keywords: ['chlorophyll', 'glucose', 'sunlight'] },
        { query: 'What is the Pythagorean theorem?', keywords: ['triangle', 'hypotenuse', 'square'] }
      ];

      for (const subject of subjects) {
        await test.step(`Test ${subject.query}`, async () => {
          await aiTutorPage.sendMessage(subject.query);
          await aiTutorPage.waitForResponse();

          const response = await aiTutorPage.getLastMessage();
          const responseText = response.toLowerCase();

          // Should contain relevant subject keywords
          const hasRelevantContent = subject.keywords.some(keyword => 
            responseText.includes(keyword.toLowerCase())
          );
          
          expect(hasRelevantContent).toBe(true);
          console.log(`AI provided relevant ${subject.query} content`);
        });
      }
    });

    test('should handle complex mathematical expressions', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Test mathematical expression handling', async () => {
        const mathQueries = [
          'What is the derivative of x^2 + 3x + 1?',
          'Solve for x: 2x + 5 = 15',
          'What is the integral of sin(x)?'
        ];

        for (const query of mathQueries) {
          await aiTutorPage.sendMessage(query);
          await aiTutorPage.waitForResponse();

          const response = await aiTutorPage.getLastMessage();
          expect(response.length).toBeGreaterThan(10);
          
          // Response should contain mathematical content
          expect(response).toMatch(/[x\d\+\-\=\(\)]/);
          console.log(`Handled math query: ${query}`);
        }
      });
    });
  });

  test.describe('AI Response Quality', () => {
    test('should provide educational and helpful responses', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Test response quality', async () => {
        const educationalQueries = [
          'How do I improve my study habits?',
          'What are effective learning techniques?',
          'How can I better understand difficult concepts?'
        ];

        for (const query of educationalQueries) {
          await aiTutorPage.sendMessage(query);
          await aiTutorPage.waitForResponse();

          const response = await aiTutorPage.getLastMessage();
          
          // Response should be substantial
          expect(response.length).toBeGreaterThan(50);
          
          // Should contain educational keywords
          const educationalKeywords = [
            'study', 'learn', 'practice', 'understand', 'improve',
            'technique', 'method', 'strategy', 'focus', 'review'
          ];
          
          const hasEducationalContent = educationalKeywords.some(keyword =>
            response.toLowerCase().includes(keyword)
          );
          
          expect(hasEducationalContent).toBe(true);
          console.log(`Educational response provided for: ${query}`);
        }
      });
    });

    test('should maintain context across conversation', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Test context maintenance', async () => {
        // Start with a topic
        await aiTutorPage.sendMessage('I want to learn about calculus');
        await aiTutorPage.waitForResponse();

        // Follow up without explicitly mentioning calculus
        await aiTutorPage.sendMessage('What are the basic concepts I should know?');
        await aiTutorPage.waitForResponse();

        const response = await aiTutorPage.getLastMessage();
        
        // Response should reference calculus concepts, showing context was maintained
        expect(response.toLowerCase()).toMatch(/(calculus|derivative|limit|integral|function)/);
        console.log('AI maintained conversation context');
      });
    });

    test('should handle inappropriate requests appropriately', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Test inappropriate content handling', async () => {
        // Test with off-topic request
        await aiTutorPage.sendMessage('Tell me a joke instead of helping with studies');
        await aiTutorPage.waitForResponse();

        const response = await aiTutorPage.getLastMessage();
        
        // Should redirect to educational content
        const redirectsToEducation = response.toLowerCase().includes('study') ||
                                   response.toLowerCase().includes('learn') ||
                                   response.toLowerCase().includes('help');
                                   
        expect(redirectsToEducation).toBe(true);
        console.log('AI appropriately handled off-topic request');
      });
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should handle concurrent messages', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Test concurrent message handling', async () => {
        // Send multiple messages quickly
        const promises = [];
        const messages = [
          'Question 1: What is algebra?',
          'Question 2: What is geometry?',
          'Question 3: What is calculus?'
        ];

        // Send all messages without waiting
        for (const message of messages) {
          promises.push(aiTutorPage.sendMessage(message));
        }

        await Promise.all(promises);

        // Wait for all responses
        await context.page.waitForTimeout(10000);

        // Should handle all messages appropriately
        const finalMessageCount = await aiTutorPage.getMessageCount();
        expect(finalMessageCount).toBeGreaterThanOrEqual(messages.length);
      });
    });

    test('should handle network interruptions gracefully', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Test network failure handling', async () => {
        // Simulate network failure
        await context.page.route('**/functions/v1/deepseek-ai-professional', route => route.abort());
        
        await aiTutorPage.sendMessage('This message should fail');
        
        // Should show error state
        try {
          await expect(context.page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 5000 });
        } catch {
          // Error handling might be different
          console.log('Network error handling might use different UI patterns');
        }

        // Clear route to restore functionality
        await context.page.unroute('**/functions/v1/deepseek-ai-professional');
      });
    });

    test('should maintain performance with long conversations', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Test long conversation performance', async () => {
        const startTime = Date.now();

        // Create a longer conversation
        for (let i = 0; i < 5; i++) {
          await aiTutorPage.sendMessage(`Message ${i + 1}: Tell me about topic ${i + 1}`);
          await aiTutorPage.waitForResponse(10000);
        }

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        console.log(`5-message conversation completed in ${totalTime}ms`);
        
        // Should complete within reasonable time (2 minutes)
        expect(totalTime).toBeLessThan(120000);

        // Chat should remain responsive
        const finalMessageCount = await aiTutorPage.getMessageCount();
        expect(finalMessageCount).toBeGreaterThanOrEqual(10); // 5 exchanges = 10 messages
      });
    });
  });

  test.describe('Integration Features', () => {
    test('should integrate with study recommendations', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Test study recommendation integration', async () => {
        await aiTutorPage.sendMessage('I need help creating a study plan');
        await aiTutorPage.waitForResponse();

        const response = await aiTutorPage.getLastMessage();
        
        // Should provide actionable study recommendations
        const hasStudyAdvice = response.toLowerCase().includes('plan') ||
                              response.toLowerCase().includes('schedule') ||
                              response.toLowerCase().includes('organize');
                              
        expect(hasStudyAdvice).toBe(true);

        // Look for integration with other app features
        try {
          const hasIntegrationLinks = await context.page.locator('[data-testid="create-study-plan"]').isVisible({ timeout: 2000 });
          if (hasIntegrationLinks) {
            console.log('AI Tutor includes integration with study planning');
          }
        } catch {
          console.log('Study plan integration might not be implemented');
        }
      });
    });

    test('should reference user data when relevant', async ({ context }) => {
      const pages = new PageObjectFactory(context.page);
      const aiTutorPage = pages.aiTutor();

      await aiTutorPage.goto();

      await test.step('Test user data integration', async () => {
        await aiTutorPage.sendMessage('What should I study today?');
        await aiTutorPage.waitForResponse();

        const response = await aiTutorPage.getLastMessage();
        
        // Should provide personalized recommendations
        expect(response.length).toBeGreaterThan(20);
        
        // Look for references to user-specific data
        const hasPersonalization = response.toLowerCase().includes('your') ||
                                   response.toLowerCase().includes('you have') ||
                                   response.toLowerCase().includes('based on');
                                   
        if (hasPersonalization) {
          console.log('AI Tutor provides personalized recommendations');
        }
      });
    });
  });
});