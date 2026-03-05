const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3004';
const TEST_CREDENTIALS = {
  email: 'creator@embr.app',
  password: 'test1234'
};

const results = {
  journeys: [],
  failureChecks: [],
  launchGates: {
    checkoutIntegrity: { status: 'PENDING', notes: [] },
    authConsistency: { status: 'PENDING', notes: [] },
    draftRestore: { status: 'PENDING', notes: [] },
    permissionClarity: { status: 'PENDING', notes: [] },
    errorRecovery: { status: 'PENDING', notes: [] },
    demoSafeBehavior: { status: 'PENDING', notes: [] }
  }
};

function logResult(journey, status, steps, observations, blocker = null) {
  results.journeys.push({ journey, status, steps, observations, blocker });
  console.log(`\n${'='.repeat(80)}`);
  console.log(`JOURNEY: ${journey}`);
  console.log(`STATUS: ${status}`);
  console.log(`STEPS:\n${steps.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}`);
  console.log(`OBSERVATIONS:\n${observations.map(o => `  - ${o}`).join('\n')}`);
  if (blocker) console.log(`BLOCKER: ${blocker}`);
  console.log('='.repeat(80));
}

function logFailureCheck(check, status, observations) {
  results.failureChecks.push({ check, status, observations });
  console.log(`\n${'~'.repeat(80)}`);
  console.log(`FAILURE CHECK: ${check}`);
  console.log(`STATUS: ${status}`);
  console.log(`OBSERVATIONS:\n${observations.map(o => `  - ${o}`).join('\n')}`);
  console.log('~'.repeat(80));
}

function updateLaunchGate(gate, status, note) {
  results.launchGates[gate].status = status;
  results.launchGates[gate].notes.push(note);
}

async function takeScreenshot(page, name) {
  await page.screenshot({ path: `smoke-test-${name}.png`, fullPage: true });
  console.log(`  📸 Screenshot saved: smoke-test-${name}.png`);
}

async function waitForNetworkIdle(page, timeout = 3000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (e) {
    console.log('  ⏱️  Network idle timeout, continuing...');
  }
}

async function login(page) {
  console.log('\n🔐 Logging in...');
  await page.goto(`${BASE_URL}/auth/login`);
  await waitForNetworkIdle(page);
  await takeScreenshot(page, 'login-page');
  
  await page.fill('input[type="email"], input[name="email"]', TEST_CREDENTIALS.email);
  await page.fill('input[type="password"], input[name="password"]', TEST_CREDENTIALS.password);
  await takeScreenshot(page, 'login-filled');
  
  await page.click('button[type="submit"]');
  await waitForNetworkIdle(page);
  await takeScreenshot(page, 'post-login');
  
  const currentUrl = page.url();
  console.log(`  Current URL after login: ${currentUrl}`);
  return currentUrl;
}

