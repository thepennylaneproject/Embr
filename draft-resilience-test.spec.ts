import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3004';
const TEST_CREDENTIALS = {
  email: 'creator@embr.app',
  password: 'test1234'
};

interface TestResult {
  check: string;
  result: 'PASS' | 'FAIL';
  evidence: string;
}

const results: TestResult[] = [];

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

test.describe('Draft Restore and Unsaved Change Guard Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(15000);
    const loggedIn = await login(page);
    if (!loggedIn) {
      throw new Error('Login prerequisite failed');
    }
  });

  test('1) /create: draft restore after refresh', async ({ page }) => {
    const uniqueText = `Draft test ${Date.now()}`;
    
    // Navigate to /create (assuming this is the post creation page)
    await page.goto(`${BASE_URL}/create`);
    await page.waitForLoadState('networkidle');
    
    // Find textarea or contenteditable and type unique text
    const textArea = page.locator('textarea, [contenteditable="true"]').first();
    await textArea.fill(uniqueText);
    
    // Wait for draft to be saved (assuming debounce)
    await page.waitForTimeout(2000);
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait for draft restoration
    await page.waitForTimeout(2000);
    
    // Check if text is restored
    const restoredTextArea = page.locator('textarea, [contenteditable="true"]').first();
    const restoredValue = await restoredTextArea.inputValue().catch(async () => {
      return await restoredTextArea.textContent() || '';
    });
    
    // Look for any restoration message
    const messages = await page.locator('[role="alert"], [class*="toast"], [class*="notification"]').allTextContents();
    const hasRestoreMessage = messages.some(msg => 
      msg.toLowerCase().includes('draft') || 
      msg.toLowerCase().includes('restore') || 
      msg.toLowerCase().includes('recovered')
    );
    
    const isDraftRestored = restoredValue.includes(uniqueText);
    
    results.push({
      check: '/create: draft restore',
      result: isDraftRestored ? 'PASS' : 'FAIL',
      evidence: isDraftRestored 
        ? `Text restored: "${restoredValue.substring(0, 50)}..." | Message: ${hasRestoreMessage ? messages.join(', ') : 'none'}` 
        : `Text NOT restored. Found: "${restoredValue}"`
    });
  });

  test('2) /events/create: draft restore after refresh', async ({ page }) => {
    const uniqueTitle = `Event ${Date.now()}`;
    const uniqueDescription = `Description ${Date.now()}`;
    
    await page.goto(`${BASE_URL}/events/create`);
    await page.waitForLoadState('networkidle');
    
    // Fill title
    const titleInput = page.locator('input[name="title"], input[id*="title"], input[placeholder*="title" i]').first();
    await titleInput.fill(uniqueTitle);
    
    // Fill description
    const descriptionInput = page.locator('textarea[name="description"], textarea[id*="description"]').first();
    await descriptionInput.fill(uniqueDescription);
    
    // Fill start date/time
    const startInput = page.locator('input[name*="start"], input[id*="start"]').first();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startValue = tomorrow.toISOString().slice(0, 16);
    await startInput.fill(startValue);
    
    // Fill end date/time
    const endInput = page.locator('input[name*="end"], input[id*="end"]').first();
    const dayAfter = new Date(tomorrow);
    dayAfter.setHours(dayAfter.getHours() + 2);
    const endValue = dayAfter.toISOString().slice(0, 16);
    await endInput.fill(endValue);
    
    await page.waitForTimeout(2000);
    
    // Refresh
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check restoration
    const restoredTitle = await titleInput.inputValue().catch(() => '');
    const restoredDescription = await descriptionInput.inputValue().catch(() => '');
    
    // Look for restoration message
    const messages = await page.locator('[role="alert"], [class*="toast"], [class*="notification"]').allTextContents();
    const hasRestoreMessage = messages.some(msg => 
      msg.toLowerCase().includes('draft') || 
      msg.toLowerCase().includes('restore') || 
      msg.toLowerCase().includes('recovered')
    );
    
    const isRestored = restoredTitle.includes(uniqueTitle) && restoredDescription.includes(uniqueDescription);
    
    results.push({
      check: '/events/create: draft restore',
      result: isRestored ? 'PASS' : 'FAIL',
      evidence: isRestored 
        ? `Title/Description restored | Message: ${hasRestoreMessage ? messages.join(', ') : 'none'}`
        : `NOT restored. Title: "${restoredTitle}", Desc: "${restoredDescription}"`
    });
  });

  test('3) /groups/create: multi-step draft restore', async ({ page }) => {
    const uniqueName = `Group ${Date.now()}`;
    const uniqueTag = `tag${Date.now()}`;
    
    await page.goto(`${BASE_URL}/groups/create`);
    await page.waitForLoadState('networkidle');
    
    // Step 1: Fill group name
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    await nameInput.fill(uniqueName);
    
    // Try to go to step 2 if there's a next/continue button
    const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
    const hasNextButton = await nextButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasNextButton) {
      await nextButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Step 2: Try to add a tag or additional field
    const tagInput = page.locator('input[name*="tag"], input[placeholder*="tag" i]').first();
    const hasTagInput = await tagInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasTagInput) {
      await tagInput.fill(uniqueTag);
    }
    
    await page.waitForTimeout(2000);
    
    // Refresh
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check restoration
    const restoredName = await nameInput.inputValue().catch(() => '');
    let restoredTag = '';
    
    if (hasTagInput && hasNextButton) {
      // If multi-step, might need to navigate to step 2 again
      const nextAgain = await nextButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (nextAgain) {
        await nextButton.click();
        await page.waitForTimeout(1000);
      }
      restoredTag = await tagInput.inputValue().catch(() => '');
    }
    
    // Look for restoration message
    const messages = await page.locator('[role="alert"], [class*="toast"], [class*="notification"]').allTextContents();
    const hasRestoreMessage = messages.some(msg => 
      msg.toLowerCase().includes('draft') || 
      msg.toLowerCase().includes('restore') || 
      msg.toLowerCase().includes('recovered')
    );
    
    const isNameRestored = restoredName.includes(uniqueName);
    const currentStep = await page.locator('[class*="step"], [data-step]').textContent().catch(() => '');
    
    results.push({
      check: '/groups/create: multi-step restore',
      result: isNameRestored ? 'PASS' : 'FAIL',
      evidence: isNameRestored 
        ? `Name restored: "${restoredName}" | Tag: "${restoredTag}" | Step: "${currentStep}" | Message: ${hasRestoreMessage ? messages.join(', ') : 'none'}`
        : `NOT restored. Name: "${restoredName}"`
    });
  });

  test('4) /marketplace/sell: multi-step draft restore', async ({ page }) => {
    const uniqueTitle = `Listing ${Date.now()}`;
    const uniquePrice = '99.99';
    
    await page.goto(`${BASE_URL}/marketplace/sell`);
    await page.waitForLoadState('networkidle');
    
    // Step 1: Fill basic info
    const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]').first();
    await titleInput.fill(uniqueTitle);
    
    const priceInput = page.locator('input[name="price"], input[type="number"], input[placeholder*="price" i]').first();
    await priceInput.fill(uniquePrice);
    
    // Try to go to step 2
    const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
    const hasNextButton = await nextButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasNextButton) {
      await nextButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Step 2: Fill description or other fields
    const descriptionInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i]').first();
    const hasDescription = await descriptionInput.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasDescription) {
      await descriptionInput.fill('Test description');
    }
    
    // Try to go to step 3
    const next2Button = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
    const hasNext2 = await next2Button.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasNext2) {
      await next2Button.click();
      await page.waitForTimeout(1000);
    }
    
    await page.waitForTimeout(2000);
    
    // Refresh
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check restoration
    const restoredTitle = await titleInput.inputValue().catch(() => '');
    const restoredPrice = await priceInput.inputValue().catch(() => '');
    
    // Check current step
    const stepIndicator = await page.locator('[class*="step"], [data-step], [aria-current="step"]').textContent().catch(() => '');
    
    // Look for restoration message
    const messages = await page.locator('[role="alert"], [class*="toast"], [class*="notification"]').allTextContents();
    const hasRestoreMessage = messages.some(msg => 
      msg.toLowerCase().includes('draft') || 
      msg.toLowerCase().includes('restore') || 
      msg.toLowerCase().includes('recovered')
    );
    
    const isRestored = restoredTitle.includes(uniqueTitle) || restoredPrice.includes(uniquePrice);
    
    results.push({
      check: '/marketplace/sell: multi-step restore',
      result: isRestored ? 'PASS' : 'FAIL',
      evidence: isRestored 
        ? `Title/Price restored | Step: "${stepIndicator}" | Message: ${hasRestoreMessage ? messages.join(', ') : 'none'}`
        : `NOT restored. Title: "${restoredTitle}", Price: "${restoredPrice}"`
    });
  });

  test('5) Browser leave warning on unsaved changes', async ({ page }) => {
    await page.goto(`${BASE_URL}/events/create`);
    await page.waitForLoadState('networkidle');
    
    // Fill a field to create unsaved changes
    const titleInput = page.locator('input[name="title"], input[id*="title"], input[placeholder*="title" i]').first();
    await titleInput.fill('Unsaved test');
    
    await page.waitForTimeout(1000);
    
    // Set up dialog listener BEFORE triggering navigation
    let dialogAppeared = false;
    let dialogMessage = '';
    
    page.on('dialog', async dialog => {
      dialogAppeared = true;
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });
    
    // Try to navigate away
    try {
      await page.goto(`${BASE_URL}/`);
      await page.waitForTimeout(1000);
    } catch (e) {
      // Navigation might be blocked
    }
    
    results.push({
      check: 'Browser leave warning',
      result: dialogAppeared ? 'PASS' : 'FAIL',
      evidence: dialogAppeared 
        ? `Dialog appeared with message: "${dialogMessage}"` 
        : 'No beforeunload dialog detected'
    });
  });

  test.afterAll(async () => {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║        DRAFT RESTORE & UNSAVED CHANGE GUARD RESULTS             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    console.log('| Check                               | Result | Evidence');
    console.log('|-------------------------------------|--------|----------------------------------');
    
    results.forEach(r => {
      const paddedCheck = r.check.padEnd(35);
      const paddedResult = r.result.padEnd(6);
      console.log(`| ${paddedCheck} | ${paddedResult} | ${r.evidence}`);
    });
    
    console.log('\n');
    
    const passCount = results.filter(r => r.result === 'PASS').length;
    const failCount = results.filter(r => r.result === 'FAIL').length;
    
    console.log(`Summary: ${passCount} PASS, ${failCount} FAIL\n`);
  });
});
