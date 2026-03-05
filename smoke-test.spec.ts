import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3004';
const TEST_CREDENTIALS = {
  email: 'creator@embr.app',
  password: 'test1234'
};

interface JourneyResult {
  name: string;
  status: 'PASS' | 'SOFT FAIL' | 'HARD FAIL';
  steps: Array<{
    action: string;
    result: string;
    uiMessages?: string[];
    screenshot?: string;
  }>;
  blockers?: string[];
  notes?: string[];
}

const results: JourneyResult[] = [];

async function captureUIMessages(page: Page): Promise<string[]> {
  const messages: string[] = [];
  
  const toasts = await page.locator('[role="alert"], [class*="toast"], [class*="notification"], [class*="snackbar"]').allTextContents();
  messages.push(...toasts.filter(t => t.trim()));
  
  const errors = await page.locator('[class*="error"], [role="alert"][aria-live="assertive"]').allTextContents();
  messages.push(...errors.filter(e => e.trim()));
  
  return messages;
}

async function login(page: Page): Promise<boolean> {
  try {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    const emailInput = page.locator('input[type="email"], input[name="email"], input[id*="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id*="password"]').first();
    
    await emailInput.fill(TEST_CREDENTIALS.email);
    await passwordInput.fill(TEST_CREDENTIALS.password);
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first();
    await submitButton.click();
    
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
    
    return true;
  } catch (error) {
    console.error('Login failed:', error);
    return false;
  }
}