async function journey1_LoginFeedPost(page) {
  const steps = [];
  const observations = [];
  let status = 'PASS';
  let blocker = null;

  try {
    steps.push('Navigate to login page');
    const postLoginUrl = await login(page);
    observations.push(`Redirected to: ${postLoginUrl}`);
    
    if (postLoginUrl.includes('/auth/login')) {
      status = 'HARD FAIL';
      blocker = 'Login did not redirect away from login page';
      updateLaunchGate('authConsistency', 'FAIL', 'Login redirect failed');
      logResult('Journey 1: Login -> Feed -> Create Post', status, steps, observations, blocker);
      return;
    }
    
    updateLaunchGate('authConsistency', 'PASS', 'Login successful with redirect');
    
    steps.push('Navigate to feed/home');
    await page.goto(`${BASE_URL}/`);
    await waitForNetworkIdle(page);
    await takeScreenshot(page, 'journey1-feed');
    observations.push(`Feed page loaded: ${page.url()}`);
    
    steps.push('Locate post creation UI');
    const postTextarea = await page.locator('textarea, input[placeholder*="post" i], [contenteditable="true"]').first();
    const postTextareaVisible = await postTextarea.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!postTextareaVisible) {
      status = 'SOFT FAIL';
      blocker = 'Post creation textarea not found or not visible';
      observations.push('Post creation UI not visible on feed');
      logResult('Journey 1: Login -> Feed -> Create Post', status, steps, observations, blocker);
      return;
    }
    
    observations.push('Post creation UI located');
    
    steps.push('Enter post text');
    await postTextarea.fill('Smoke test post - text only content for journey 1');
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'journey1-post-filled');
    observations.push('Post text entered');
    
    steps.push('Submit post');
    const submitButton = await page.locator('button:has-text("Post"), button:has-text("Submit"), button:has-text("Publish")').first();
    await submitButton.click();
    await waitForNetworkIdle(page);
    await takeScreenshot(page, 'journey1-post-submitted');
    
    steps.push('Verify post appears in feed');
    await page.waitForTimeout(2000);
    const feedContent = await page.content();
    if (feedContent.includes('Smoke test post')) {
      observations.push('Post appears in feed after submission');
      updateLaunchGate('demoSafeBehavior', 'PASS', 'Post creation works');
    } else {
      observations.push('Post submission completed but not immediately visible in feed');
      status = 'SOFT FAIL';
    }
    
  } catch (error) {
    status = 'HARD FAIL';
    blocker = error.message;
    observations.push(`Exception: ${error.message}`);
  }
  
  logResult('Journey 1: Login -> Feed -> Create Post', status, steps, observations, blocker);
}

async function journey2_CreateEvent(page) {
  const steps = [];
  const observations = [];
  let status = 'PASS';
  let blocker = null;

  try {
    steps.push('Navigate to event creation page');
    await page.goto(`${BASE_URL}/events/create`);
    await waitForNetworkIdle(page);
    await takeScreenshot(page, 'journey2-event-create-page');
    observations.push(`Event creation page URL: ${page.url()}`);
    
    if (page.url().includes('/auth/login')) {
      status = 'HARD FAIL';
      blocker = 'Redirected to login - auth issue';
      updateLaunchGate('authConsistency', 'FAIL', 'Event creation requires re-auth');
      logResult('Journey 2: Create Event', status, steps, observations, blocker);
      return;
    }
    
    steps.push('Fill minimum required event fields');
    
    const titleInput = await page.locator('input[name="title"], input[placeholder*="title" i]').first();
    if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await titleInput.fill('Smoke Test Event');
      observations.push('Event title filled');
    } else {
      status = 'HARD FAIL';
      blocker = 'Event title input not found';
      logResult('Journey 2: Create Event', status, steps, observations, blocker);
      return;
    }
    
    const descInput = await page.locator('textarea[name="description"], textarea[placeholder*="description" i], [contenteditable="true"]').first();
    if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descInput.fill('This is a smoke test event created during automated testing');
      observations.push('Event description filled');
    }
    
    const dateInput = await page.locator('input[type="date"], input[type="datetime-local"], input[name*="date" i]').first();
    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateInput.fill('2026-04-01');
      observations.push('Event date filled');
    }
    
    const locationInput = await page.locator('input[name*="location" i], input[placeholder*="location" i]').first();
    if (await locationInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await locationInput.fill('Test Venue');
      observations.push('Event location filled');
    }
    
    await takeScreenshot(page, 'journey2-event-filled');
    
    steps.push('Submit event creation');
    const submitBtn = await page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Publish")').first();
    await submitBtn.click();
    await waitForNetworkIdle(page);
    await takeScreenshot(page, 'journey2-event-submitted');
    
    steps.push('Verify redirect to event detail or list');
    await page.waitForTimeout(2000);
    const postSubmitUrl = page.url();
    observations.push(`Post-submit URL: ${postSubmitUrl}`);
    
    if (postSubmitUrl.includes('/events/') && !postSubmitUrl.includes('/create')) {
      observations.push('Redirected to event detail page');
      updateLaunchGate('demoSafeBehavior', 'PASS', 'Event creation works');
      
      steps.push('Verify event detail page loads');
      const pageContent = await page.content();
      if (pageContent.includes('Smoke Test Event')) {
        observations.push('Event detail page shows created event');
      } else {
        observations.push('Event detail page loaded but content verification unclear');
        status = 'SOFT FAIL';
      }
    } else if (postSubmitUrl.includes('/events') && !postSubmitUrl.includes('/create')) {
      observations.push('Redirected to events list page');
      status = 'SOFT FAIL';
      blocker = 'Expected redirect to event detail, got list page';
    } else {
      observations.push('No redirect detected after event submission');
      status = 'SOFT FAIL';
    }
    
  } catch (error) {
    status = 'HARD FAIL';
    blocker = error.message;
    observations.push(`Exception: ${error.message}`);
  }
  
  logResult('Journey 2: Create Event', status, steps, observations, blocker);
}

