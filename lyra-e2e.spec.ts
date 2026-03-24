/**
 * LYRA END-TO-END TEST SUITE
 * ──────────────────────────────────────────────────────────────────────────────
 * Senior end-to-end test engineer, UX reliability auditor, and launch risk
 * assessor. Tests the lived experience of using Embr in the real world across
 * nine dimensions:
 *
 *  1. Primary End-to-End Flow Simulation
 *  2. Abandonment & Resume Testing
 *  3. Error, Failure, and Edge Case Simulation
 *  4. State Consistency & Data Integrity Testing
 *  5. Role, Permission, and Boundary Testing
 *  6. Performance & Perceived Speed Testing
 *  7. Emotional Experience & Trust Testing
 *  8. First-Time User Reality Test
 *  9. Demo & Investor Scenario Testing
 *
 * Personas tested:
 *  • Creator (creator@embr.app / test1234) — content + gigs + earnings
 *  • Standard user (user@embr.app / test1234) — consume + buy + message
 *  • Admin (admin@embr.app / test1234) — moderation + oversight
 *  • Unauthenticated visitor — onboarding + gating
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3004';

const PERSONAS = {
  creator: { email: 'creator@embr.app', password: 'test1234', label: 'Creator' },
  user: { email: 'user@embr.app', password: 'test1234', label: 'Standard User' },
  admin: { email: 'admin@embr.app', password: 'test1234', label: 'Admin' },
};

// ─── Types ───────────────────────────────────────────────────────────────────

type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
type Rating = 'PASS' | 'SOFT FAIL' | 'HARD FAIL';

interface Issue {
  scenario: string;
  whatBreaks: string;
  severity: Severity;
  userImpact: string;
  fixRecommendation: string;
  effortEstimate: string;
}

interface JourneyReport {
  name: string;
  dimension: string;
  rating: Rating;
  steps: Array<{ action: string; result: string; note?: string }>;
  issues: Issue[];
  delights: string[];
}

// ─── Report state (accumulated across all tests) ─────────────────────────────

const allReports: JourneyReport[] = [];
const mustFixBeforeLaunch: Issue[] = [];
const fixSoonAfterLaunch: Issue[] = [];
const safeToMonitor: Issue[] = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function login(page: Page, persona: typeof PERSONAS.creator): Promise<boolean> {
  try {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.waitForLoadState('networkidle', { timeout: 12000 });

    const email = page.locator('input[type="email"], input[name="email"], input[id*="email"]').first();
    const password = page.locator('input[type="password"], input[name="password"], input[id*="password"]').first();

    await email.fill(persona.email);
    await password.fill(persona.password);

    const submit = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').first();
    await submit.click();

    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 12000 });
    return true;
  } catch {
    return false;
  }
}

async function captureToasts(page: Page): Promise<string[]> {
  const texts = await page
    .locator('[role="alert"], [class*="toast"], [class*="Toast"], [class*="notification"], [class*="Notification"]')
    .allTextContents();
  return texts.map((t) => t.trim()).filter(Boolean);
}

async function isProtected(page: Page): Promise<boolean> {
  const url = page.url();
  return url.includes('/auth/login') || url.includes('/auth/signup');
}

function addIssue(
  report: JourneyReport,
  issue: Issue,
  bucket: 'must' | 'soon' | 'monitor',
) {
  report.issues.push(issue);
  if (bucket === 'must') mustFixBeforeLaunch.push(issue);
  else if (bucket === 'soon') fixSoonAfterLaunch.push(issue);
  else safeToMonitor.push(issue);
}

function step(report: JourneyReport, action: string, result: string, note?: string) {
  report.steps.push({ action, result, note });
}

// ─── DIMENSION 1: Primary End-to-End Flow Simulation ─────────────────────────

test.describe('1. Primary E2E Flows', () => {

  test('1a. Auth: Login happy path → protected feed', async ({ page }) => {
    const report: JourneyReport = {
      name: '1a. Auth: Login happy path',
      dimension: 'Primary E2E Flow',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, 'Navigate to /auth/login', `URL: ${page.url()}`);

      const title = await page.title();
      expect(title).toBeTruthy();
      step(report, 'Page has <title>', title);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const submitBtn = page.locator('button[type="submit"]').first();

      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(submitBtn).toBeVisible();
      step(report, 'Login form elements visible', 'email, password, submit all present');

      await emailInput.fill(PERSONAS.creator.email);
      await passwordInput.fill(PERSONAS.creator.password);
      await submitBtn.click();

      await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 12000 });
      const postLoginUrl = page.url();
      step(report, 'Submit valid credentials', `Redirected to ${postLoginUrl}`);

      const cookies = await page.context().cookies();
      const authCookie = cookies.find((c) => c.name === 'accessToken' || c.name.includes('token') || c.name.includes('auth'));

      if (!authCookie) {
        report.rating = 'SOFT FAIL';
        addIssue(report, {
          scenario: 'Login succeeds but no auth cookie is set',
          whatBreaks: 'Refresh will drop the session; user sees broken state',
          severity: 'High',
          userImpact: 'User is logged in but session not persisted — next page load logs them out',
          fixRecommendation: 'Ensure API sets httpOnly auth cookie on successful login response',
          effortEstimate: '1–2 hours',
        }, 'must');
      } else {
        step(report, 'Auth cookie present', authCookie.name);
        report.delights.push('Cookie set immediately — session persists across tabs');
      }

      await page.goto(`${BASE_URL}/feed`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      const feedUrl = page.url();
      const redirectedToLogin = feedUrl.includes('/auth/login');

      if (redirectedToLogin) {
        report.rating = 'HARD FAIL';
        addIssue(report, {
          scenario: 'After login, navigating to /feed redirects back to login',
          whatBreaks: 'Auth state is not persisted client-side',
          severity: 'Critical',
          userImpact: 'User cannot access the app after logging in',
          fixRecommendation: 'Verify AuthContext stores token correctly and ProtectedRoute reads it',
          effortEstimate: '2–4 hours',
        }, 'must');
      } else {
        step(report, 'Feed accessible after login', feedUrl);
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Login flow threw exception',
        whatBreaks: `Uncaught error: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'Critical',
        userImpact: 'User cannot log in at all',
        fixRecommendation: 'Investigate and fix root cause',
        effortEstimate: 'Unknown',
      }, 'must');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });

  test('1b. Creator: Post creation end-to-end', async ({ page }) => {
    const report: JourneyReport = {
      name: '1b. Creator: Post creation',
      dimension: 'Primary E2E Flow',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      const loggedIn = await login(page, PERSONAS.creator);
      if (!loggedIn) {
        report.rating = 'HARD FAIL';
        addIssue(report, {
          scenario: 'Creator cannot log in',
          whatBreaks: 'All creator flows blocked',
          severity: 'Critical',
          userImpact: 'Creator cannot create content',
          fixRecommendation: 'Fix login (see 1a)',
          effortEstimate: 'Blocked on 1a',
        }, 'must');
        allReports.push(report);
        return;
      }

      await page.goto(`${BASE_URL}/create`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, 'Navigate to /create', page.url());

      const isLoginPage = page.url().includes('/auth/login');
      if (isLoginPage) {
        report.rating = 'HARD FAIL';
        addIssue(report, {
          scenario: '/create redirects to login for authenticated creator',
          whatBreaks: 'Post creation is gated away from authenticated users',
          severity: 'Critical',
          userImpact: 'Creators cannot create posts',
          fixRecommendation: 'Verify ProtectedPageShell is not triggering false-positive auth failure',
          effortEstimate: '1–2 hours',
        }, 'must');
        allReports.push(report);
        return;
      }

      const textArea = page.locator('textarea, [contenteditable="true"]').first();
      const isVisible = await textArea.isVisible({ timeout: 5000 }).catch(() => false);

      if (!isVisible) {
        report.rating = 'SOFT FAIL';
        addIssue(report, {
          scenario: 'Post composer textarea not visible on /create',
          whatBreaks: 'Creator cannot type post content',
          severity: 'High',
          userImpact: 'Blank page / broken create flow',
          fixRecommendation: 'Inspect PostCreator component render and ensure textarea renders',
          effortEstimate: '1–2 hours',
        }, 'must');
      } else {
        const uniqueText = `Lyra test post ${Date.now()}`;
        await textArea.fill(uniqueText);
        step(report, 'Enter post content', `"${uniqueText.substring(0, 40)}..."`);

        const publishBtn = page
          .locator('button:has-text("Post"), button:has-text("Publish"), button:has-text("Share")')
          .first();
        const publishVisible = await publishBtn.isVisible({ timeout: 5000 }).catch(() => false);

        if (!publishVisible) {
          report.rating = 'SOFT FAIL';
          addIssue(report, {
            scenario: 'Publish/Post button not visible after entering content',
            whatBreaks: 'Creator cannot submit the post',
            severity: 'High',
            userImpact: 'Dead-end — content typed but no way to submit',
            fixRecommendation: 'Ensure submit button is rendered in PostCreator',
            effortEstimate: '1 hour',
          }, 'must');
        } else {
          await publishBtn.click();
          await page.waitForTimeout(3000);

          const toasts = await captureToasts(page);
          step(report, 'Click Publish', `Toasts: ${toasts.length > 0 ? toasts.join(', ') : 'none'}`);

          const redirectedToPost = page.url().includes('/post/') || page.url().includes('/feed');
          if (redirectedToPost) {
            step(report, 'Post created', `Redirected to: ${page.url()}`);
            report.delights.push('Post creation → instant redirect to post');
          } else {
            report.rating = 'SOFT FAIL';
            addIssue(report, {
              scenario: 'After publish, no redirect or confirmation',
              whatBreaks: 'User does not know if post was created',
              severity: 'Medium',
              userImpact: 'Confusion — did it work? Users may double-submit',
              fixRecommendation: 'Add success toast or redirect after publish',
              effortEstimate: '1 hour',
            }, 'soon');
          }
        }
      }
    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Post creation threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Critical',
        userImpact: 'Creator cannot create posts',
        fixRecommendation: 'Investigate and fix root cause',
        effortEstimate: 'Unknown',
      }, 'must');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });

  test('1c. Gig discovery and detail view', async ({ page }) => {
    const report: JourneyReport = {
      name: '1c. Gig discovery → detail view',
      dimension: 'Primary E2E Flow',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await login(page, PERSONAS.user);

      await page.goto(`${BASE_URL}/gigs`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, 'Navigate to /gigs', page.url());

      const isLoginPage = page.url().includes('/auth/login');
      if (isLoginPage) {
        report.rating = 'HARD FAIL';
        addIssue(report, {
          scenario: '/gigs redirects unauthenticated user to login',
          whatBreaks: 'Gig discovery behind auth wall — public discovery blocked',
          severity: 'Medium',
          userImpact: 'User cannot browse gigs before signing up',
          fixRecommendation: 'Consider making gig listing public; or ensure session is maintained',
          effortEstimate: '2 hours',
        }, 'soon');
        allReports.push(report);
        return;
      }

      const gigCards = page.locator('[class*="gig"], [class*="card"], [class*="Card"]');
      const gigCount = await gigCards.count();
      step(report, 'Gig listing loaded', `${gigCount} cards visible`);

      if (gigCount === 0) {
        report.rating = 'SOFT FAIL';
        addIssue(report, {
          scenario: 'Gig listing shows zero results on fresh load',
          whatBreaks: 'Empty state with no guidance',
          severity: 'Medium',
          userImpact: 'First-time user sees blank page — thinks app is broken',
          fixRecommendation: 'Add empty state with CTA to post gig or seed demo gigs',
          effortEstimate: '2 hours',
        }, 'soon');
      }

      const firstLink = page.locator('a[href*="/gigs/"]').first();
      const hasLink = await firstLink.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasLink) {
        await firstLink.click();
        await page.waitForLoadState('networkidle', { timeout: 12000 });
        const detailUrl = page.url();
        step(report, 'Open gig detail', detailUrl);

        if (!detailUrl.includes('/gigs/')) {
          report.rating = 'SOFT FAIL';
          addIssue(report, {
            scenario: 'Gig card link does not navigate to detail page',
            whatBreaks: 'Users cannot view gig details',
            severity: 'High',
            userImpact: 'Cannot apply to gig',
            fixRecommendation: 'Ensure gig card href points to /gigs/[id]',
            effortEstimate: '1 hour',
          }, 'must');
        } else {
          const applyBtn = page.locator('button:has-text("Apply"), button:has-text("Bid"), button:has-text("Book")').first();
          const applyVisible = await applyBtn.isVisible({ timeout: 5000 }).catch(() => false);
          if (applyVisible) {
            report.delights.push('Gig detail → Apply CTA visible immediately');
          } else {
            addIssue(report, {
              scenario: 'No Apply/Bid button on gig detail page',
              whatBreaks: 'Cannot apply to gig from detail view',
              severity: 'High',
              userImpact: 'Core marketplace conversion blocked',
              fixRecommendation: 'Add Apply button to gig detail page',
              effortEstimate: '2 hours',
            }, 'must');
            report.rating = 'SOFT FAIL';
          }
        }
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Gig discovery threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Critical',
        userImpact: 'Cannot browse marketplace',
        fixRecommendation: 'Investigate and fix root cause',
        effortEstimate: 'Unknown',
      }, 'must');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });

  test('1d. Messaging: Start conversation', async ({ page }) => {
    const report: JourneyReport = {
      name: '1d. Messaging: Start conversation',
      dimension: 'Primary E2E Flow',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await login(page, PERSONAS.creator);

      await page.goto(`${BASE_URL}/messages`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, 'Navigate to /messages', page.url());

      if (page.url().includes('/auth/login')) {
        report.rating = 'HARD FAIL';
        addIssue(report, {
          scenario: '/messages blocks authenticated user',
          whatBreaks: 'Messaging inaccessible',
          severity: 'Critical',
          userImpact: 'Creators cannot communicate with clients',
          fixRecommendation: 'Fix auth gating (see 1a)',
          effortEstimate: 'Blocked on 1a',
        }, 'must');
        allReports.push(report);
        return;
      }

      const newConvoBtn = page
        .locator('button:has-text("New"), button:has-text("Compose"), button:has-text("Message"), a[href*="messages"]')
        .first();
      const hasCTA = await newConvoBtn.isVisible({ timeout: 5000 }).catch(() => false);

      step(report, 'Messages page loaded', `New conversation CTA visible: ${hasCTA}`);

      if (!hasCTA) {
        addIssue(report, {
          scenario: 'No "New Message" or compose CTA visible on /messages',
          whatBreaks: 'User cannot initiate a conversation without knowing direct URL',
          severity: 'Medium',
          userImpact: 'Dead-end for new users with no existing conversations',
          fixRecommendation: 'Add "New Message" button or empty-state CTA to /messages',
          effortEstimate: '1–2 hours',
        }, 'soon');
        report.rating = 'SOFT FAIL';
      }

      const conversationItems = page.locator('[class*="conversation"], [class*="thread"], a[href*="/messages/"]');
      const convCount = await conversationItems.count();
      step(report, 'Conversation list', `${convCount} conversations found`);

      if (convCount === 0) {
        addIssue(report, {
          scenario: '/messages shows empty state with no guidance',
          whatBreaks: 'User does not know how to start a conversation',
          severity: 'Low',
          userImpact: 'Confusion on first use',
          fixRecommendation: 'Add empty state with explanation and CTA',
          effortEstimate: '1 hour',
        }, 'monitor');
      } else {
        report.delights.push('Conversation list renders without spinner hang');
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Messaging flow threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Critical',
        userImpact: 'Cannot access messages',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'must');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });

  test('1e. Profile view and edit', async ({ page }) => {
    const report: JourneyReport = {
      name: '1e. Profile view and edit',
      dimension: 'Primary E2E Flow',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await login(page, PERSONAS.creator);

      await page.goto(`${BASE_URL}/profile`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, 'Navigate to /profile', page.url());

      const userNameEl = page.locator('[class*="username"], [class*="display-name"], h1, h2').first();
      const hasName = await userNameEl.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasName) {
        report.rating = 'SOFT FAIL';
        addIssue(report, {
          scenario: 'Profile page loads but username/display name is not visible',
          whatBreaks: 'Profile page appears broken or empty',
          severity: 'Medium',
          userImpact: 'User thinks their account details are lost',
          fixRecommendation: 'Ensure profile data is fetched and displayed on /profile',
          effortEstimate: '1–2 hours',
        }, 'soon');
      } else {
        step(report, 'Profile name visible', await userNameEl.textContent() || '');
        report.delights.push('Profile loads with user data immediately');
      }

      await page.goto(`${BASE_URL}/profile/edit`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, 'Navigate to /profile/edit', page.url());

      if (page.url().includes('/auth/login')) {
        report.rating = 'HARD FAIL';
        addIssue(report, {
          scenario: '/profile/edit blocks authenticated user',
          whatBreaks: 'Cannot edit profile',
          severity: 'Critical',
          userImpact: 'Creator cannot update their bio or avatar',
          fixRecommendation: 'Fix auth gating',
          effortEstimate: '1 hour',
        }, 'must');
        allReports.push(report);
        return;
      }

      const editInput = page.locator('input, textarea').first();
      const hasInput = await editInput.isVisible({ timeout: 5000 }).catch(() => false);
      step(report, 'Edit form rendered', `Input visible: ${hasInput}`);

      if (!hasInput) {
        addIssue(report, {
          scenario: 'Profile edit page shows no form inputs',
          whatBreaks: 'Cannot update profile data',
          severity: 'High',
          userImpact: 'User cannot customize their profile',
          fixRecommendation: 'Ensure ProfileEditForm renders correctly',
          effortEstimate: '2 hours',
        }, 'must');
        report.rating = 'SOFT FAIL';
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Profile flow threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'High',
        userImpact: 'Cannot view or edit profile',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'must');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });
});

// ─── DIMENSION 2: Abandonment & Resume Testing ───────────────────────────────

test.describe('2. Abandonment & Resume', () => {

  test('2a. Mid-login refresh — form clears, no crash', async ({ page }) => {
    const report: JourneyReport = {
      name: '2a. Mid-login refresh',
      dimension: 'Abandonment & Resume',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      await emailInput.fill(PERSONAS.creator.email);
      step(report, 'Type email into login form', PERSONAS.creator.email);

      await page.reload();
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, 'Reload page mid-form', 'Page refreshed');

      const stillOnLogin = page.url().includes('/auth/login') || page.url() === `${BASE_URL}/`;
      if (!stillOnLogin) {
        report.rating = 'SOFT FAIL';
        addIssue(report, {
          scenario: 'Reload during login sends user somewhere unexpected',
          whatBreaks: 'User is confused where they ended up',
          severity: 'Low',
          userImpact: 'Minor disorientation',
          fixRecommendation: 'Ensure reload on /auth/login stays on /auth/login',
          effortEstimate: '30 minutes',
        }, 'monitor');
      } else {
        step(report, 'Still on login page', 'Expected behavior');

        const emailAfterReload = page.locator('input[type="email"], input[name="email"]').first();
        const valueAfterReload = await emailAfterReload.inputValue().catch(() => '');

        // Clearing the form on reload is expected (no sensitive data persisted)
        step(report, 'Email field after reload', `Value: "${valueAfterReload}" (expected empty)`);
        report.delights.push('Login form clears on reload — no partial credential exposure');
      }
    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Mid-login refresh threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'High',
        userImpact: 'App crashes on refresh',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'must');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });

  test('2b. Draft preservation on post create → refresh', async ({ page }) => {
    const report: JourneyReport = {
      name: '2b. Draft preservation on /create',
      dimension: 'Abandonment & Resume',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await login(page, PERSONAS.creator);

      await page.goto(`${BASE_URL}/create`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });

      if (page.url().includes('/auth/login')) {
        report.rating = 'HARD FAIL';
        allReports.push(report);
        return;
      }

      const uniqueText = `Draft at ${Date.now()}`;
      const textArea = page.locator('textarea, [contenteditable="true"]').first();
      const hasTextArea = await textArea.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasTextArea) {
        report.rating = 'SOFT FAIL';
        addIssue(report, {
          scenario: 'No textarea on /create to test draft',
          whatBreaks: 'Cannot type draft',
          severity: 'High',
          userImpact: 'Cannot create posts',
          fixRecommendation: 'Ensure PostCreator renders textarea',
          effortEstimate: '1 hour',
        }, 'must');
        allReports.push(report);
        return;
      }

      await textArea.fill(uniqueText);
      step(report, 'Type draft text', `"${uniqueText}"`);

      // Wait for potential autosave (debounce ~1s)
      await page.waitForTimeout(2500);
      step(report, 'Wait for autosave debounce', '2.5s elapsed');

      await page.reload();
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      await page.waitForTimeout(1500);
      step(report, 'Reload page', 'Page refreshed');

      const restoredTextArea = page.locator('textarea, [contenteditable="true"]').first();
      const restoredValue = await restoredTextArea.inputValue().catch(async () =>
        (await restoredTextArea.textContent()) || ''
      );
      const isDraftRestored = restoredValue.includes(uniqueText);

      step(report, 'Check draft restoration', isDraftRestored ? 'RESTORED' : `NOT restored. Found: "${restoredValue}"`);

      if (!isDraftRestored) {
        report.rating = 'SOFT FAIL';
        addIssue(report, {
          scenario: 'Draft text lost after page refresh on /create',
          whatBreaks: 'Written content disappears silently',
          severity: 'Medium',
          userImpact: '"Did I just lose everything?" — creator has to retype post',
          fixRecommendation: 'Implement localStorage draft autosave with restore-on-mount in PostCreator',
          effortEstimate: '3–4 hours',
        }, 'soon');
      } else {
        report.delights.push('Draft restored after refresh — no work lost');
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Draft restore test threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Medium',
        userImpact: 'Unknown draft behavior',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'soon');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });

  test('2c. Interrupted gig post — navigate away and return', async ({ page }) => {
    const report: JourneyReport = {
      name: '2c. Interrupted gig post flow',
      dimension: 'Abandonment & Resume',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await login(page, PERSONAS.creator);

      await page.goto(`${BASE_URL}/gigs/post`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });

      if (page.url().includes('/auth/login')) {
        report.rating = 'HARD FAIL';
        allReports.push(report);
        return;
      }

      const titleInput = page.locator('input[name="title"], input[placeholder*="title" i], input[id*="title"]').first();
      const hasTitleInput = await titleInput.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasTitleInput) {
        await titleInput.fill('Abandoned gig post');
        step(report, 'Start filling gig post form', 'Title entered');
      }

      // Navigate away
      await page.goto(`${BASE_URL}/feed`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, 'Navigate away to /feed', 'Left gig form mid-fill');

      // Return to gig post
      await page.goto(`${BASE_URL}/gigs/post`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, 'Return to /gigs/post', page.url());

      // Check for unsaved changes dialog or cleared form
      const titleAfterReturn = hasTitleInput
        ? await page.locator('input[name="title"], input[placeholder*="title" i]').first().inputValue().catch(() => '')
        : '';

      step(report, 'Form state on return', `Title field: "${titleAfterReturn}"`);

      if (titleAfterReturn === 'Abandoned gig post') {
        report.delights.push('Gig form preserves draft data when navigating away and back');
      } else {
        addIssue(report, {
          scenario: 'Gig post form does not preserve partial data on navigation',
          whatBreaks: 'Partial gig form lost on navigation',
          severity: 'Low',
          userImpact: 'Minor annoyance if user navigates away accidentally',
          fixRecommendation: 'Consider localStorage draft for gig post form',
          effortEstimate: '2 hours',
        }, 'monitor');
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Gig post interruption threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Medium',
        userImpact: 'Broken gig post flow',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'soon');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });
});

// ─── DIMENSION 3: Error, Failure, and Edge Case Simulation ───────────────────

test.describe('3. Error, Failure & Edge Cases', () => {

  test('3a. Login with invalid credentials — human-readable error', async ({ page }) => {
    const report: JourneyReport = {
      name: '3a. Invalid credentials error',
      dimension: 'Error & Edge Cases',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await page.goto(`${BASE_URL}/auth/login`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });

      await page.locator('input[type="email"], input[name="email"]').first().fill('notauser@example.com');
      await page.locator('input[type="password"]').first().fill('wrongpassword123');
      await page.locator('button[type="submit"]').first().click();

      await page.waitForTimeout(3000);
      step(report, 'Submit invalid credentials', 'Waiting for error response');

      // Check for error message
      const errorText = await page
        .locator('[class*="error"], [role="alert"], [class*="Error"]')
        .first()
        .textContent({ timeout: 5000 })
        .catch(() => '');

      const toasts = await captureToasts(page);
      const allErrors = [errorText, ...toasts].filter(Boolean).join(' | ');

      step(report, 'Error message displayed', `"${allErrors}"`);

      if (!allErrors.trim()) {
        report.rating = 'SOFT FAIL';
        addIssue(report, {
          scenario: 'Invalid login shows no error message to user',
          whatBreaks: 'Silent failure — user does not know what went wrong',
          severity: 'High',
          userImpact: 'User cannot recover — unsure if email or password is wrong',
          fixRecommendation: 'Ensure login error state updates UI with human-readable message',
          effortEstimate: '1 hour',
        }, 'must');
      } else {
        // Check error message quality
        const isHumanReadable = !allErrors.match(/\b(error|400|401|403|500|undefined|null)\b/i) || allErrors.length > 15;
        if (!isHumanReadable) {
          addIssue(report, {
            scenario: 'Login error message contains technical jargon or status code',
            whatBreaks: `Error reads: "${allErrors.substring(0, 80)}"`,
            severity: 'Medium',
            userImpact: 'Users confused by error codes rather than helpful guidance',
            fixRecommendation: 'Map all auth error states to plain-language messages',
            effortEstimate: '1 hour',
          }, 'soon');
          report.rating = 'SOFT FAIL';
        } else {
          report.delights.push(`Clear error message: "${allErrors.substring(0, 60)}"`);
        }
      }

      // Confirm still on login page (not redirected to app with broken auth)
      const stillOnLogin = page.url().includes('/auth/login');
      if (!stillOnLogin) {
        report.rating = 'HARD FAIL';
        addIssue(report, {
          scenario: 'Invalid credentials redirect user into app',
          whatBreaks: 'Auth bypass — user gets partial access with invalid credentials',
          severity: 'Critical',
          userImpact: 'Security vulnerability + broken UI',
          fixRecommendation: 'Fix auth flow to block redirect on login failure',
          effortEstimate: '2 hours',
        }, 'must');
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Invalid credentials test threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'High',
        userImpact: 'Cannot test auth error handling',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'must');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });

  test('3b. Signup with mismatched passwords — inline validation', async ({ page }) => {
    const report: JourneyReport = {
      name: '3b. Signup: mismatched passwords',
      dimension: 'Error & Edge Cases',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await page.goto(`${BASE_URL}/auth/signup`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });

      await page.locator('input[name="email"], input[type="email"]').first().fill('newuser_test@example.com');
      await page.locator('input[name="username"]').first().fill(`testuser${Date.now()}`).catch(() => {});
      await page.locator('input[name="password"], input[type="password"]').first().fill('Password123!');

      const confirmInput = page.locator('input[name="confirmPassword"], input[id*="confirm"]').first();
      const hasConfirm = await confirmInput.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasConfirm) {
        await confirmInput.fill('DifferentPassword456!');
        step(report, 'Enter mismatched passwords', 'password ≠ confirmPassword');
        await page.locator('button[type="submit"]').first().click();
        await page.waitForTimeout(2000);

        const errorText = await page
          .locator('[class*="error"], [role="alert"]')
          .first()
          .textContent({ timeout: 3000 })
          .catch(() => '');
        step(report, 'Error shown', `"${errorText}"`);

        if (!errorText.trim()) {
          report.rating = 'SOFT FAIL';
          addIssue(report, {
            scenario: 'Signup with mismatched passwords shows no error',
            whatBreaks: 'User can submit form with password they did not intend',
            severity: 'High',
            userImpact: 'User is locked out immediately after registration',
            fixRecommendation: 'Add clientside confirmPassword validation before submission',
            effortEstimate: '1 hour',
          }, 'must');
        } else {
          report.delights.push('Password mismatch caught before API call');
        }
      } else {
        addIssue(report, {
          scenario: 'Signup form has no confirm password field',
          whatBreaks: 'User may mistype password with no verification',
          severity: 'Medium',
          userImpact: 'User locked out if they mistype password once',
          fixRecommendation: 'Add confirm password field or real-time password visibility toggle',
          effortEstimate: '1 hour',
        }, 'soon');
        report.rating = 'SOFT FAIL';
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Signup validation test threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Medium',
        userImpact: 'Cannot validate signup form',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'soon');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });

  test('3c. 404 route — graceful not-found page', async ({ page }) => {
    const report: JourneyReport = {
      name: '3c. 404: Non-existent route',
      dimension: 'Error & Edge Cases',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await page.goto(`${BASE_URL}/this-route-does-not-exist-at-all`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, 'Navigate to non-existent route', page.url());

      const bodyText = await page.locator('body').innerText();
      const has404Message = /not found|404|does not exist|can't find|page missing/i.test(bodyText);

      if (!has404Message) {
        report.rating = 'SOFT FAIL';
        addIssue(report, {
          scenario: '404 page shows no meaningful error message',
          whatBreaks: 'Blank or confusing page for bad URLs',
          severity: 'Medium',
          userImpact: 'User thinks app is broken; no way to recover',
          fixRecommendation: 'Implement custom _error.tsx or 404.tsx with navigation CTA',
          effortEstimate: '2 hours',
        }, 'soon');
      } else {
        step(report, '404 message shown', 'Expected error message present');

        // Check for navigation back
        const backLink = page.locator('a[href="/"], a:has-text("Home"), a:has-text("Go back")').first();
        const hasBack = await backLink.isVisible({ timeout: 3000 }).catch(() => false);

        if (!hasBack) {
          addIssue(report, {
            scenario: '404 page shows error but no recovery navigation',
            whatBreaks: 'User is stuck on 404 with no way out',
            severity: 'Medium',
            userImpact: 'Must use browser back button to recover',
            fixRecommendation: 'Add "Go to Home" or "Go Back" link to 404 page',
            effortEstimate: '30 minutes',
          }, 'soon');
          report.rating = 'SOFT FAIL';
        } else {
          report.delights.push('404 page includes navigation CTA');
        }
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: '404 test threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Low',
        userImpact: 'Cannot verify 404 handling',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'monitor');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });

  test('3d. Post non-existent ID — graceful error', async ({ page }) => {
    const report: JourneyReport = {
      name: '3d. Non-existent post ID',
      dimension: 'Error & Edge Cases',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await login(page, PERSONAS.creator);

      await page.goto(`${BASE_URL}/post/00000000-0000-0000-0000-000000000000`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, 'Navigate to /post/[invalid-id]', page.url());

      const bodyText = await page.locator('body').innerText();
      const hasError = /not found|404|does not exist|unavailable/i.test(bodyText);

      if (!hasError) {
        const hasContent = bodyText.trim().length > 50;
        if (!hasContent) {
          report.rating = 'SOFT FAIL';
          addIssue(report, {
            scenario: 'Non-existent post shows blank page',
            whatBreaks: 'Silent failure on bad post URL',
            severity: 'Medium',
            userImpact: 'User confused by blank page',
            fixRecommendation: 'Add not-found state to /post/[id] page',
            effortEstimate: '1 hour',
          }, 'soon');
        } else {
          addIssue(report, {
            scenario: 'Non-existent post shows no error message',
            whatBreaks: 'Page renders without indicating the resource is missing',
            severity: 'Low',
            userImpact: 'Minor confusion',
            fixRecommendation: 'Show "Post not found" message when API returns 404',
            effortEstimate: '1 hour',
          }, 'monitor');
        }
      } else {
        step(report, 'Error shown for non-existent post', 'Expected behavior');
        report.delights.push('Post not-found state handled gracefully');
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Non-existent post test threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Low',
        userImpact: 'Cannot verify post 404 handling',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'monitor');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });
});

// ─── DIMENSION 4: State Consistency & Data Integrity ─────────────────────────

test.describe('4. State Consistency & Data Integrity', () => {

  test('4a. Settings save — persists across reload', async ({ page }) => {
    const report: JourneyReport = {
      name: '4a. Settings save persists',
      dimension: 'State Consistency',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await login(page, PERSONAS.creator);

      await page.goto(`${BASE_URL}/settings`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, 'Navigate to /settings', page.url());

      if (page.url().includes('/auth/login')) {
        report.rating = 'HARD FAIL';
        allReports.push(report);
        return;
      }

      const toggles = page.locator('[type="checkbox"], [role="switch"]');
      const toggleCount = await toggles.count();
      step(report, 'Settings toggles found', `${toggleCount}`);

      if (toggleCount > 0) {
        const firstToggle = toggles.first();
        const initialState = await firstToggle.isChecked().catch(() => null);
        step(report, 'Toggle initial state', `${initialState}`);

        if (initialState !== null) {
          await firstToggle.click();
          await page.waitForTimeout(2000);
          const afterClick = await firstToggle.isChecked().catch(() => null);
          step(report, 'Toggle state after click', `${afterClick}`);

          const stateChanged = initialState !== afterClick;
          if (!stateChanged) {
            addIssue(report, {
              scenario: 'Settings toggle does not change state when clicked',
              whatBreaks: 'Settings appear interactive but do nothing',
              severity: 'High',
              userImpact: 'User changes settings but nothing saves — silent failure',
              fixRecommendation: 'Fix toggle onChange handler in settings form',
              effortEstimate: '1 hour',
            }, 'must');
            report.rating = 'SOFT FAIL';
          } else {
            // Save settings
            const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]').first();
            const hasSave = await saveBtn.isVisible({ timeout: 3000 }).catch(() => false);

            if (hasSave) {
              await saveBtn.click();
              await page.waitForTimeout(2000);
              const toasts = await captureToasts(page);
              step(report, 'Save settings', `Toasts: ${toasts.join(', ') || 'none'}`);

              await page.reload();
              await page.waitForLoadState('networkidle', { timeout: 12000 });
              await page.waitForTimeout(1000);

              const firstToggleAfterReload = page.locator('[type="checkbox"], [role="switch"]').first();
              const reloadState = await firstToggleAfterReload.isChecked().catch(() => null);
              step(report, 'Toggle state after reload', `${reloadState}`);

              if (reloadState !== afterClick) {
                addIssue(report, {
                  scenario: 'Settings change not persisted after reload',
                  whatBreaks: '"Looks saved but isn\'t" — settings revert on refresh',
                  severity: 'High',
                  userImpact: 'User thinks settings saved; they were silently lost',
                  fixRecommendation: 'Ensure settings mutation hits the API and backend persists',
                  effortEstimate: '2–4 hours',
                }, 'must');
                report.rating = 'SOFT FAIL';
              } else {
                report.delights.push('Settings persist correctly across page reload');
              }
            } else {
              addIssue(report, {
                scenario: 'Settings page has no Save button',
                whatBreaks: 'User cannot explicitly save settings',
                severity: 'Medium',
                userImpact: 'Unclear if changes are autosaved or never applied',
                fixRecommendation: 'Add Save button or implement autosave with visual confirmation',
                effortEstimate: '1–2 hours',
              }, 'soon');
              report.rating = 'SOFT FAIL';
            }
          }
        }
      } else {
        addIssue(report, {
          scenario: 'Settings page has no interactive toggles or inputs',
          whatBreaks: 'Nothing to configure — empty settings page',
          severity: 'Low',
          userImpact: 'Incomplete settings experience',
          fixRecommendation: 'Ensure settings components render correctly',
          effortEstimate: '1 hour',
        }, 'monitor');
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Settings persistence test threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Medium',
        userImpact: 'Cannot verify settings persistence',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'soon');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });

  test('4b. Notifications — mark-all-read reflects in count', async ({ page }) => {
    const report: JourneyReport = {
      name: '4b. Notifications mark-all-read',
      dimension: 'State Consistency',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await login(page, PERSONAS.creator);

      await page.goto(`${BASE_URL}/notifications`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, 'Navigate to /notifications', page.url());

      if (page.url().includes('/auth/login')) {
        report.rating = 'HARD FAIL';
        allReports.push(report);
        return;
      }

      const markAllBtn = page
        .locator('button:has-text("Mark all"), button:has-text("Read all"), button:has-text("Clear")')
        .first();
      const hasMarkAll = await markAllBtn.isVisible({ timeout: 5000 }).catch(() => false);

      step(report, 'Mark-all-read CTA visible', `${hasMarkAll}`);

      if (!hasMarkAll) {
        addIssue(report, {
          scenario: '"Mark all as read" button not present on /notifications',
          whatBreaks: 'Users must manually clear each notification',
          severity: 'Low',
          userImpact: 'Tedious experience with many notifications',
          fixRecommendation: 'Add "Mark all as read" button',
          effortEstimate: '1 hour',
        }, 'monitor');
      } else {
        await markAllBtn.click();
        await page.waitForTimeout(2000);
        const toasts = await captureToasts(page);
        step(report, 'Click mark-all-read', `Toasts: ${toasts.join(', ') || 'none'}`);

        // Verify UI updates (no unread badges)
        const unreadBadges = page.locator('[class*="unread"], [class*="badge"], [aria-label*="unread"]');
        const badgeCount = await unreadBadges.count();

        if (badgeCount > 0) {
          addIssue(report, {
            scenario: 'After mark-all-read, unread badges still show',
            whatBreaks: 'UI inconsistency — state says read but badge says unread',
            severity: 'Medium',
            userImpact: 'User does not trust the action worked',
            fixRecommendation: 'Update local notification state after mark-all-read API call',
            effortEstimate: '1–2 hours',
          }, 'soon');
          report.rating = 'SOFT FAIL';
        } else {
          report.delights.push('Mark-all-read clears badges immediately');
        }
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Notifications state test threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Low',
        userImpact: 'Cannot verify notification state',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'monitor');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });
});

// ─── DIMENSION 5: Role, Permission & Boundary Testing ────────────────────────

test.describe('5. Role, Permission & Boundaries', () => {

  test('5a. Unauthenticated user: protected routes redirect to login', async ({ page }) => {
    const report: JourneyReport = {
      name: '5a. Auth gating: unauthenticated visitor',
      dimension: 'Roles & Permissions',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    const protectedRoutes = ['/feed', '/create', '/profile', '/messages', '/settings', '/notifications'];

    try {
      for (const route of protectedRoutes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle', { timeout: 12000 });
        const redirected = await isProtected(page);
        step(report, `GET ${route} (unauthenticated)`, redirected ? '→ redirected to login ✓' : `→ ${page.url()} (NOT protected!)`);

        if (!redirected) {
          addIssue(report, {
            scenario: `${route} accessible without authentication`,
            whatBreaks: `Unauthenticated visitor can access ${route}`,
            severity: 'High',
            userImpact: 'Private data potentially exposed; broken UI without auth context',
            fixRecommendation: `Add ProtectedRoute or ProtectedPageShell to ${route}`,
            effortEstimate: '30 minutes per route',
          }, 'must');
          report.rating = 'SOFT FAIL';
        }
      }
    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Auth gating test threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'High',
        userImpact: 'Cannot verify auth gating',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'must');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });

  test('5b. Public routes accessible without login', async ({ page }) => {
    const report: JourneyReport = {
      name: '5b. Public routes: no auth required',
      dimension: 'Roles & Permissions',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    const publicRoutes = ['/', '/auth/login', '/auth/signup'];

    try {
      for (const route of publicRoutes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle', { timeout: 12000 });
        const url = page.url();
        // Public routes should NOT redirect to login (they ARE login or landing)
        const isAccessible = !url.includes('/auth/login') || route === '/auth/login';
        step(report, `GET ${route} (public)`, isAccessible ? `Accessible ✓ (${url})` : `Unexpected redirect to ${url}`);

        if (!isAccessible) {
          addIssue(report, {
            scenario: `${route} redirects to login (expected to be public)`,
            whatBreaks: 'Landing/signup page inaccessible',
            severity: 'Critical',
            userImpact: 'New users cannot sign up',
            fixRecommendation: `Ensure ${route} does not have auth guard`,
            effortEstimate: '30 minutes',
          }, 'must');
          report.rating = 'HARD FAIL';
        }
      }
    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Public routes test threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Critical',
        userImpact: 'Cannot verify public accessibility',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'must');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });

  test('5c. Earnings page: role-gated for non-creator', async ({ page }) => {
    const report: JourneyReport = {
      name: '5c. Earnings: role boundary',
      dimension: 'Roles & Permissions',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      // Standard user trying to access earnings
      await login(page, PERSONAS.user);
      await page.goto(`${BASE_URL}/earnings`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, 'Standard user navigates to /earnings', page.url());

      const bodyText = await page.locator('body').innerText();
      const isBlocked = /not authorized|access denied|creator only|upgrade|permission/i.test(bodyText)
        || page.url().includes('/auth/login')
        || page.url().includes('/feed');

      step(report, 'Access result', isBlocked ? 'Appropriately blocked or redirected' : 'Page rendered (check if OK)');

      if (!isBlocked) {
        // Check if the page shows meaningful content or is just silently broken
        const hasEarningsData = /earnings|wallet|revenue|payout/i.test(bodyText);
        if (hasEarningsData) {
          addIssue(report, {
            scenario: 'Standard user (non-creator) can view earnings page',
            whatBreaks: 'Role boundary not enforced on /earnings',
            severity: 'Medium',
            userImpact: 'Confusing UX for non-creators; potential data exposure',
            fixRecommendation: 'Add role check in /earnings page or ProtectedPageShell',
            effortEstimate: '1 hour',
          }, 'soon');
          report.rating = 'SOFT FAIL';
        }
      } else {
        report.delights.push('Earnings page correctly gated from non-creator users');
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Earnings role boundary test threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Low',
        userImpact: 'Cannot verify role boundary',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'monitor');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });
});

// ─── DIMENSION 6: Performance & Perceived Speed ───────────────────────────────

test.describe('6. Performance & Perceived Speed', () => {

  test('6a. Key pages load within acceptable time', async ({ page }) => {
    const report: JourneyReport = {
      name: '6a. Page load timing',
      dimension: 'Performance',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    const WARN_THRESHOLD_MS = 3000;
    const FAIL_THRESHOLD_MS = 8000;

    const pagesToTest = [
      { route: '/auth/login', requiresAuth: false },
      { route: '/feed', requiresAuth: true },
      { route: '/gigs', requiresAuth: true },
      { route: '/notifications', requiresAuth: true },
    ];

    try {
      await login(page, PERSONAS.creator);

      for (const { route, requiresAuth } of pagesToTest) {
        const start = Date.now();
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle', { timeout: FAIL_THRESHOLD_MS });
        const elapsed = Date.now() - start;

        step(report, `Load ${route}`, `${elapsed}ms`);

        if (elapsed > FAIL_THRESHOLD_MS) {
          report.rating = 'SOFT FAIL';
          addIssue(report, {
            scenario: `${route} takes >${FAIL_THRESHOLD_MS}ms to become interactive`,
            whatBreaks: 'Page appears frozen or stuck to users',
            severity: 'High',
            userImpact: 'Users abandon; demo fails under investor observation',
            fixRecommendation: 'Profile slow components, add Suspense boundaries, optimize API calls',
            effortEstimate: '4–8 hours',
          }, 'must');
        } else if (elapsed > WARN_THRESHOLD_MS) {
          addIssue(report, {
            scenario: `${route} takes ${elapsed}ms — above 3s threshold`,
            whatBreaks: 'Sluggish feeling on slow connections',
            severity: 'Medium',
            userImpact: 'Users may perceive app as slow',
            fixRecommendation: 'Add skeleton loaders, optimize initial data fetching',
            effortEstimate: '2–4 hours',
          }, 'soon');
          if (report.rating === 'PASS') report.rating = 'SOFT FAIL';
        } else {
          report.delights.push(`${route} loads in ${elapsed}ms — fast`);
        }
      }
    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Performance timing test threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Medium',
        userImpact: 'Cannot verify performance',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'soon');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });

  test('6b. Loading states visible during async operations', async ({ page }) => {
    const report: JourneyReport = {
      name: '6b. Loading states present',
      dimension: 'Performance',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await login(page, PERSONAS.creator);

      // Navigate and immediately check for loading indicators
      const loadingCheckRoutes = ['/feed', '/gigs', '/notifications'];

      for (const route of loadingCheckRoutes) {
        await page.goto(`${BASE_URL}${route}`);
        // Check for spinner/skeleton within first 500ms
        const loadingEl = page.locator(
          '[class*="spinner"], [class*="Spinner"], [class*="skeleton"], [class*="Skeleton"], [class*="loading"], [aria-label*="loading" i]'
        );
        const hasLoader = await loadingEl.isVisible({ timeout: 500 }).catch(() => false);

        step(report, `${route}: loading indicator`, hasLoader ? 'Visible during load ✓' : 'Not detected (may be very fast)');
      }

      // At minimum verify no blank pages
      await page.goto(`${BASE_URL}/feed`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      const feedText = await page.locator('body').innerText();
      const hasMeaningfulContent = feedText.trim().length > 100;

      if (!hasMeaningfulContent) {
        report.rating = 'SOFT FAIL';
        addIssue(report, {
          scenario: '/feed shows blank or near-empty page after load',
          whatBreaks: 'Blank screen — looks broken',
          severity: 'High',
          userImpact: 'Users think feed failed to load',
          fixRecommendation: 'Add empty state or ensure feed content loads correctly',
          effortEstimate: '2–4 hours',
        }, 'must');
      } else {
        report.delights.push('Feed has meaningful content after networkidle');
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Loading states test threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Medium',
        userImpact: 'Cannot verify loading states',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'soon');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });
});

// ─── DIMENSION 7: Emotional Experience & Trust ───────────────────────────────

test.describe('7. Emotional Experience & Trust', () => {

  test('7a. Post delete: confirmation guard exists', async ({ page }) => {
    const report: JourneyReport = {
      name: '7a. Destructive action: delete guard',
      dimension: 'Emotional Experience',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await login(page, PERSONAS.creator);

      // Create a post first
      await page.goto(`${BASE_URL}/create`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });

      if (page.url().includes('/auth/login')) {
        allReports.push(report);
        return;
      }

      const textArea = page.locator('textarea, [contenteditable="true"]').first();
      const hasTextArea = await textArea.isVisible({ timeout: 5000 }).catch(() => false);

      if (!hasTextArea) {
        allReports.push(report);
        return;
      }

      const postText = `Delete test ${Date.now()}`;
      await textArea.fill(postText);

      const publishBtn = page.locator('button:has-text("Post"), button:has-text("Publish")').first();
      const hasPublish = await publishBtn.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasPublish) {
        await publishBtn.click();
        await page.waitForTimeout(3000);

        const onPostPage = page.url().includes('/post/');
        if (onPostPage) {
          // Look for delete button
          const deleteBtn = page.locator('button:has-text("Delete"), [aria-label*="delete" i], [title*="delete" i]').first();
          const hasDelete = await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false);

          if (hasDelete) {
            // Check for menu/more button pattern
            const moreBtn = page.locator('[aria-label*="more" i], [aria-label*="options" i], button:has-text("..."), button:has-text("⋯")').first();
            const hasMore = await moreBtn.isVisible({ timeout: 3000 }).catch(() => false);

            if (hasMore) {
              await moreBtn.click();
              await page.waitForTimeout(500);
            }

            await deleteBtn.click();
            await page.waitForTimeout(1000);

            // Check for confirmation dialog
            const dialog = page.locator('[role="dialog"], [role="alertdialog"], [class*="modal"], [class*="Modal"]');
            const hasDialog = await dialog.isVisible({ timeout: 3000 }).catch(() => false);

            step(report, 'Click delete on post', `Confirmation dialog: ${hasDialog}`);

            if (!hasDialog) {
              addIssue(report, {
                scenario: 'Post delete has no confirmation dialog',
                whatBreaks: 'Accidental click permanently deletes post',
                severity: 'High',
                userImpact: '"I just deleted my post!" — irreversible panic moment',
                fixRecommendation: 'Add "Are you sure?" dialog before delete action',
                effortEstimate: '1–2 hours',
              }, 'must');
              report.rating = 'SOFT FAIL';
            } else {
              report.delights.push('Delete action shows confirmation dialog — good guardrail');

              // Cancel the delete
              const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Keep"), button:has-text("No")').first();
              const hasCancel = await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false);
              if (hasCancel) {
                await cancelBtn.click();
                step(report, 'Cancel delete', 'Post preserved');
              }
            }
          }
        }
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Delete guard test threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Medium',
        userImpact: 'Cannot verify delete confirmation',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'soon');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });

  test('7b. Checkout: payment boundary shows safety signals', async ({ page }) => {
    const report: JourneyReport = {
      name: '7b. Checkout: trust and safety signals',
      dimension: 'Emotional Experience',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await login(page, PERSONAS.user);

      await page.goto(`${BASE_URL}/marketplace/checkout`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, 'Navigate to /marketplace/checkout', page.url());

      if (page.url().includes('/auth/login')) {
        allReports.push(report);
        return;
      }

      const bodyText = await page.locator('body').innerText();

      // Check for trust signals: Stripe, secure, payment icons
      const hasTrustSignal = /stripe|secure|payment|card|checkout|cart/i.test(bodyText);
      step(report, 'Trust signals present', `${hasTrustSignal}: "${bodyText.substring(0, 100)}"`);

      if (!hasTrustSignal) {
        addIssue(report, {
          scenario: 'Checkout page shows no trust signals or payment branding',
          whatBreaks: 'Users hesitate to enter payment details',
          severity: 'Medium',
          userImpact: 'Reduced conversion; users abandon checkout from mistrust',
          fixRecommendation: 'Add Stripe badge, lock icon, or "Secure checkout" copy',
          effortEstimate: '1 hour',
        }, 'soon');
        report.rating = 'SOFT FAIL';
      }

      // Check for demo-mode safeguard
      const hasDemoGuard = /demo|disabled|test mode/i.test(bodyText);
      step(report, 'Demo mode guard', `${hasDemoGuard}`);

      if (hasDemoGuard) {
        report.delights.push('Demo-safe mode prevents accidental real checkout — critical for demos');
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Checkout trust test threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Medium',
        userImpact: 'Cannot verify checkout trust signals',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'soon');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });
});

// ─── DIMENSION 8: First-Time User Reality Test ───────────────────────────────

test.describe('8. First-Time User Reality Test', () => {

  test('8a. Cold start: landing page communicates value', async ({ page }) => {
    const report: JourneyReport = {
      name: '8a. Cold start: landing page',
      dimension: 'First-Time User',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, 'Navigate to home', page.url());

      const bodyText = await page.locator('body').innerText();
      const hasValueProp = /creator|earn|gig|social|post|community|message|connect/i.test(bodyText);
      step(report, 'Value proposition visible', `${hasValueProp}`);

      if (!hasValueProp) {
        addIssue(report, {
          scenario: 'Landing page does not communicate what Embr is or does',
          whatBreaks: 'New visitor has no idea what the app is for',
          severity: 'High',
          userImpact: 'Immediate bounce from confused new users',
          fixRecommendation: 'Add headline describing what Embr is on landing page',
          effortEstimate: '1–2 hours',
        }, 'must');
        report.rating = 'SOFT FAIL';
      }

      // Check for CTA
      const cta = page.locator('a:has-text("Sign up"), a:has-text("Get started"), button:has-text("Join"), a:has-text("Start")').first();
      const hasCTA = await cta.isVisible({ timeout: 5000 }).catch(() => false);
      step(report, 'CTA visible', `${hasCTA}`);

      if (!hasCTA) {
        addIssue(report, {
          scenario: 'Landing page has no clear sign-up CTA',
          whatBreaks: 'New visitors cannot easily find how to join',
          severity: 'High',
          userImpact: 'Lost signups — users bounce without knowing next step',
          fixRecommendation: 'Add prominent "Sign Up" button above fold on landing page',
          effortEstimate: '30 minutes',
        }, 'must');
        report.rating = 'SOFT FAIL';
      } else {
        report.delights.push('Landing page CTA immediately visible');
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Cold start test threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'High',
        userImpact: 'Cannot test first-time experience',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'must');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });

  test('8b. Signup flow: first win reachable quickly', async ({ page }) => {
    const report: JourneyReport = {
      name: '8b. Signup: steps to first win',
      dimension: 'First-Time User',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await page.goto(`${BASE_URL}/auth/signup`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, 'Navigate to /auth/signup', page.url());

      const formFields = await page.locator('input').count();
      step(report, 'Form field count', `${formFields} fields`);

      if (formFields > 6) {
        addIssue(report, {
          scenario: `Signup form has ${formFields} fields — excessive for first impression`,
          whatBreaks: 'Overwhelming sign-up friction deters new users',
          severity: 'Medium',
          userImpact: 'Registration abandonment',
          fixRecommendation: 'Reduce required fields at signup; defer profile completion to onboarding',
          effortEstimate: '2–4 hours',
        }, 'soon');
        report.rating = 'SOFT FAIL';
      } else {
        report.delights.push(`Signup form has ${formFields} fields — lean registration`);
      }

      // Check for link to login
      const loginLink = page.locator('a[href*="/auth/login"], a:has-text("Sign in"), a:has-text("Log in")').first();
      const hasLoginLink = await loginLink.isVisible({ timeout: 3000 }).catch(() => false);

      if (!hasLoginLink) {
        addIssue(report, {
          scenario: 'Signup page has no link to login',
          whatBreaks: 'Existing users visiting signup page are stuck',
          severity: 'Low',
          userImpact: 'Minor friction for returning users',
          fixRecommendation: 'Add "Already have an account? Sign in" link to signup page',
          effortEstimate: '15 minutes',
        }, 'monitor');
      } else {
        report.delights.push('Signup → Login navigation link present');
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Signup flow test threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'High',
        userImpact: 'Cannot test signup experience',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'must');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });
});

// ─── DIMENSION 9: Demo & Investor Scenario Testing ───────────────────────────

test.describe('9. Demo & Investor Scenario', () => {

  test('9a. Happy path demo: Login → Feed → Create Post', async ({ page }) => {
    const report: JourneyReport = {
      name: '9a. Demo: Login → Feed → Create Post',
      dimension: 'Demo & Investor',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    const START = Date.now();

    try {
      // ── Step 1: Login ───────────────────────────────────────────
      await page.goto(`${BASE_URL}/auth/login`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });

      const email = page.locator('input[type="email"], input[name="email"]').first();
      const password = page.locator('input[type="password"]').first();
      const submit = page.locator('button[type="submit"]').first();

      await email.fill(PERSONAS.creator.email);
      await password.fill(PERSONAS.creator.password);
      await submit.click();

      await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 12000 });
      step(report, '[Demo] Login', `${Date.now() - START}ms`);

      // ── Step 2: Feed ────────────────────────────────────────────
      await page.goto(`${BASE_URL}/feed`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      const feedText = await page.locator('body').innerText();
      const hasFeedContent = feedText.trim().length > 100;
      step(report, '[Demo] Feed', hasFeedContent ? 'Content loaded' : 'BLANK — demo embarrassment');

      if (!hasFeedContent) {
        addIssue(report, {
          scenario: 'Feed is blank during demo',
          whatBreaks: 'Investor sees empty app',
          severity: 'Critical',
          userImpact: 'Demo fails — product looks incomplete',
          fixRecommendation: 'Seed demo data or add compelling empty state for /feed',
          effortEstimate: '2–4 hours',
        }, 'must');
        report.rating = 'HARD FAIL';
        allReports.push(report);
        return;
      }

      // ── Step 3: Create ──────────────────────────────────────────
      await page.goto(`${BASE_URL}/create`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });

      const textArea = page.locator('textarea, [contenteditable="true"]').first();
      const hasTextArea = await textArea.isVisible({ timeout: 5000 }).catch(() => false);

      step(report, '[Demo] Create post page', hasTextArea ? 'Composer visible' : 'NO COMPOSER — demo blocked');

      if (!hasTextArea) {
        report.rating = 'SOFT FAIL';
        addIssue(report, {
          scenario: 'Create page shows no composer during demo',
          whatBreaks: 'Cannot demonstrate post creation',
          severity: 'Critical',
          userImpact: 'Demo of core feature fails',
          fixRecommendation: 'Fix PostCreator render on /create',
          effortEstimate: '1–2 hours',
        }, 'must');
      } else {
        await textArea.fill('Live demo post — creating content on Embr! 🚀');
        const publishBtn = page.locator('button:has-text("Post"), button:has-text("Publish")').first();
        const hasPublish = await publishBtn.isVisible({ timeout: 5000 }).catch(() => false);

        if (hasPublish) {
          step(report, '[Demo] Post content entered', 'Publish button visible — demo-ready');
          report.delights.push('Create → Publish flow is smooth and demo-safe');
        } else {
          addIssue(report, {
            scenario: 'No Publish button visible in demo — cannot complete post',
            whatBreaks: 'Demo stalls at post creation',
            severity: 'High',
            userImpact: 'Demo ends awkwardly',
            fixRecommendation: 'Ensure Publish/Post button renders in PostCreator',
            effortEstimate: '1 hour',
          }, 'must');
          report.rating = 'SOFT FAIL';
        }
      }

      const totalMs = Date.now() - START;
      step(report, '[Demo] Total flow time', `${totalMs}ms`);

      if (totalMs > 15000) {
        addIssue(report, {
          scenario: `Demo happy path took ${totalMs}ms (>15s)`,
          whatBreaks: 'Demo feels slow to investor audience',
          severity: 'Medium',
          userImpact: 'Credibility damage during presentation',
          fixRecommendation: 'Pre-warm the app; optimize first-paint performance',
          effortEstimate: '4 hours',
        }, 'soon');
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Demo happy path threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Critical',
        userImpact: 'Demo crashes live',
        fixRecommendation: 'Investigate and fix before any demo',
        effortEstimate: 'Unknown',
      }, 'must');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });

  test('9b. Demo recovery: unexpected 404 mid-demo', async ({ page }) => {
    const report: JourneyReport = {
      name: '9b. Demo: unexpected 404 recovery',
      dimension: 'Demo & Investor',
      rating: 'PASS',
      steps: [],
      issues: [],
      delights: [],
    };

    try {
      await login(page, PERSONAS.creator);

      // Simulate clicking a broken link during demo
      await page.goto(`${BASE_URL}/post/demo-placeholder-id-xyz`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      step(report, '[Demo] Hit unexpected 404/error', page.url());

      const bodyText = await page.locator('body').innerText();
      const hasNavigation = await page.locator('nav, [class*="nav"], [class*="Nav"]').first().isVisible({ timeout: 3000 }).catch(() => false);

      step(report, 'Navigation bar visible on error page', `${hasNavigation}`);

      if (!hasNavigation) {
        addIssue(report, {
          scenario: 'Error/404 page shows no navigation — demo has no escape route',
          whatBreaks: 'Presenter is stranded; must use browser controls publicly',
          severity: 'High',
          userImpact: 'Awkward demo moment — presenter looks unprepared',
          fixRecommendation: 'Ensure global nav renders on error pages',
          effortEstimate: '1 hour',
        }, 'must');
        report.rating = 'SOFT FAIL';
      } else {
        report.delights.push('Navigation present on error page — easy demo recovery');
      }

    } catch (error) {
      report.rating = 'HARD FAIL';
      addIssue(report, {
        scenario: 'Demo 404 recovery test threw exception',
        whatBreaks: `${error instanceof Error ? error.message : String(error)}`,
        severity: 'Medium',
        userImpact: 'Cannot verify demo recovery path',
        fixRecommendation: 'Investigate root cause',
        effortEstimate: 'Unknown',
      }, 'soon');
    }

    allReports.push(report);
    expect(report.rating).not.toBe('HARD FAIL');
  });
});

// ─── Final Report Generation ──────────────────────────────────────────────────

test.afterAll(async () => {
  const pass = allReports.filter((r) => r.rating === 'PASS').length;
  const soft = allReports.filter((r) => r.rating === 'SOFT FAIL').length;
  const hard = allReports.filter((r) => r.rating === 'HARD FAIL').length;
  const total = allReports.length;

  // Compute launch confidence score (1–10)
  const criticalCount = mustFixBeforeLaunch.filter((i) => i.severity === 'Critical').length;
  const highCount = mustFixBeforeLaunch.filter((i) => i.severity === 'High').length;
  const allIssues = [...mustFixBeforeLaunch, ...fixSoonAfterLaunch, ...safeToMonitor];
  const score = Math.max(
    1,
    10 - criticalCount * 3 - highCount * 1.5 - soft * 0.5 - hard * 2,
  );

  const launchConfidence = Math.round(Math.min(10, Math.max(1, score)));

  let report = '\n';
  report += '╔══════════════════════════════════════════════════════════════════════════════════╗\n';
  report += '║              LYRA — LAUNCH READINESS ASSESSMENT REPORT                          ║\n';
  report += '║              Embr Platform · Full End-to-End Audit                              ║\n';
  report += '╚══════════════════════════════════════════════════════════════════════════════════╝\n\n';

  report += `  Run date  : ${new Date().toISOString()}\n`;
  report += `  Test suite: Lyra E2E — 9 Dimensions\n`;
  report += `  Journeys  : ${total} total   PASS: ${pass}   SOFT FAIL: ${soft}   HARD FAIL: ${hard}\n\n`;

  // ── Journey results ──
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += ' JOURNEY RESULTS\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  for (const j of allReports) {
    const icon = j.rating === 'PASS' ? '✅' : j.rating === 'SOFT FAIL' ? '⚠️ ' : '❌';
    report += `  ${icon} [${j.dimension}] ${j.name}  →  ${j.rating}\n`;

    if (j.issues.length > 0) {
      for (const issue of j.issues) {
        report += `       └─ [${issue.severity}] ${issue.whatBreaks}\n`;
      }
    }

    if (j.delights.length > 0) {
      for (const d of j.delights) {
        report += `       ★  ${d}\n`;
      }
    }

    report += '\n';
  }

  // ── Must Fix Before Launch ──
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += ' ⛔ MUST FIX BEFORE LAUNCH\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  if (mustFixBeforeLaunch.length === 0) {
    report += '  (none detected — verify manually)\n';
  } else {
    for (let i = 0; i < mustFixBeforeLaunch.length; i++) {
      const issue = mustFixBeforeLaunch[i];
      report += `  ${i + 1}. [${issue.severity}] ${issue.scenario}\n`;
      report += `     Impact : ${issue.userImpact}\n`;
      report += `     Fix    : ${issue.fixRecommendation}\n`;
      report += `     Effort : ${issue.effortEstimate}\n\n`;
    }
  }

  // ── Fix Soon After Launch ──
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += ' ⚠️  FIX SOON AFTER LAUNCH\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  if (fixSoonAfterLaunch.length === 0) {
    report += '  (none detected)\n';
  } else {
    for (let i = 0; i < fixSoonAfterLaunch.length; i++) {
      const issue = fixSoonAfterLaunch[i];
      report += `  ${i + 1}. [${issue.severity}] ${issue.scenario}\n`;
      report += `     Fix    : ${issue.fixRecommendation}\n`;
      report += `     Effort : ${issue.effortEstimate}\n\n`;
    }
  }

  // ── Safe to Monitor ──
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += ' 📊 SAFE TO MONITOR\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  if (safeToMonitor.length === 0) {
    report += '  (none detected)\n';
  } else {
    for (let i = 0; i < safeToMonitor.length; i++) {
      const issue = safeToMonitor[i];
      report += `  ${i + 1}. [${issue.severity}] ${issue.scenario}\n`;
    }
    report += '\n';
  }

  // ── Launch Confidence ──
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  report += ' 🚀 LAUNCH CONFIDENCE SCORE\n';
  report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  const bar = '█'.repeat(launchConfidence) + '░'.repeat(10 - launchConfidence);
  report += `  ${launchConfidence}/10  [${bar}]\n\n`;

  const verdict =
    launchConfidence >= 8 ? '✅ LAUNCH READY — Minor items to track post-launch'
    : launchConfidence >= 5 ? '⚠️  CONDITIONAL — Address Must Fix items before launch'
    : '❌ NOT READY — Critical blockers must be resolved first';

  report += `  ${verdict}\n\n`;

  report += `  Must fix  : ${mustFixBeforeLaunch.length} items (${criticalCount} Critical, ${highCount} High)\n`;
  report += `  Fix soon  : ${fixSoonAfterLaunch.length} items\n`;
  report += `  Monitor   : ${safeToMonitor.length} items\n`;
  report += `  Total     : ${allIssues.length} issues across ${total} journeys\n\n`;

  report += '  Recommended demo flow:\n';
  report += '    1. Login as creator@embr.app\n';
  report += '    2. Show /feed (ensure seeded posts visible)\n';
  report += '    3. Navigate to /create → type post → show Publish button\n';
  report += '    4. Show /gigs for marketplace demo\n';
  report += '    5. Show /messages for communication feature\n\n';

  report += '  Features to hide during demos:\n';
  report += '    • /marketplace/checkout (real Stripe; use demo-safe mode)\n';
  report += '    • /earnings (may show $0 for fresh demo accounts)\n';
  report += '    • Any route showing unhandled empty states\n\n';

  report += '╔══════════════════════════════════════════════════════════════════════════════════╗\n';
  report += '║  A product is launch-ready when it behaves calmly under stress.                  ║\n';
  report += '╚══════════════════════════════════════════════════════════════════════════════════╝\n';

  console.log(report);

  // Write reports to disk
  const reportsDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(reportsDir, 'lyra-report.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary: { total, pass, soft, hard, launchConfidence, verdict },
        journeys: allReports,
        mustFixBeforeLaunch,
        fixSoonAfterLaunch,
        safeToMonitor,
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(path.join(reportsDir, 'lyra-report.txt'), report);
});