test.describe('Embr Smoke Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(15000);
  });

  test('Journey 1: Login -> Feed -> Create Text Post', async ({ page }) => {
    const journey: JourneyResult = {
      name: 'Journey 1: Login -> Feed -> Create Text Post',
      status: 'PASS',
      steps: [],
      blockers: []
    };

    try {
      journey.steps.push({
        action: 'Navigate to login page',
        result: 'Success',
        uiMessages: []
      });
      
      await page.goto(`${BASE_URL}/auth/login`);
      await page.waitForLoadState('networkidle');
      
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      
      await emailInput.fill(TEST_CREDENTIALS.email);
      await passwordInput.fill(TEST_CREDENTIALS.password);
      
      journey.steps.push({
        action: 'Fill login credentials',
        result: 'Credentials entered',
        uiMessages: []
      });
      
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      
      await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });
      const currentUrl = page.url();
      
      journey.steps.push({
        action: 'Submit login form',
        result: `Redirected to: ${currentUrl}`,
        uiMessages: await captureUIMessages(page)
      });
      
      const cookies = await page.context().cookies();
      const hasAuthCookie = cookies.some(c => c.name === 'accessToken' || c.name.includes('auth') || c.name.includes('token'));
      
      if (!hasAuthCookie) {
        journey.status = 'SOFT FAIL';
        journey.blockers?.push('No auth cookie detected after login');
      }
      
      await page.waitForTimeout(2000);
      
      const postCreatorButton = page.locator('button:has-text("Post"), button:has-text("Create"), textarea, [contenteditable="true"]').first();
      const isVisible = await postCreatorButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (!isVisible) {
        journey.status = 'SOFT FAIL';
        journey.blockers?.push('Post creator not visible on feed');
      }
      
      journey.steps.push({
        action: 'Verify feed access',
        result: isVisible ? 'Feed loaded, post creator visible' : 'Feed loaded, post creator NOT visible',
        uiMessages: []
      });
      
      const textContent = `Test post created at ${new Date().toISOString()}`;
      
      const textArea = page.locator('textarea, [contenteditable="true"]').first();
      await textArea.click();
      await textArea.fill(textContent);
      
      journey.steps.push({
        action: 'Enter post content',
        result: `Entered: "${textContent.substring(0, 50)}..."`,
        uiMessages: []
      });
      
      const publishButton = page.locator('button:has-text("Post"), button:has-text("Publish"), button:has-text("Submit")').first();
      await publishButton.click();
      
      await page.waitForTimeout(3000);
      
      const uiMessages = await captureUIMessages(page);
      journey.steps.push({
        action: 'Submit post',
        result: 'Post submitted',
        uiMessages
      });
      
      const postExists = await page.locator(`text="${textContent}"`).first().isVisible({ timeout: 5000 }).catch(() => false);
      
      if (postExists) {
        journey.steps.push({
          action: 'Verify post in feed',
          result: 'Post visible in feed - SUCCESS',
          uiMessages: []
        });
      } else {
        journey.status = 'SOFT FAIL';
        journey.blockers?.push('Post not visible in feed after submission');
      }
      
    } catch (error) {
      journey.status = 'HARD FAIL';
      journey.blockers?.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    }

    results.push(journey);
  });

  test('Journey 2: Create Event -> Publish -> Open Detail', async ({ page }) => {
    const journey: JourneyResult = {
      name: 'Journey 2: Create Event -> Publish -> Open Detail',
      status: 'PASS',
      steps: [],
      blockers: []
    };

    try {
      const loggedIn = await login(page);
      if (!loggedIn) {
        journey.status = 'HARD FAIL';
        journey.blockers?.push('Login prerequisite failed');
        results.push(journey);
        return;
      }

      journey.steps.push({
        action: 'Login',
        result: 'Logged in successfully',
        uiMessages: []
      });

      await page.goto(`${BASE_URL}/events/create`);
      await page.waitForLoadState('networkidle');

      journey.steps.push({
        action: 'Navigate to event creation',
        result: `Loaded: ${page.url()}`,
        uiMessages: []
      });

      const titleInput = page.locator('input[name="title"], input[id*="title"], input[placeholder*="title" i]').first();
      const descriptionInput = page.locator('textarea[name="description"], textarea[id*="description"]').first();
      const dateInput = page.locator('input[type="date"], input[type="datetime-local"], input[name*="date"]').first();

      await titleInput.fill(`Test Event ${Date.now()}`);
      await descriptionInput.fill('This is a test event created during smoke testing.');
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      await dateInput.fill(dateString);

      journey.steps.push({
        action: 'Fill minimum required fields',
        result: 'Title, description, and date filled',
        uiMessages: []
      });

      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Publish")').first();
      await submitButton.click();

      await page.waitForTimeout(3000);

      const uiMessages = await captureUIMessages(page);
      journey.steps.push({
        action: 'Submit event creation',
        result: 'Form submitted',
        uiMessages
      });

      const currentUrl = page.url();
      const isDetailPage = currentUrl.includes('/events/') && !currentUrl.includes('/create');

      if (isDetailPage) {
        journey.steps.push({
          action: 'Navigate to event detail',
          result: `Redirected to detail page: ${currentUrl}`,
          uiMessages: []
        });
      } else {
        journey.status = 'SOFT FAIL';
        journey.blockers?.push('Did not redirect to event detail page after creation');
      }

    } catch (error) {
      journey.status = 'HARD FAIL';
      journey.blockers?.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    }

    results.push(journey);
  });

  test('Journey 3: Groups Discovery -> Join -> Verify Membership', async ({ page }) => {
    const journey: JourneyResult = {
      name: 'Journey 3: Groups Discovery -> Join -> Verify Membership',
      status: 'PASS',
      steps: [],
      blockers: []
    };

    try {
      const loggedIn = await login(page);
      if (!loggedIn) {
        journey.status = 'HARD FAIL';
        journey.blockers?.push('Login prerequisite failed');
        results.push(journey);
        return;
      }

      journey.steps.push({
        action: 'Login',
        result: 'Logged in successfully',
        uiMessages: []
      });

      await page.goto(`${BASE_URL}/groups`);
      await page.waitForLoadState('networkidle');

      journey.steps.push({
        action: 'Navigate to groups discovery',
        result: 'Groups page loaded',
        uiMessages: []
      });

      const groupCards = page.locator('[class*="group"], [data-testid*="group"]').first();
      const hasGroups = await groupCards.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasGroups) {
        journey.status = 'SOFT FAIL';
        journey.blockers?.push('No groups visible for discovery');
        results.push(journey);
        return;
      }

      const joinButton = page.locator('button:has-text("Join"), button:has-text("Request")').first();
      const joinButtonExists = await joinButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (!joinButtonExists) {
        journey.status = 'SOFT FAIL';
        journey.blockers?.push('No join/request buttons found on group cards');
        results.push(journey);
        return;
      }

      await joinButton.click();
      await page.waitForTimeout(2000);

      const uiMessages = await captureUIMessages(page);
      journey.steps.push({
        action: 'Click join/request button',
        result: 'Button clicked',
        uiMessages
      });

      const membershipIndicators = page.locator('text=/member|joined|pending|requested/i').first();
      const hasMembershipState = await membershipIndicators.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasMembershipState) {
        journey.steps.push({
          action: 'Verify membership state',
          result: 'Membership state visible in UI',
          uiMessages: []
        });
      } else {
        journey.status = 'SOFT FAIL';
        journey.blockers?.push('Membership state not clearly indicated after join/request');
      }

    } catch (error) {
      journey.status = 'HARD FAIL';
      journey.blockers?.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    }

    results.push(journey);
  });

  test('Journey 4: Marketplace -> Add to Cart -> Checkout (Server Response Validation)', async ({ page }) => {
    const journey: JourneyResult = {
      name: 'Journey 4: Marketplace -> Checkout Integrity',
      status: 'PASS',
      steps: [],
      blockers: []
    };

    try {
      const loggedIn = await login(page);
      if (!loggedIn) {
        journey.status = 'HARD FAIL';
        journey.blockers?.push('Login prerequisite failed');
        results.push(journey);
        return;
      }

      journey.steps.push({
        action: 'Login',
        result: 'Logged in successfully',
        uiMessages: []
      });

      await page.goto(`${BASE_URL}/marketplace`);
      await page.waitForLoadState('networkidle');

      journey.steps.push({
        action: 'Navigate to marketplace',
        result: 'Marketplace loaded',
        uiMessages: []
      });

      const listingCard = page.locator('[class*="listing"], [data-testid*="listing"], a[href*="/marketplace/"]').first();
      const hasListings = await listingCard.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasListings) {
        journey.status = 'SOFT FAIL';
        journey.blockers?.push('No marketplace listings available');
        results.push(journey);
        return;
      }

      await listingCard.click();
      await page.waitForLoadState('networkidle');

      journey.steps.push({
        action: 'Open listing detail',
        result: `Opened detail: ${page.url()}`,
        uiMessages: []
      });

      const addToCartButton = page.locator('button:has-text("Add to Cart"), button:has-text("Add to Bag")').first();
      const hasAddButton = await addToCartButton.isVisible({ timeout: 3000 }).catch(() => false);

      if (!hasAddButton) {
        journey.status = 'SOFT FAIL';
        journey.blockers?.push('No "Add to Cart" button found on listing detail');
        results.push(journey);
        return;
      }

      await addToCartButton.click();
      await page.waitForTimeout(2000);

      journey.steps.push({
        action: 'Add to cart',
        result: 'Item added to cart',
        uiMessages: await captureUIMessages(page)
      });

      const checkoutButton = page.locator('button:has-text("Checkout"), a[href*="checkout"]').first();
      await checkoutButton.click();
      await page.waitForLoadState('networkidle');

      journey.steps.push({
        action: 'Navigate to checkout',
        result: `Checkout page: ${page.url()}`,
        uiMessages: []
      });

      let responsePromise = page.waitForResponse(
        response => response.url().includes('/api/') && response.request().method() === 'POST',
        { timeout: 15000 }
      ).catch(() => null);

      const submitCheckoutButton = page.locator('button[type="submit"], button:has-text("Place Order"), button:has-text("Submit")').first();
      await submitCheckoutButton.click();

      const response = await responsePromise;

      if (response) {
        const status = response.status();
        const responseBody = await response.text().catch(() => '');
        
        journey.steps.push({
          action: 'Submit checkout',
          result: `Server response: ${status}`,
          uiMessages: await captureUIMessages(page)
        });

        const showsFakeSuccess = await page.locator('text=/success|confirmed|complete/i').first().isVisible({ timeout: 2000 }).catch(() => false);
        
        if (showsFakeSuccess && (status >= 400 || responseBody.includes('error'))) {
          journey.status = 'HARD FAIL';
          journey.blockers?.push('CRITICAL: Shows fake success despite server error/rejection');
        } else if (status >= 200 && status < 300) {
          journey.steps.push({
            action: 'Validate checkout integrity',
            result: 'Server confirmed success, UI reflects server state - PASS',
            uiMessages: []
          });
        }
      } else {
        journey.status = 'SOFT FAIL';
        journey.blockers?.push('Could not capture server response for checkout submission');
      }

    } catch (error) {
      journey.status = 'HARD FAIL';
      journey.blockers?.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    }

    results.push(journey);
  });

  test('Journey 5: Draft Resilience Check', async ({ page }) => {
    const journey: JourneyResult = {
      name: 'Journey 5: Draft Resilience Check',
      status: 'PASS',
      steps: [],
      blockers: []
    };

    try {
      const loggedIn = await login(page);
      if (!loggedIn) {
        journey.status = 'HARD FAIL';
        journey.blockers?.push('Login prerequisite failed');
        results.push(journey);
        return;
      }

      journey.steps.push({
        action: 'Login',
        result: 'Logged in successfully',
        uiMessages: []
      });

      const testForms = [
        { name: 'Post', url: '/', selector: 'textarea, [contenteditable="true"]', testData: 'Draft post content test' },
        { name: 'Event', url: '/events/create', selector: 'input[name="title"]', testData: 'Draft event title' },
        { name: 'Group', url: '/groups/create', selector: 'input[name="name"], input[placeholder*="name" i]', testData: 'Draft group name' },
      ];

      let passCount = 0;
      let failCount = 0;

      for (const form of testForms) {
        try {
          await page.goto(`${BASE_URL}${form.url}`);
          await page.waitForLoadState('networkidle');

          const input = page.locator(form.selector).first();
          await input.fill(form.testData);

          await page.waitForTimeout(1000);

          journey.steps.push({
            action: `Enter data in ${form.name} form`,
            result: `Filled: "${form.testData}"`,
            uiMessages: []
          });

          await page.reload();
          await page.waitForLoadState('networkidle');

          await page.waitForTimeout(2000);

          const restoredInput = page.locator(form.selector).first();
          const restoredValue = await restoredInput.inputValue().catch(() => '');

          const isDraftRestored = restoredValue.includes(form.testData);

          journey.steps.push({
            action: `Refresh ${form.name} form and check restoration`,
            result: isDraftRestored ? `Draft RESTORED: "${restoredValue}"` : 'Draft NOT restored',
            uiMessages: []
          });

          if (isDraftRestored) {
            passCount++;
          } else {
            failCount++;
          }

        } catch (error) {
          failCount++;
          journey.steps.push({
            action: `Test ${form.name} draft resilience`,
            result: `Error: ${error instanceof Error ? error.message : String(error)}`,
            uiMessages: []
          });
        }
      }

      if (failCount > 0) {
        journey.status = failCount === testForms.length ? 'HARD FAIL' : 'SOFT FAIL';
        journey.blockers?.push(`${failCount} of ${testForms.length} forms failed draft restoration`);
      }

    } catch (error) {
      journey.status = 'HARD FAIL';
      journey.blockers?.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    }

    results.push(journey);
  });

  test('Failure Checks: Invalid Forms & Error Recovery', async ({ page }) => {
    const journey: JourneyResult = {
      name: 'Failure Checks: Invalid Forms & Error Recovery',
      status: 'PASS',
      steps: [],
      blockers: []
    };

    try {
      const loggedIn = await login(page);
      if (!loggedIn) {
        journey.status = 'HARD FAIL';
        journey.blockers?.push('Login prerequisite failed');
        results.push(journey);
        return;
      }

      await page.goto(`${BASE_URL}/events/create`);
      await page.waitForLoadState('networkidle');

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      await page.waitForTimeout(2000);

      const errorMessages = await captureUIMessages(page);
      const validationErrors = page.locator('[class*="error"], [role="alert"]');
      const hasErrors = await validationErrors.count() > 0 || errorMessages.length > 0;

      journey.steps.push({
        action: 'Submit empty event form',
        result: hasErrors ? 'Validation errors displayed' : 'No validation errors shown',
        uiMessages: errorMessages
      });

      if (!hasErrors) {
        journey.status = 'SOFT FAIL';
        journey.blockers?.push('No validation errors shown for empty form submission');
      }

      const errorText = errorMessages.join(' ');
      const isHumanReadable = !/undefined|null|\[object|error:/.test(errorText.toLowerCase());

      if (errorMessages.length > 0 && !isHumanReadable) {
        journey.status = 'SOFT FAIL';
        journey.blockers?.push('Error messages are not human-readable');
      }

      journey.steps.push({
        action: 'Verify error message quality',
        result: isHumanReadable ? 'Errors are human-readable' : 'Errors contain technical jargon/undefined values',
        uiMessages: []
      });

    } catch (error) {
      journey.status = 'HARD FAIL';
      journey.blockers?.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    }

    results.push(journey);
  });

  test('Auth Redirect with Next Path', async ({ page }) => {
    const journey: JourneyResult = {
      name: 'Auth Redirect: Next Path Preservation',
      status: 'PASS',
      steps: [],
      blockers: []
    };

    try {
      const protectedUrl = `${BASE_URL}/events/create`;
      
      await page.goto(protectedUrl);
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      const redirectedToLogin = currentUrl.includes('/auth/login');

      journey.steps.push({
        action: 'Access protected route without auth',
        result: redirectedToLogin ? 'Redirected to login' : 'Not redirected (may already be logged in)',
        uiMessages: []
      });

      if (redirectedToLogin) {
        const hasNextParam = currentUrl.includes('next=') || currentUrl.includes('redirect=');
        
        journey.steps.push({
          action: 'Check for next parameter',
          result: hasNextParam ? 'Next parameter present in URL' : 'No next parameter found',
          uiMessages: []
        });

        const emailInput = page.locator('input[type="email"]').first();
        const passwordInput = page.locator('input[type="password"]').first();
        
        await emailInput.fill(TEST_CREDENTIALS.email);
        await passwordInput.fill(TEST_CREDENTIALS.password);
        
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();

        await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 10000 });

        const finalUrl = page.url();
        const redirectedBack = finalUrl.includes('/events/create');

        journey.steps.push({
          action: 'Login and verify redirect',
          result: redirectedBack ? `Redirected back to: ${finalUrl}` : `Redirected to: ${finalUrl} (not original destination)`,
          uiMessages: []
        });

        if (!redirectedBack) {
          journey.status = 'SOFT FAIL';
          journey.blockers?.push('Did not redirect back to original protected route after login');
        }
      } else {
        journey.status = 'SOFT FAIL';
        journey.notes = ['Could not test - user may already be authenticated'];
      }

    } catch (error) {
      journey.status = 'HARD FAIL';
      journey.blockers?.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    }

    results.push(journey);
  });

  test.afterAll(async () => {
    const report = generateReport(results);
    
    const reportPath = path.join(__dirname, 'smoke-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    const textReportPath = path.join(__dirname, 'smoke-test-report.txt');
    fs.writeFileSync(textReportPath, report);
    
    console.log('\n' + '='.repeat(80));
    console.log(report);
    console.log('='.repeat(80));
  });
});