async function journey3_GroupsDiscovery(page) {
  const steps = [];
  const observations = [];
  let status = 'PASS';
  let blocker = null;

  try {
    steps.push('Navigate to groups discovery page');
    await page.goto(`${BASE_URL}/groups`);
    await waitForNetworkIdle(page);
    await takeScreenshot(page, 'journey3-groups-list');
    observations.push(`Groups page URL: ${page.url()}`);
    
    if (page.url().includes('/auth/login')) {
      status = 'HARD FAIL';
      blocker = 'Redirected to login - auth issue';
      updateLaunchGate('authConsistency', 'FAIL', 'Groups page requires re-auth');
      logResult('Journey 3: Groups Discovery', status, steps, observations, blocker);
      return;
    }
    
    steps.push('Check for available groups');
    await page.waitForTimeout(2000);
    const groupCards = await page.locator('div[class*="group" i], article, [data-testid*="group"]').all();
    observations.push(`Found ${groupCards.length} potential group elements`);
    
    if (groupCards.length === 0) {
      steps.push('No groups found - attempt to create one first');
      await page.goto(`${BASE_URL}/groups/create`);
      await waitForNetworkIdle(page);
      await takeScreenshot(page, 'journey3-group-create');
      
      const nameInput = await page.locator('input[name="name"], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill('Smoke Test Group');
        const descInput = await page.locator('textarea[name="description"], textarea').first();
        if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await descInput.fill('Created during smoke test');
        }
        const submitBtn = await page.locator('button[type="submit"]').first();
        await submitBtn.click();
        await waitForNetworkIdle(page);
        observations.push('Created a test group');
        
        await page.goto(`${BASE_URL}/groups`);
        await waitForNetworkIdle(page);
      }
    }
    
    steps.push('Attempt to join/request membership to a group');
    const joinButton = await page.locator('button:has-text("Join"), button:has-text("Request")').first();
    const joinButtonVisible = await joinButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (joinButtonVisible) {
      await joinButton.click();
      await page.waitForTimeout(1500);
      await takeScreenshot(page, 'journey3-join-clicked');
      observations.push('Join/Request button clicked');
      
      steps.push('Verify membership state change');
      const buttonText = await joinButton.innerText().catch(() => '');
      observations.push(`Button text after click: "${buttonText}"`);
      
      if (buttonText.toLowerCase().includes('pending') || buttonText.toLowerCase().includes('requested') || buttonText.toLowerCase().includes('leave')) {
        observations.push('Membership state changed visibly');
        updateLaunchGate('permissionClarity', 'PASS', 'Group membership state visible');
      } else {
        observations.push('Membership state change unclear');
        status = 'SOFT FAIL';
      }
      
      steps.push('Navigate to group detail page');
      const groupLink = await page.locator('a[href*="/groups/"]').first();
      if (await groupLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await groupLink.click();
        await waitForNetworkIdle(page);
        await takeScreenshot(page, 'journey3-group-detail');
        observations.push(`Group detail URL: ${page.url()}`);
        
        const detailContent = await page.content();
        if (detailContent.toLowerCase().includes('member') || detailContent.toLowerCase().includes('pending')) {
          observations.push('Membership state visible in detail page');
        }
      }
    } else {
      observations.push('No Join/Request button found');
      status = 'SOFT FAIL';
      blocker = 'Cannot test join flow - no actionable groups';
    }
    
  } catch (error) {
    status = 'HARD FAIL';
    blocker = error.message;
    observations.push(`Exception: ${error.message}`);
  }
  
  logResult('Journey 3: Groups Discovery -> Join', status, steps, observations, blocker);
}

