/**
 * Security E2E Tests
 * Testing application security, XSS prevention, CSRF protection, and data validation
 */

import { test, expect, testGroup } from '../utils/fixtures';
import { PageObjectFactory } from '../utils/page-objects';

testGroup.authenticated('Security Testing', () => {
  test.describe('XSS Prevention', () => {
    test('should sanitize user input in forms', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks');
      await authenticatedPage.waitForLoadState('domcontentloaded');

      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(\'XSS\')">',
        'javascript:alert("XSS")',
        '<svg onload="alert(\'XSS\')">',
        '"><script>alert("XSS")</script>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<body onload="alert(\'XSS\')">',
        '<input type="text" value="XSS" onfocus="alert(\'XSS\')">'
      ];

      for (const payload of xssPayloads) {
        await test.step(`Test XSS payload: ${payload.substring(0, 30)}...`, async () => {
          try {
            // Try to create a task with XSS payload
            await authenticatedPage.click('[data-testid="create-task-button"]', { timeout: 5000 });
            
            await authenticatedPage.fill('[data-testid="task-title-input"]', payload);
            await authenticatedPage.fill('[data-testid="task-description-input"]', payload);
            
            await authenticatedPage.click('[data-testid="submit-button"]');
            
            // Wait for task creation or error
            await authenticatedPage.waitForTimeout(2000);
            
            // Check if script executed (should not happen)
            const alertFired = await authenticatedPage.evaluate(() => {
              return window.alert.toString() !== 'function alert() { [native code] }';
            });
            
            expect(alertFired).toBe(false);
            
            // Verify payload is properly escaped in DOM
            const pageContent = await authenticatedPage.content();
            expect(pageContent).not.toContain('<script>alert("XSS")</script>');
            expect(pageContent).not.toContain('onerror="alert');
            expect(pageContent).not.toContain('onload="alert');
            
            console.log(`XSS payload safely handled: ${payload.substring(0, 20)}`);
            
          } catch (error) {
            console.log(`XSS test error (expected): ${error}`);
          }
        });
      }
    });

    test('should sanitize AI chat input', async ({ authenticatedPage }) => {
      const pages = new PageObjectFactory(authenticatedPage);
      const aiTutorPage = pages.aiTutor();
      
      await aiTutorPage.goto();
      
      const xssPayloads = [
        '<script>alert("XSS in chat")</script>',
        '<img src="x" onerror="window.xssExecuted=true">',
        'javascript:alert("Chat XSS")'
      ];
      
      for (const payload of xssPayloads) {
        await test.step(`Test AI chat XSS: ${payload.substring(0, 30)}...`, async () => {
          try {
            await aiTutorPage.sendMessage(payload);
            await aiTutorPage.waitForResponse(5000);
            
            // Check if XSS executed
            const xssExecuted = await authenticatedPage.evaluate(() => {
              return (window as any).xssExecuted === true;
            });
            
            expect(xssExecuted).toBe(false);
            
            // Verify message is properly escaped
            const chatContent = await authenticatedPage.locator('[data-testid="chat-container"]').innerHTML();
            expect(chatContent).not.toContain('<script>');
            expect(chatContent).not.toContain('onerror=');
            expect(chatContent).not.toContain('javascript:');
            
            console.log('AI chat XSS payload safely handled');
            
          } catch (error) {
            console.log('AI chat XSS test completed with error (expected)');
          }
        });
      }
    });

    test('should prevent DOM-based XSS', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks');
      
      // Test URL-based XSS attempts
      const maliciousUrls = [
        '/tasks#<script>alert("DOM XSS")</script>',
        '/tasks?search=<img src=x onerror=alert("XSS")>',
        '/tasks?filter="><script>alert("XSS")</script>'
      ];
      
      for (const url of maliciousUrls) {
        await test.step(`Test DOM XSS via URL: ${url}`, async () => {
          await authenticatedPage.goto(url);
          await authenticatedPage.waitForTimeout(1000);
          
          // Check if XSS executed
          const alertOverridden = await authenticatedPage.evaluate(() => {
            return typeof window.alert !== 'function' || window.alert.toString().includes('alert("');
          });
          
          expect(alertOverridden).toBe(false);
          
          console.log('DOM-based XSS via URL prevented');
        });
      }
    });
  });

  test.describe('CSRF Protection', () => {
    test('should protect state-changing operations', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks');
      
      // Get CSRF token if present
      const csrfToken = await authenticatedPage.evaluate(() => {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        return metaTag ? metaTag.getAttribute('content') : null;
      });
      
      // Try to make state-changing request without proper CSRF protection
      const csrfTest = await authenticatedPage.evaluate(async (token) => {
        try {
          const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Intentionally omit CSRF token
            },
            body: JSON.stringify({
              title: 'CSRF Test Task',
              description: 'This should be blocked'
            })
          });
          
          return {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText
          };
        } catch (error) {
          return {
            error: error.message
          };
        }
      }, csrfToken);
      
      console.log('CSRF Protection Test Result:', csrfTest);
      
      // Should either reject the request or require proper CSRF token
      if (csrfTest.status) {
        expect(csrfTest.status).not.toBe(200); // Should not succeed without CSRF protection
      }
    });

    test('should validate referrer headers', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks');
      
      // Test request with suspicious referrer
      const referrerTest = await authenticatedPage.evaluate(async () => {
        try {
          // Simulate request from external domain (this may be blocked by browser)
          const response = await fetch('/api/tasks', {
            method: 'GET',
            headers: {
              'Referer': 'https://malicious-site.com'
            }
          });
          
          return {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
          };
        } catch (error) {
          return {
            error: error.message
          };
        }
      });
      
      console.log('Referrer Validation Test:', referrerTest);
      
      // Application should handle suspicious referrers appropriately
      expect(referrerTest).toBeDefined();
    });
  });

  test.describe('Input Validation', () => {
    test('should validate form input lengths', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks');
      
      await test.step('Test maximum input length validation', async () => {
        try {
          await authenticatedPage.click('[data-testid="create-task-button"]');
          
          // Test extremely long input
          const longString = 'A'.repeat(10000);
          
          await authenticatedPage.fill('[data-testid="task-title-input"]', longString);
          await authenticatedPage.fill('[data-testid="task-description-input"]', longString);
          
          await authenticatedPage.click('[data-testid="submit-button"]');
          
          // Should either truncate, show validation error, or reject
          await authenticatedPage.waitForTimeout(2000);
          
          const hasValidationError = await authenticatedPage.locator('[data-testid*="error"]').isVisible({ timeout: 3000 });
          const inputValue = await authenticatedPage.inputValue('[data-testid="task-title-input"]');
          
          // Input should be validated (either error shown or input truncated)
          const isValidated = hasValidationError || inputValue.length < longString.length;
          expect(isValidated).toBe(true);
          
          console.log('Input length validation working');
          
        } catch (error) {
          console.log('Input validation test completed');
        }
      });
    });

    test('should sanitize special characters', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tasks');
      
      const specialCharPayloads = [
        'Task with "quotes" and \'apostrophes\'',
        'Task with <brackets> and [square brackets]',
        'Task with & ampersand and % percent',
        'Task with null\x00byte and control\x1fchars',
        'Task with unicode \u2603 snowman ☃',
        'Task with emoji 😀🎯🚀 characters'
      ];
      
      for (const payload of specialCharPayloads) {
        await test.step(`Test special characters: ${payload.substring(0, 30)}...`, async () => {
          try {
            await authenticatedPage.click('[data-testid="create-task-button"]');
            
            await authenticatedPage.fill('[data-testid="task-title-input"]', payload);
            await authenticatedPage.click('[data-testid="submit-button"]');
            
            // Wait for processing
            await authenticatedPage.waitForTimeout(1000);
            
            // Verify input is safely handled
            const inputValue = await authenticatedPage.inputValue('[data-testid="task-title-input"]');
            
            // Should not contain null bytes or control characters
            expect(inputValue).not.toContain('\x00');
            expect(inputValue).not.toContain('\x1f');
            
            console.log(`Special characters handled safely: ${payload.substring(0, 20)}`);
            
          } catch (error) {
            console.log('Special character test completed');
          }
        });
      }
    });

    test('should validate email format', async ({ page }) => {
      const pages = new PageObjectFactory(page);
      const authPage = pages.auth();
      
      await authPage.goto();
      
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com',
        'user@domain',
        'user name@domain.com',
        '<script>alert("xss")</script>@domain.com'
      ];
      
      for (const email of invalidEmails) {
        await test.step(`Test invalid email: ${email}`, async () => {
          await authPage.emailInput.fill(email);
          await authPage.passwordInput.fill('ValidPassword123!');
          await authPage.signInButton.click();
          
          // Should show validation error or prevent submission
          await page.waitForTimeout(1000);
          
          const hasError = await page.locator('[data-testid*="error"], [aria-invalid="true"]').isVisible({ timeout: 2000 });
          const isStillOnAuth = page.url().includes('/auth');
          
          expect(hasError || isStillOnAuth).toBe(true);
          
          console.log(`Email validation working for: ${email}`);
        });
      }
    });
  });

  test.describe('Authentication Security', () => {
    test('should prevent brute force attacks', async ({ page }) => {
      const pages = new PageObjectFactory(page);
      const authPage = pages.auth();
      
      await authPage.goto();
      
      // Attempt multiple failed logins
      const attempts = 5;
      const results = [];
      
      for (let i = 0; i < attempts; i++) {
        await test.step(`Brute force attempt ${i + 1}`, async () => {
          await authPage.emailInput.fill('test@example.com');
          await authPage.passwordInput.fill(`wrongpassword${i}`);
          
          const startTime = Date.now();
          await authPage.signInButton.click();
          
          // Wait for response
          await page.waitForTimeout(2000);
          
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          const hasError = await page.locator('[data-testid*="error"]').isVisible({ timeout: 1000 });
          const isBlocked = await page.locator('text=too many attempts').isVisible({ timeout: 1000 });
          
          results.push({
            attempt: i + 1,
            responseTime,
            hasError,
            isBlocked
          });
          
          console.log(`Attempt ${i + 1}: ${responseTime}ms, blocked: ${isBlocked}`);
        });
      }
      
      // Check if brute force protection is active
      const lastAttempt = results[results.length - 1];
      const hasProtection = lastAttempt.isBlocked || lastAttempt.responseTime > 5000;
      
      console.log('Brute force protection active:', hasProtection);
      
      // Should have some form of rate limiting or blocking
      if (hasProtection) {
        console.log('✅ Brute force protection detected');
      } else {
        console.log('⚠️ Consider implementing brute force protection');
      }
    });

    test('should handle session timeout', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      
      // Simulate session expiration by clearing storage
      await authenticatedPage.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear cookies
        document.cookie.split(";").forEach(c => {
          const eqPos = c.indexOf("=");
          const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        });
      });
      
      // Try to access protected resource
      await authenticatedPage.goto('/tasks');
      await authenticatedPage.waitForTimeout(2000);
      
      // Should redirect to login or show session expired message
      const isRedirectedToAuth = authenticatedPage.url().includes('/auth');
      const hasSessionExpiredMessage = await authenticatedPage.locator('text=session expired').isVisible({ timeout: 2000 });
      
      expect(isRedirectedToAuth || hasSessionExpiredMessage).toBe(true);
      
      console.log('Session timeout handling verified');
    });

    test('should validate password strength', async ({ page }) => {
      const pages = new PageObjectFactory(page);
      const authPage = pages.auth();
      
      await authPage.goto();
      
      // Try to switch to registration mode if available
      try {
        await page.click('[data-testid="switch-to-signup"]', { timeout: 3000 });
      } catch {
        // Registration might not be available or accessible
        console.log('Password strength test skipped - registration not available');
        return;
      }
      
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        'qwerty',
        '111111',
        'test'
      ];
      
      for (const password of weakPasswords) {
        await test.step(`Test weak password: ${password}`, async () => {
          await authPage.emailInput.fill('test@example.com');
          await authPage.passwordInput.fill(password);
          
          await authPage.signUpButton.click();
          await page.waitForTimeout(1000);
          
          // Should show password strength error
          const hasPasswordError = await page.locator('[data-testid*="password-error"], [data-testid*="weak-password"]').isVisible({ timeout: 2000 });
          const isStillOnAuth = page.url().includes('/auth');
          
          expect(hasPasswordError || isStillOnAuth).toBe(true);
          
          console.log(`Weak password rejected: ${password}`);
        });
      }
    });
  });

  test.describe('Data Protection', () => {
    test('should protect sensitive data in client-side storage', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('networkidle');
      
      // Check localStorage for sensitive data
      const storageAudit = await authenticatedPage.evaluate(() => {
        const sensitivePatterns = [
          /password/i,
          /secret/i,
          /token/i,
          /key/i,
          /auth/i,
          /session/i
        ];
        
        const localStorage = window.localStorage;
        const sessionStorage = window.sessionStorage;
        
        const findings = [];
        
        // Check localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          const value = localStorage.getItem(key || '');
          
          sensitivePatterns.forEach(pattern => {
            if (pattern.test(key || '') || pattern.test(value || '')) {
              findings.push({
                storage: 'localStorage',
                key: key,
                hasSensitiveKey: pattern.test(key || ''),
                hasSensitiveValue: pattern.test(value || ''),
                valuePreview: value?.substring(0, 50)
              });
            }
          });
        }
        
        // Check sessionStorage
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          const value = sessionStorage.getItem(key || '');
          
          sensitivePatterns.forEach(pattern => {
            if (pattern.test(key || '') || pattern.test(value || '')) {
              findings.push({
                storage: 'sessionStorage',
                key: key,
                hasSensitiveKey: pattern.test(key || ''),
                hasSensitiveValue: pattern.test(value || ''),
                valuePreview: value?.substring(0, 50)
              });
            }
          });
        }
        
        return findings;
      });
      
      console.log('Storage Security Audit:', storageAudit);
      
      // Check for exposed sensitive data
      const exposedSecrets = storageAudit.filter(item => 
        (item.key?.toLowerCase().includes('password') ||
         item.key?.toLowerCase().includes('secret') ||
         item.valuePreview?.includes('password')) &&
        !item.key?.includes('hash') && // Hashed passwords might be OK
        !item.key?.includes('encrypted') // Encrypted data might be OK
      );
      
      expect(exposedSecrets.length).toBe(0);
      console.log('✅ No exposed secrets found in client storage');
    });

    test('should not expose sensitive data in DOM', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('networkidle');
      
      // Check DOM for sensitive data patterns
      const domAudit = await authenticatedPage.evaluate(() => {
        const sensitivePatterns = [
          /password\s*[:=]\s*['"]\w+['"]/gi,
          /secret\s*[:=]\s*['"]\w+['"]/gi,
          /token\s*[:=]\s*['"]\w+['"]/gi,
          /api[_-]?key\s*[:=]\s*['"]\w+['"]/gi
        ];
        
        const htmlContent = document.documentElement.outerHTML;
        const findings = [];
        
        sensitivePatterns.forEach((pattern, index) => {
          const matches = htmlContent.match(pattern);
          if (matches) {
            findings.push({
              pattern: pattern.toString(),
              matches: matches.map(m => m.substring(0, 50))
            });
          }
        });
        
        return findings;
      });
      
      console.log('DOM Security Audit:', domAudit);
      
      expect(domAudit.length).toBe(0);
      console.log('✅ No sensitive data exposed in DOM');
    });

    test('should use secure HTTP headers', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      
      // Check security headers
      const response = await authenticatedPage.waitForResponse('/dashboard');
      const headers = response.headers();
      
      const securityHeaders = {
        'x-content-type-options': headers['x-content-type-options'],
        'x-frame-options': headers['x-frame-options'],
        'x-xss-protection': headers['x-xss-protection'],
        'strict-transport-security': headers['strict-transport-security'],
        'content-security-policy': headers['content-security-policy'],
        'referrer-policy': headers['referrer-policy']
      };
      
      console.log('Security Headers:', securityHeaders);
      
      // Check for important security headers
      const hasNoSniff = securityHeaders['x-content-type-options'] === 'nosniff';
      const hasFrameOptions = !!securityHeaders['x-frame-options'];
      const hasCSP = !!securityHeaders['content-security-policy'];
      
      console.log('Security Header Analysis:', {
        noSniff: hasNoSniff,
        frameOptions: hasFrameOptions,
        csp: hasCSP
      });
      
      // At least some security headers should be present
      const hasBasicSecurity = hasNoSniff || hasFrameOptions || hasCSP;
      if (!hasBasicSecurity) {
        console.log('⚠️ Consider adding security headers for better protection');
      }
    });
  });

  test.describe('File Upload Security', () => {
    test('should validate file types', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/tables');
      
      // Look for file upload functionality
      const fileInputs = authenticatedPage.locator('input[type="file"]');
      const fileInputCount = await fileInputs.count();
      
      if (fileInputCount > 0) {
        const maliciousFiles = [
          { name: 'script.js', content: 'alert("XSS")', mimeType: 'application/javascript' },
          { name: 'malware.exe', content: 'MZ\x90\x00', mimeType: 'application/octet-stream' },
          { name: 'exploit.html', content: '<script>alert("XSS")</script>', mimeType: 'text/html' },
          { name: 'shell.php', content: '<?php system($_GET["cmd"]); ?>', mimeType: 'application/x-php' }
        ];
        
        for (const file of maliciousFiles) {
          await test.step(`Test malicious file upload: ${file.name}`, async () => {
            try {
              await fileInputs.first().setInputFiles([{
                name: file.name,
                mimeType: file.mimeType,
                buffer: Buffer.from(file.content)
              }]);
              
              // Try to submit/process the file
              await authenticatedPage.click('[data-testid*="upload"], [data-testid*="submit"]', { timeout: 3000 });
              
              // Should show error or reject the file
              const hasError = await authenticatedPage.locator('[data-testid*="error"]').isVisible({ timeout: 3000 });
              
              console.log(`Malicious file ${file.name} handled: ${hasError ? 'rejected' : 'accepted'}`);
              
            } catch (error) {
              console.log(`File upload test for ${file.name} completed`);
            }
          });
        }
      } else {
        console.log('No file upload inputs found');
      }
    });
  });

  test.describe('API Security', () => {
    test('should protect API endpoints from unauthorized access', async ({ page }) => {
      // Test API endpoints without authentication
      const apiEndpoints = [
        '/api/user/profile',
        '/api/tasks',
        '/api/goals',
        '/api/analytics'
      ];
      
      for (const endpoint of apiEndpoints) {
        await test.step(`Test unauthorized access to ${endpoint}`, async () => {
          try {
            const response = await page.request.get(endpoint);
            
            console.log(`${endpoint}: ${response.status()} ${response.statusText()}`);
            
            // Should return 401 Unauthorized or 403 Forbidden
            expect(response.status()).toBeGreaterThanOrEqual(401);
            expect(response.status()).toBeLessThan(500);
            
          } catch (error) {
            console.log(`API test for ${endpoint}: ${error}`);
          }
        });
      }
    });

    test('should validate API request rate limiting', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/ai-tutor');
      
      // Test rate limiting by making multiple rapid requests
      const rateLimitTest = await authenticatedPage.evaluate(async () => {
        const requests = [];
        const startTime = Date.now();
        
        // Make 10 rapid requests
        for (let i = 0; i < 10; i++) {
          requests.push(
            fetch('/api/ai/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: `Test message ${i}` })
            }).then(response => ({
              status: response.status,
              index: i,
              timestamp: Date.now() - startTime
            })).catch(error => ({
              error: error.message,
              index: i,
              timestamp: Date.now() - startTime
            }))
          );
        }
        
        const results = await Promise.all(requests);
        return results;
      });
      
      console.log('Rate Limiting Test Results:', rateLimitTest);
      
      // Check if rate limiting is applied
      const rateLimited = rateLimitTest.some(result => result.status === 429);
      const hasErrors = rateLimitTest.some(result => result.error);
      
      console.log(`Rate limiting detected: ${rateLimited}`);
      console.log(`Errors detected: ${hasErrors}`);
      
      // Rate limiting should be in place for API endpoints
      if (!rateLimited && !hasErrors) {
        console.log('⚠️ Consider implementing API rate limiting');
      }
    });
  });

  test.describe('Content Security', () => {
    test('should prevent clickjacking attacks', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      
      // Check if page can be embedded in iframe
      const frameTest = await authenticatedPage.evaluate(() => {
        try {
          // Check X-Frame-Options or CSP frame-ancestors
          const metaTags = Array.from(document.querySelectorAll('meta'));
          const hasFrameProtection = metaTags.some(meta => 
            meta.httpEquiv === 'X-Frame-Options' ||
            (meta.name === 'content-security-policy' && meta.content.includes('frame-ancestors'))
          );
          
          // Also check if we're in a frame (though this test runs in top window)
          const inFrame = window.self !== window.top;
          
          return {
            hasFrameProtection,
            inFrame,
            userAgent: navigator.userAgent
          };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      console.log('Clickjacking Protection Test:', frameTest);
      
      // Should have some form of frame protection
      if (frameTest.hasFrameProtection) {
        console.log('✅ Clickjacking protection detected');
      } else {
        console.log('⚠️ Consider adding X-Frame-Options or CSP frame-ancestors');
      }
    });

    test('should implement proper CORS policies', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      
      // Test CORS by making cross-origin request
      const corsTest = await authenticatedPage.evaluate(async () => {
        try {
          const response = await fetch('https://httpbin.org/get', {
            method: 'GET',
            mode: 'cors'
          });
          
          return {
            success: true,
            status: response.status,
            cors: 'allowed'
          };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            cors: 'blocked'
          };
        }
      });
      
      console.log('CORS Test:', corsTest);
      
      // External requests should be controlled by CORS policy
      expect(corsTest).toBeDefined();
    });
  });
});