function generateReport(results: JourneyResult[]): string {
  let report = '\n╔════════════════════════════════════════════════════════════════════════════╗\n';
  report += '║                    EMBR SMOKE TEST REPORT                                  ║\n';
  report += '╚════════════════════════════════════════════════════════════════════════════╝\n\n';

  results.forEach((journey, idx) => {
    report += `\n${idx + 1}. ${journey.name}\n`;
    report += `   Status: ${journey.status}\n`;
    report += `   ─────────────────────────────────────────────────────────────────────────\n`;
    
    journey.steps.forEach((step, stepIdx) => {
      report += `   ${stepIdx + 1}) ${step.action}\n`;
      report += `      → ${step.result}\n`;
      if (step.uiMessages && step.uiMessages.length > 0) {
        report += `      UI: "${step.uiMessages.join('", "')}"\n`;
      }
    });
    
    if (journey.blockers && journey.blockers.length > 0) {
      report += `\n   ⚠️  BLOCKERS:\n`;
      journey.blockers.forEach(blocker => {
        report += `      • ${blocker}\n`;
      });
    }
    
    if (journey.notes && journey.notes.length > 0) {
      report += `\n   📝 NOTES:\n`;
      journey.notes.forEach(note => {
        report += `      • ${note}\n`;
      });
    }
    
    report += '\n';
  });

  report += '\n╔════════════════════════════════════════════════════════════════════════════╗\n';
  report += '║                    LAUNCH GATE VERDICT SUMMARY                             ║\n';
  report += '╚════════════════════════════════════════════════════════════════════════════╝\n\n';

  const checkoutJourney = results.find(r => r.name.includes('Checkout'));
  const checkoutIntegrity = checkoutJourney?.blockers?.some(b => b.includes('fake success')) ? '❌ FAIL' : '✅ PASS';
  report += `  • Checkout Integrity: ${checkoutIntegrity}\n`;
  
  const authJourney = results.find(r => r.name.includes('Login') || r.name.includes('Auth'));
  const authConsistency = authJourney?.status === 'PASS' ? '✅ PASS' : '⚠️  SOFT FAIL';
  report += `  • Auth Consistency: ${authConsistency}\n`;
  
  const draftJourney = results.find(r => r.name.includes('Draft'));
  const draftRestore = draftJourney?.status === 'PASS' ? '✅ PASS' : draftJourney?.status === 'SOFT FAIL' ? '⚠️  SOFT FAIL' : '❌ FAIL';
  report += `  • Draft Restore: ${draftRestore}\n`;
  
  const groupsJourney = results.find(r => r.name.includes('Groups'));
  const permissionClarity = groupsJourney?.blockers?.some(b => b.includes('state')) ? '⚠️  SOFT FAIL' : '✅ PASS';
  report += `  • Permission Clarity: ${permissionClarity}\n`;
  
  const failureJourney = results.find(r => r.name.includes('Failure'));
  const errorRecovery = failureJourney?.status === 'PASS' ? '✅ PASS' : '⚠️  SOFT FAIL';
  report += `  • Error Recovery: ${errorRecovery}\n`;
  
  const hasCriticalFails = results.some(r => r.blockers?.some(b => b.includes('CRITICAL')));
  const demoSafe = hasCriticalFails ? '❌ FAIL' : '✅ PASS';
  report += `  • Demo-Safe Behavior: ${demoSafe}\n`;

  const passCount = results.filter(r => r.status === 'PASS').length;
  const softFailCount = results.filter(r => r.status === 'SOFT FAIL').length;
  const hardFailCount = results.filter(r => r.status === 'HARD FAIL').length;

  report += `\n  Summary: ${passCount} PASS, ${softFailCount} SOFT FAIL, ${hardFailCount} HARD FAIL\n`;
  
  if (hardFailCount > 0) {
    report += `\n  ⛔ LAUNCH BLOCKER: ${hardFailCount} critical failure(s) detected\n`;
  } else if (softFailCount > 0) {
    report += `\n  ⚠️  LAUNCH RISK: ${softFailCount} soft failure(s) - review recommended\n`;
  } else {
    report += `\n  ✅ ALL CHECKS PASSED - Ready for launch\n`;
  }

  return report;
}