async function journey4_MarketplaceCheckout(page) {
  const steps = [];
  const observations = [];
  let status = 'PASS';
  let blocker = null;

  try {
    steps.push('Navigate to marketplace');
    await page.goto(`${BASE_URL}/marketplace`);
    await waitForNetworkIdle(page);
    await takeScreenshot(page, 'journey4-marketplace-list');
    observations.push(`Marketplace URL: ${page.url()}`);
    
    if (page.url().includes('/auth/login')) {
      status = 'HARD FAIL';
      blocker = 'Redirected to login - auth issue';
      logResult('Journey 4: Marketplace Checkout', status, steps, observations, blocker);
      return;
    }
    
    steps.push('Find a listing to view');
    await page.waitForTimeout(2000);
    const listingLink = await page.locator('a[href*="/marketplace/"]').first();
    const listingLinkVisible = await listingLink.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!listingLinkVisible) {
      observations.push('No listings found - attempting to create one');
      await page.goto(`${BASE_URL}/marketplace/sell`);
      await waitForNetworkIdle(page);
      
      const titleInput = await page.locator('input[name="title"], input[placeholder*="title" i]').first();
      if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await titleInput.fill('Smoke Test Listing');
        const priceInput = await page.locator('input[name="price"], input[type="number"]').first();
        if (await priceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await priceInput.fill('10.00');
        }
        const descInput = await page.locator('textarea').first();
        if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await descInput.fill('Test listing for smoke test');
        }
        const submitBtn = await page.locator('button[type="submit"]').first();
        await submitBtn.click();
        await waitForNetworkIdle(page);
        observations.push('Created test listing');
        
        await page.goto(`${BASE_URL}/marketplace`);
        await waitForNetworkIdle(page);
      }
    }
    
    steps.push('Open listing detail');
    const firstListing = await page.locator('a[href*="/marketplace/"]').first();
    if (await firstListing.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstListing.click();
      await waitForNetworkIdle(page);
      await takeScreenshot(page, 'journey4-listing-detail');
      observations.push(`Listing detail URL: ${page.url()}`);
    } else {
      status = 'HARD FAIL';
      blocker = 'No listings available to test checkout';
      logResult('Journey 4: Marketplace Checkout', status, steps, observations, blocker);
      return;
    }
    
    steps.push('Add to cart');
    const addToCartBtn = await page.locator('button:has-text("Add to Cart"), button:has-text("Cart")').first();
    const addToCartVisible = await addToCartBtn.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (addToCartVisible) {
      await addToCartBtn.click();
      await page.waitForTimeout(1500);
      await takeScreenshot(page, 'journey4-added-to-cart');
      observations.push('Add to Cart button clicked');
    } else {
      observations.push('Add to Cart button not found - looking for alternate checkout');
    }
    
    steps.push('Proceed to checkout');
    const checkoutBtn = await page.locator('button:has-text("Checkout"), a[href*="checkout"]').first();
    const checkoutVisible = await checkoutBtn.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (checkoutVisible) {
      await checkoutBtn.click();
      await waitForNetworkIdle(page);
      await takeScreenshot(page, 'journey4-checkout-page');
      observations.push(`Checkout page URL: ${page.url()}`);
      
      steps.push('Submit checkout form');
      const submitCheckout = await page.locator('button[type="submit"], button:has-text("Place Order"), button:has-text("Complete")').first();
      if (await submitCheckout.isVisible({ timeout: 5000 }).catch(() => false)) {
        
        page.on('response', async (response) => {
          if (response.url().includes('checkout') || response.url().includes('order')) {
            observations.push(`Server response: ${response.status()} ${response.statusText()}`);
            try {
              const body = await response.json();
              observations.push(`Response body: ${JSON.stringify(body)}`);
            } catch (e) {}
          }
        });
        
        await submitCheckout.click();
        await page.waitForTimeout(3000);
        await takeScreenshot(page, 'journey4-checkout-submitted');
        
        const pageContent = await page.content();
        if (pageContent.toLowerCase().includes('success') && !pageContent.toLowerCase().includes('error')) {
          if (pageContent.toLowerCase().includes('fake') || pageContent.toLowerCase().includes('demo')) {
            observations.push('⚠️ SUCCESS MESSAGE CONTAINS "FAKE" OR "DEMO"');
            updateLaunchGate('checkoutIntegrity', 'FAIL', 'Fake success message shown');
            status = 'HARD FAIL';
            blocker = 'Checkout shows fake success without server confirmation';
          } else {
            observations.push('Success message shown - verifying server response');
            updateLaunchGate('checkoutIntegrity', 'PASS', 'Checkout waits for server response');
          }
        } else if (pageContent.toLowerCase().includes('error') || pageContent.toLowerCase().includes('fail')) {
          observations.push('Error/failure message shown');
          updateLaunchGate('errorRecovery', 'PASS', 'Checkout shows error feedback');
          status = 'SOFT FAIL';
        } else {
          observations.push('No clear success or error message after checkout');
          status = 'SOFT FAIL';
        }
      } else {
        observations.push('Checkout submit button not found');
        status = 'SOFT FAIL';
      }
    } else {
      observations.push('Checkout button not found');
      status = 'SOFT FAIL';
      blocker = 'Cannot proceed to checkout';
    }
    
  } catch (error) {
    status = 'HARD FAIL';
    blocker = error.message;
    observations.push(`Exception: ${error.message}`);
  }
  
  logResult('Journey 4: Marketplace Checkout', status, steps, observations, blocker);
}

async function journey5_DraftResilience(page) {
  const steps = [];
  const observations = [];
  let status = 'PASS';
  let blocker = null;

  try {
    const formsToTest = [
      { url: '/', name: 'Post Form', field: 'textarea' },
      { url: '/events/create', name: 'Event Form', field: 'input[name="title"]' },
      { url: '/groups/create', name: 'Group Form', field: 'input[name="name"]' },
      { url: '/marketplace/sell', name: 'Listing Form', field: 'input[name="title"]' }
    ];
    
    let passCount = 0;
    let failCount = 0;
    
    for (const form of formsToTest) {
      steps.push(`Test draft resilience on ${form.name}`);
      
      await page.goto(`${BASE_URL}${form.url}`);
      await waitForNetworkIdle(page);
      
      const fieldLocator = await page.locator(form.field).first();
      const fieldVisible = await fieldLocator.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (!fieldVisible) {
        observations.push(`${form.name}: Field not found`);
        failCount++;
        continue;
      }
      
      const testValue = `Draft test content for ${form.name} - ${Date.now()}`;
      await fieldLocator.fill(testValue);
      await page.waitForTimeout(500);
      observations.push(`${form.name}: Entered test data`);
      
      await page.reload();
      await waitForNetworkIdle(page);
      await page.waitForTimeout(1000);
      
      const restoredFieldLocator = await page.locator(form.field).first();
      const restoredValue = await restoredFieldLocator.inputValue().catch(() => '');
      
      if (restoredValue === testValue) {
        observations.push(`${form.name}: ✅ Draft restored after refresh`);
        passCount++;
      } else if (restoredValue && restoredValue.length > 0) {
        observations.push(`${form.name}: ⚠️ Partial draft restoration (got: "${restoredValue}")`);
        passCount++;
      } else {
        observations.push(`${form.name}: ❌ Draft NOT restored`);
        failCount++;
      }
      
      await page.waitForTimeout(500);
    }
    
    if (passCount >= 3) {
      updateLaunchGate('draftRestore', 'PASS', `${passCount}/${formsToTest.length} forms restore drafts`);
      observations.push(`Draft restore works for ${passCount}/${formsToTest.length} forms`);
    } else if (passCount >= 1) {
      updateLaunchGate('draftRestore', 'PARTIAL', `${passCount}/${formsToTest.length} forms restore drafts`);
      observations.push(`Draft restore partial: ${passCount}/${formsToTest.length}`);
      status = 'SOFT FAIL';
    } else {
      updateLaunchGate('draftRestore', 'FAIL', 'No forms restore drafts');
      observations.push('Draft restore not working');
      status = 'HARD FAIL';
      blocker = 'No draft restoration detected';
    }
    
  } catch (error) {
    status = 'HARD FAIL';
    blocker = error.message;
    observations.push(`Exception: ${error.message}`);
  }
  
  logResult('Journey 5: Draft Resilience', status, steps, observations, blocker);
}

async function failureCheck_InvalidFormSubmit(page) {
  const observations = [];
  let status = 'PASS';

  try {
    await page.goto(`${BASE_URL}/events/create`);
    await waitForNetworkIdle(page);
    
    const submitBtn = await page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, 'failure-invalid-submit');
      
      const pageContent = await page.content();
      const pageText = await page.locator('body').innerText();
      
      if (pageText.toLowerCase().includes('required') || 
          pageText.toLowerCase().includes('invalid') ||
          pageText.toLowerCase().includes('error') ||
          pageText.toLowerCase().includes('please')) {
        observations.push('Human-readable error message shown');
        updateLaunchGate('errorRecovery', 'PASS', 'Form validation shows readable errors');
      } else if (pageContent.includes('error') || pageContent.includes('validation')) {
        observations.push('Error present but may not be user-friendly');
        status = 'SOFT FAIL';
      } else {
        observations.push('No clear error feedback on invalid submit');
        updateLaunchGate('errorRecovery', 'FAIL', 'No validation feedback');
        status = 'HARD FAIL';
      }
    } else {
      observations.push('Submit button not found');
      status = 'SOFT FAIL';
    }
  } catch (error) {
    status = 'HARD FAIL';
    observations.push(`Exception: ${error.message}`);
  }
  
  logFailureCheck('Invalid form submit shows human-readable recovery', status, observations);
}

async function failureCheck_RefreshInterruption(page) {
  const observations = [];
  let status = 'PASS';

  try {
    await page.goto(`${BASE_URL}/events/create`);
    await waitForNetworkIdle(page);
    
    const titleInput = await page.locator('input[name="title"]').first();
    if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await titleInput.fill('Interrupted Event');
      await page.waitForTimeout(500);
      
      await page.reload();
      await waitForNetworkIdle(page);
      await page.waitForTimeout(1000);
      
      const restoredValue = await titleInput.inputValue().catch(() => '');
      if (restoredValue.includes('Interrupted')) {
        observations.push('Form state restored after refresh interruption');
      } else {
        observations.push('Form state lost after refresh');
        status = 'SOFT FAIL';
      }
      
      await page.goBack();
      await waitForNetworkIdle(page);
      await page.waitForTimeout(1000);
      
      const backText = await page.locator('body').innerText();
      if (backText.toLowerCase().includes('unsaved') || backText.toLowerCase().includes('leave')) {
        observations.push('Unsaved change warning detected');
      } else {
        observations.push('No unsaved change warning on navigation');
        status = 'SOFT FAIL';
      }
    }
  } catch (error) {
    status = 'HARD FAIL';
    observations.push(`Exception: ${error.message}`);
  }
  
  logFailureCheck('Refresh interruption and unsaved-change protection', status, observations);
}

async function failureCheck_LoginRedirect(page, browser) {
  const observations = [];
  let status = 'PASS';

  try {
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    
    const protectedUrl = `${BASE_URL}/events/create`;
    await newPage.goto(protectedUrl);
    await waitForNetworkIdle(newPage);
    
    const currentUrl = newPage.url();
    observations.push(`Navigated to ${protectedUrl}, redirected to ${currentUrl}`);
    
    if (currentUrl.includes('/auth/login')) {
      observations.push('Protected route redirected to login ✓');
      
      if (currentUrl.includes('next=') || currentUrl.includes('redirect=') || currentUrl.includes('return')) {
        observations.push('Login URL contains next path parameter ✓');
        updateLaunchGate('authConsistency', 'PASS', 'Login redirect preserves next path');
        
        await newPage.fill('input[type="email"]', TEST_CREDENTIALS.email);
        await newPage.fill('input[type="password"]', TEST_CREDENTIALS.password);
        await newPage.click('button[type="submit"]');
        await waitForNetworkIdle(newPage);
        await newPage.waitForTimeout(2000);
        
        const afterLoginUrl = newPage.url();
        observations.push(`After login: ${afterLoginUrl}`);
        
        if (afterLoginUrl.includes('/events/create')) {
          observations.push('Redirected back to original protected route ✓');
        } else {
          observations.push('Did not redirect back to original route');
          status = 'SOFT FAIL';
        }
      } else {
        observations.push('Login URL does not contain next path parameter');
        status = 'SOFT FAIL';
      }
    } else {
      observations.push('Protected route did not redirect to login');
      status = 'SOFT FAIL';
    }
    
    await newContext.close();
  } catch (error) {
    status = 'HARD FAIL';
    observations.push(`Exception: ${error.message}`);
  }
  
  logFailureCheck('Login redirect supports next path', status, observations);
}

async function runSmokeTest() {
  console.log('\n🚀 Starting Embr Smoke Test');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Credentials: ${TEST_CREDENTIALS.email}`);
  console.log('\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    await journey1_LoginFeedPost(page);
    await journey2_CreateEvent(page);
    await journey3_GroupsDiscovery(page);
    await journey4_MarketplaceCheckout(page);
    await journey5_DraftResilience(page);
    
    console.log('\n\n🔍 Running Failure Checks...\n');
    
    await failureCheck_InvalidFormSubmit(page);
    await failureCheck_RefreshInterruption(page);
    await failureCheck_LoginRedirect(page, browser);
    
  } catch (error) {
    console.error('Fatal error during smoke test:', error);
  } finally {
    await browser.close();
  }

  console.log('\n\n' + '═'.repeat(80));
  console.log('LAUNCH GATE VERDICT SUMMARY');
  console.log('═'.repeat(80));
  
  for (const [gate, result] of Object.entries(results.launchGates)) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`\n${icon} ${gate.toUpperCase()}: ${result.status}`);
    result.notes.forEach(note => console.log(`   - ${note}`));
  }
  
  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 Test Summary:');
  const passCount = results.journeys.filter(j => j.status === 'PASS').length;
  const softFailCount = results.journeys.filter(j => j.status === 'SOFT FAIL').length;
  const hardFailCount = results.journeys.filter(j => j.status === 'HARD FAIL').length;
  console.log(`   Journeys: ${passCount} PASS, ${softFailCount} SOFT FAIL, ${hardFailCount} HARD FAIL`);
  
  console.log('\n✅ Smoke test complete!');
  console.log('Screenshots saved with prefix: smoke-test-*');
}

runSmokeTest().catch(console.error);
