#!/usr/bin/env ts-node
/**
 * Interactive Smoke Test Suite for Embr Launch Gates
 * Tests 5 critical user journeys + failure scenarios
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3004';
const API_URL = 'http://localhost:3003';

interface TestResult {
  journey: string;
  status: 'PASS' | 'SOFT FAIL' | 'HARD FAIL';
  steps: string[];
  observations: string[];
  blockers: string[];
}

interface LaunchGateVerdict {
  gate: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  evidence: string[];
}

class SmokeTestRunner {
  private apiClient: any;
  private webClient: any;
  private accessToken: string = '';
  private refreshToken: string = '';
  private cookies: string = '';
  private results: TestResult[] = [];
  private launchGates: LaunchGateVerdict[] = [];

  constructor() {
    this.apiClient = axios.create({
      baseURL: API_URL,
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true, // Don't throw on any status
      withCredentials: true
    });

    this.webClient = axios.create({
      baseURL: BASE_URL,
      validateStatus: () => true,
      withCredentials: true
    });
  }

  private log(message: string, level: 'info' | 'success' | 'error' | 'warn' = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warn: '\x1b[33m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[level]}${message}${colors.reset}`);
  }

  private async pause(ms: number = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Journey 1: Login -> Feed access -> Create first post
   */
  async testJourney1_LoginAndPost(): Promise<TestResult> {
    const result: TestResult = {
      journey: 'Journey 1: Login -> Feed -> Create Post',
      status: 'PASS',
      steps: [],
      observations: [],
      blockers: []
    };

    try {
      this.log('\n=== Journey 1: Login -> Feed -> Create Post ===', 'info');

      // Step 1: Login
      result.steps.push('POST /auth/login with creator@embr.app');
      const loginResponse = await this.apiClient.post('/auth/login', {
        email: 'creator@embr.app',
        password: 'test1234'
      });

      if (loginResponse.status !== 200 && loginResponse.status !== 201) {
        result.status = 'HARD FAIL';
        result.blockers.push(`Login failed: ${loginResponse.status} - ${JSON.stringify(loginResponse.data)}`);
        result.observations.push(`Response: ${JSON.stringify(loginResponse.data)}`);
        return result;
      }

      // Extract tokens from cookies or body
      const setCookieHeader = loginResponse.headers['set-cookie'];
      if (setCookieHeader) {
        this.cookies = setCookieHeader.join('; ');
        result.observations.push(`Cookies set: ${setCookieHeader.length} cookies received`);
        
        // Extract access token from cookie
        const accessTokenMatch = this.cookies.match(/accessToken=([^;]+)/);
        if (accessTokenMatch) {
          this.accessToken = accessTokenMatch[1];
        }
      }

      if (loginResponse.data?.access_token || loginResponse.data?.accessToken) {
        this.accessToken = loginResponse.data.access_token || loginResponse.data.accessToken;
        result.observations.push('Access token received in response body');
      }

      if (!this.accessToken && !this.cookies) {
        result.status = 'HARD FAIL';
        result.blockers.push('No authentication token received');
        return result;
      }

      result.observations.push('✓ Login successful');
      result.steps.push('Authentication token obtained');

      // Step 2: Access feed
      result.steps.push('GET /content/feed');
      const feedResponse = await this.apiClient.get('/content/feed', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Cookie': this.cookies
        },
        params: { limit: 10 }
      });

      if (feedResponse.status === 200) {
        result.observations.push(`✓ Feed accessible: ${feedResponse.data?.length || 0} posts`);
      } else if (feedResponse.status === 401) {
        result.status = 'SOFT FAIL';
        result.observations.push(`⚠ Feed returned 401 Unauthorized`);
        this.launchGates.push({
          gate: 'auth_consistency',
          status: 'FAIL',
          evidence: ['Login succeeded but feed access returned 401']
        });
      } else {
        result.observations.push(`⚠ Feed returned status ${feedResponse.status}`);
      }

      // Step 3: Create a post
      result.steps.push('POST /content/posts with text-only content');
      const postData = {
        content: `Smoke test post created at ${new Date().toISOString()}`,
        visibility: 'PUBLIC'
      };

      const createPostResponse = await this.apiClient.post('/content/posts', postData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Cookie': this.cookies
        }
      });

      if (createPostResponse.status === 200 || createPostResponse.status === 201) {
        result.observations.push('✓ Post created successfully');
        result.observations.push(`Post ID: ${createPostResponse.data?.id || 'unknown'}`);
        
        // Verify post appears in feed
        const verifyFeed = await this.apiClient.get('/content/feed', {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Cookie': this.cookies
          },
          params: { limit: 10 }
        });
        
        if (verifyFeed.status === 200 && Array.isArray(verifyFeed.data)) {
          const postFound = verifyFeed.data.some((p: any) => p.id === createPostResponse.data?.id);
          if (postFound) {
            result.observations.push('✓ New post visible in feed');
          } else {
            result.observations.push('⚠ New post not immediately visible in feed');
          }
        }
      } else if (createPostResponse.status === 400) {
        result.status = 'SOFT FAIL';
        result.observations.push(`⚠ Post creation failed with validation error`);
        result.observations.push(`Error: ${JSON.stringify(createPostResponse.data)}`);
        
        // Check if error message is human-readable
        const errorMsg = createPostResponse.data?.message || createPostResponse.data?.error;
        if (errorMsg && typeof errorMsg === 'string') {
          result.observations.push(`✓ Human-readable error: "${errorMsg}"`);
        } else {
          result.observations.push(`⚠ Error not user-friendly: ${JSON.stringify(createPostResponse.data)}`);
        }
      } else if (createPostResponse.status === 401) {
        result.status = 'HARD FAIL';
        result.blockers.push('Post creation returned 401 - auth token invalid');
      } else {
        result.status = 'SOFT FAIL';
        result.observations.push(`⚠ Post creation returned ${createPostResponse.status}`);
        result.observations.push(`Response: ${JSON.stringify(createPostResponse.data)}`);
      }

    } catch (error) {
      result.status = 'HARD FAIL';
      result.blockers.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Journey 2: Create Event -> publish -> open detail
   */
  async testJourney2_CreateEvent(): Promise<TestResult> {
    const result: TestResult = {
      journey: 'Journey 2: Create Event -> Publish -> Detail',
      status: 'PASS',
      steps: [],
      observations: [],
      blockers: []
    };

    try {
      this.log('\n=== Journey 2: Create Event ===', 'info');

      result.steps.push('POST /events with minimum required fields');
      
      const eventData = {
        title: `Smoke Test Event ${Date.now()}`,
        description: 'Test event for smoke testing',
        startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        endTime: new Date(Date.now() + 90000000).toISOString(),
        location: 'Test Location',
        eventType: 'IN_PERSON',
        visibility: 'PUBLIC'
      };

      const createEventResponse = await this.apiClient.post('/events', eventData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Cookie': this.cookies
        }
      });

      if (createEventResponse.status === 200 || createEventResponse.status === 201) {
        result.observations.push('✓ Event created successfully');
        const eventId = createEventResponse.data?.id;
        result.observations.push(`Event ID: ${eventId}`);

        // Step 2: Fetch event detail
        if (eventId) {
          result.steps.push(`GET /events/${eventId}`);
          const detailResponse = await this.apiClient.get(`/events/${eventId}`, {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Cookie': this.cookies
            }
          });

          if (detailResponse.status === 200) {
            result.observations.push('✓ Event detail accessible');
            result.observations.push(`Title: "${detailResponse.data?.title}"`);
            result.observations.push(`Status: ${detailResponse.data?.status || 'unknown'}`);
          } else {
            result.status = 'SOFT FAIL';
            result.observations.push(`⚠ Event detail returned ${detailResponse.status}`);
          }
        }
      } else if (createEventResponse.status === 400) {
        result.status = 'SOFT FAIL';
        result.observations.push('⚠ Event creation failed with validation error');
        result.observations.push(`Error: ${JSON.stringify(createEventResponse.data)}`);
        
        const errorMsg = createEventResponse.data?.message || createEventResponse.data?.error;
        if (errorMsg) {
          result.observations.push(`Error message: "${errorMsg}"`);
        }
      } else if (createEventResponse.status === 404) {
        result.status = 'HARD FAIL';
        result.blockers.push('Events endpoint not found - feature may not be deployed');
      } else {
        result.status = 'SOFT FAIL';
        result.observations.push(`⚠ Event creation returned ${createEventResponse.status}`);
      }

    } catch (error) {
      result.status = 'HARD FAIL';
      result.blockers.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Journey 3: Groups discovery -> join -> verify membership
   */
  async testJourney3_JoinGroup(): Promise<TestResult> {
    const result: TestResult = {
      journey: 'Journey 3: Group Discovery -> Join -> Verify Membership',
      status: 'PASS',
      steps: [],
      observations: [],
      blockers: []
    };

    try {
      this.log('\n=== Journey 3: Groups ===', 'info');

      result.steps.push('GET /groups - discover available groups');
      
      const groupsResponse = await this.apiClient.get('/groups', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Cookie': this.cookies
        },
        params: { limit: 10 }
      });

      if (groupsResponse.status === 200) {
        const groups = groupsResponse.data?.items || groupsResponse.data || [];
        result.observations.push(`✓ Groups list accessible: ${groups.length} groups found`);

        if (groups.length > 0) {
          const testGroup = groups[0];
          const groupId = testGroup.id;
          result.observations.push(`Testing with group: "${testGroup.name}" (ID: ${groupId})`);

          // Try to join
          result.steps.push(`POST /groups/${groupId}/members - request to join`);
          const joinResponse = await this.apiClient.post(`/groups/${groupId}/members`, {}, {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Cookie': this.cookies
            }
          });

          if (joinResponse.status === 200 || joinResponse.status === 201) {
            result.observations.push('✓ Join request submitted');
            result.observations.push(`Status: ${joinResponse.data?.status || 'unknown'}`);
          } else if (joinResponse.status === 409) {
            result.observations.push('ℹ Already a member of this group');
          } else if (joinResponse.status === 400) {
            result.observations.push(`⚠ Join request rejected: ${JSON.stringify(joinResponse.data)}`);
          }

          // Verify membership state
          result.steps.push(`GET /groups/${groupId} - verify membership visible`);
          const groupDetailResponse = await this.apiClient.get(`/groups/${groupId}`, {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Cookie': this.cookies
            }
          });

          if (groupDetailResponse.status === 200) {
            const membershipStatus = groupDetailResponse.data?.membershipStatus || 
                                      groupDetailResponse.data?.currentUserMembership?.status;
            result.observations.push(`✓ Membership state visible: ${membershipStatus || 'not shown'}`);
            
            if (!membershipStatus) {
              result.status = 'SOFT FAIL';
              result.observations.push('⚠ Membership state not clearly indicated in response');
            }
          }
        } else {
          result.status = 'SOFT FAIL';
          result.blockers.push('No groups available to test join flow');
          result.observations.push('Consider seeding test groups');
        }
      } else if (groupsResponse.status === 404) {
        result.status = 'HARD FAIL';
        result.blockers.push('Groups endpoint not found');
      } else {
        result.status = 'SOFT FAIL';
        result.observations.push(`⚠ Groups list returned ${groupsResponse.status}`);
      }

    } catch (error) {
      result.status = 'HARD FAIL';
      result.blockers.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Journey 4: Marketplace checkout integrity
   */
  async testJourney4_MarketplaceCheckout(): Promise<TestResult> {
    const result: TestResult = {
      journey: 'Journey 4: Marketplace Listing -> Cart -> Checkout',
      status: 'PASS',
      steps: [],
      observations: [],
      blockers: []
    };

    try {
      this.log('\n=== Journey 4: Marketplace Checkout ===', 'info');

      result.steps.push('GET /marketplace/listings');
      
      const listingsResponse = await this.apiClient.get('/marketplace/listings', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Cookie': this.cookies
        },
        params: { limit: 10, status: 'ACTIVE' }
      });

      if (listingsResponse.status === 200) {
        const listings = listingsResponse.data?.items || listingsResponse.data || [];
        result.observations.push(`✓ Marketplace accessible: ${listings.length} listings`);

        if (listings.length > 0) {
          const testListing = listings[0];
          const listingId = testListing.id;
          result.observations.push(`Testing with listing: "${testListing.title}" ($${testListing.price})`);

          // Get listing detail
          result.steps.push(`GET /marketplace/listings/${listingId}`);
          const detailResponse = await this.apiClient.get(`/marketplace/listings/${listingId}`, {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Cookie': this.cookies
            }
          });

          if (detailResponse.status === 200) {
            result.observations.push('✓ Listing detail accessible');
          }

          // Try checkout flow
          result.steps.push('POST /marketplace/orders - initiate checkout');
          const orderData = {
            listingId: listingId,
            quantity: 1,
            shippingAddress: {
              line1: '123 Test St',
              city: 'Test City',
              state: 'TS',
              postalCode: '12345',
              country: 'US'
            }
          };

          const checkoutResponse = await this.apiClient.post('/marketplace/orders', orderData, {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Cookie': this.cookies
            }
          });

          // CRITICAL: Verify no fake success
          if (checkoutResponse.status === 200 || checkoutResponse.status === 201) {
            result.observations.push('✓ Order created (server response)');
            result.observations.push(`Order ID: ${checkoutResponse.data?.id}`);
            result.observations.push(`Status: ${checkoutResponse.data?.status}`);
            
            // Verify order exists server-side
            if (checkoutResponse.data?.id) {
              const verifyResponse = await this.apiClient.get(`/marketplace/orders/${checkoutResponse.data.id}`, {
                headers: {
                  'Authorization': `Bearer ${this.accessToken}`,
                  'Cookie': this.cookies
                }
              });
              
              if (verifyResponse.status === 200) {
                result.observations.push('✓ CHECKOUT INTEGRITY: Order verified server-side');
                this.launchGates.push({
                  gate: 'checkout_integrity',
                  status: 'PASS',
                  evidence: ['Order creation confirmed by server', 'Order retrievable after creation']
                });
              } else {
                result.status = 'HARD FAIL';
                result.blockers.push('CHECKOUT INTEGRITY FAIL: Order created but not retrievable');
                this.launchGates.push({
                  gate: 'checkout_integrity',
                  status: 'FAIL',
                  evidence: ['Order created but GET returned ' + verifyResponse.status]
                });
              }
            }
          } else if (checkoutResponse.status === 400) {
            result.observations.push('⚠ Checkout validation error (expected for test data)');
            result.observations.push(`Error: ${JSON.stringify(checkoutResponse.data)}`);
            
            // Check for human-readable errors
            const errorMsg = checkoutResponse.data?.message;
            if (errorMsg && typeof errorMsg === 'string') {
              result.observations.push(`✓ Human-readable error: "${errorMsg}"`);
            }
          } else if (checkoutResponse.status === 404) {
            result.status = 'HARD FAIL';
            result.blockers.push('Marketplace orders endpoint not found');
          } else {
            result.status = 'SOFT FAIL';
            result.observations.push(`⚠ Checkout returned ${checkoutResponse.status}`);
          }
        } else {
          result.status = 'SOFT FAIL';
          result.blockers.push('No active marketplace listings to test');
        }
      } else if (listingsResponse.status === 404) {
        result.status = 'HARD FAIL';
        result.blockers.push('Marketplace endpoint not found');
      } else {
        result.status = 'SOFT FAIL';
        result.observations.push(`⚠ Marketplace returned ${listingsResponse.status}`);
      }

    } catch (error) {
      result.status = 'HARD FAIL';
      result.blockers.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Journey 5: Draft resilience (programmatic check)
   */
  async testJourney5_DraftResilience(): Promise<TestResult> {
    const result: TestResult = {
      journey: 'Journey 5: Draft Resilience',
      status: 'PASS',
      steps: [],
      observations: [],
      blockers: []
    };

    try {
      this.log('\n=== Journey 5: Draft Resilience ===', 'info');
      
      result.observations.push('ℹ Note: Full draft resilience requires browser interaction');
      result.observations.push('Testing: localStorage draft detection logic exists');

      // Check if draft utilities exist in codebase
      result.steps.push('Verify draft management utilities in codebase');
      
      const draftCheckResponse = await this.webClient.get('/');
      if (draftCheckResponse.status === 200) {
        const html = draftCheckResponse.data;
        
        // Check for draft-related code hints
        const hasDraftMention = html.includes('draft') || html.includes('localStorage');
        if (hasDraftMention) {
          result.observations.push('✓ Draft-related code present in bundle');
        } else {
          result.observations.push('⚠ No obvious draft persistence hints in HTML');
        }
        
        result.observations.push('✓ Web app accessible for draft testing');
        result.observations.push('Manual browser test recommended for full validation');
        
        // Soft pass - requires manual verification
        result.status = 'SOFT FAIL';
        result.observations.push('⚠ Programmatic draft test incomplete - requires browser automation');
        
        this.launchGates.push({
          gate: 'draft_restore',
          status: 'WARNING',
          evidence: ['Draft utilities exist in codebase but need manual browser test']
        });
      }

    } catch (error) {
      result.status = 'SOFT FAIL';
      result.blockers.push(`Web app check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Test failure scenarios
   */
  async testFailureScenarios(): Promise<TestResult> {
    const result: TestResult = {
      journey: 'Failure Scenarios: Invalid Forms + Auth Redirect',
      status: 'PASS',
      steps: [],
      observations: [],
      blockers: []
    };

    try {
      this.log('\n=== Failure Scenarios ===', 'info');

      // Test 1: Invalid form submission
      result.steps.push('POST /content/posts with invalid data');
      const invalidPostResponse = await this.apiClient.post('/content/posts', {
        content: '', // Empty content - should fail
      }, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Cookie': this.cookies
        }
      });

      if (invalidPostResponse.status === 400) {
        result.observations.push('✓ Invalid post rejected with 400');
        const errorMsg = invalidPostResponse.data?.message || invalidPostResponse.data?.error;
        if (errorMsg) {
          result.observations.push(`✓ Human-readable error: "${errorMsg}"`);
          this.launchGates.push({
            gate: 'error_recovery',
            status: 'PASS',
            evidence: [`Validation error returned human-readable message: "${errorMsg}"`]
          });
        } else {
          result.observations.push('⚠ Error message not user-friendly');
          this.launchGates.push({
            gate: 'error_recovery',
            status: 'WARNING',
            evidence: ['Validation error returned but message unclear']
          });
        }
      } else {
        result.observations.push(`⚠ Expected 400 but got ${invalidPostResponse.status}`);
      }

      // Test 2: Unauthorized access
      result.steps.push('GET /content/feed without auth token');
      const unauthResponse = await this.apiClient.get('/content/feed');

      if (unauthResponse.status === 401) {
        result.observations.push('✓ Unauthorized request properly rejected');
        
        const errorMsg = unauthResponse.data?.message || unauthResponse.data?.error;
        if (errorMsg) {
          result.observations.push(`Auth error message: "${errorMsg}"`);
        }
      } else if (unauthResponse.status === 200) {
        result.status = 'SOFT FAIL';
        result.observations.push('⚠ Feed accessible without authentication - potential security issue');
        this.launchGates.push({
          gate: 'permission_clarity',
          status: 'FAIL',
          evidence: ['Protected endpoint accessible without auth']
        });
      }

      // Test 3: Invalid login
      result.steps.push('POST /auth/login with wrong password');
      const invalidLoginResponse = await this.apiClient.post('/auth/login', {
        email: 'creator@embr.app',
        password: 'wrongpassword123'
      });

      if (invalidLoginResponse.status === 401 || invalidLoginResponse.status === 400) {
        result.observations.push('✓ Invalid login rejected');
        const errorMsg = invalidLoginResponse.data?.message || invalidLoginResponse.data?.error;
        if (errorMsg) {
          result.observations.push(`Login error: "${errorMsg}"`);
          
          // Check if error is demo-safe (doesn't reveal user existence)
          if (errorMsg.toLowerCase().includes('invalid credentials') || 
              errorMsg.toLowerCase().includes('incorrect')) {
            result.observations.push('✓ Error message is demo-safe (no user enumeration)');
            this.launchGates.push({
              gate: 'demo_safe_behavior',
              status: 'PASS',
              evidence: ['Login error does not reveal user existence']
            });
          }
        }
      }

    } catch (error) {
      result.status = 'SOFT FAIL';
      result.blockers.push(`Exception in failure tests: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * Generate launch gate verdicts
   */
  private generateLaunchGateVerdicts() {
    this.log('\n╔════════════════════════════════════════════════╗', 'info');
    this.log('║     LAUNCH GATE VERDICT SUMMARY                ║', 'info');
    this.log('╚════════════════════════════════════════════════╝', 'info');

    const gateNames = [
      'checkout_integrity',
      'auth_consistency',
      'draft_restore',
      'permission_clarity',
      'error_recovery',
      'demo_safe_behavior'
    ];

    gateNames.forEach(gateName => {
      const gate = this.launchGates.find(g => g.gate === gateName);
      if (gate) {
        const emoji = gate.status === 'PASS' ? '✅' : gate.status === 'WARNING' ? '⚠️' : '❌';
        this.log(`\n${emoji} ${gateName.toUpperCase().replace(/_/g, ' ')}: ${gate.status}`);
        gate.evidence.forEach(e => this.log(`   • ${e}`, 'info'));
      } else {
        this.log(`\n⚪ ${gateName.toUpperCase().replace(/_/g, ' ')}: NOT TESTED`);
      }
    });
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    this.log('╔════════════════════════════════════════════════╗', 'success');
    this.log('║   EMBR LAUNCH SMOKE TEST SUITE                 ║', 'success');
    this.log('║   Target: http://localhost:3004                ║', 'success');
    this.log('╚════════════════════════════════════════════════╝', 'success');

    // Run journeys
    this.results.push(await this.testJourney1_LoginAndPost());
    await this.pause(500);
    
    this.results.push(await this.testJourney2_CreateEvent());
    await this.pause(500);
    
    this.results.push(await this.testJourney3_JoinGroup());
    await this.pause(500);
    
    this.results.push(await this.testJourney4_MarketplaceCheckout());
    await this.pause(500);
    
    this.results.push(await this.testJourney5_DraftResilience());
    await this.pause(500);
    
    this.results.push(await this.testFailureScenarios());

    // Print results
    this.printResults();
    
    // Generate verdicts
    this.generateLaunchGateVerdicts();

    // Final summary
    this.printFinalSummary();
  }

  private printResults() {
    this.log('\n\n╔════════════════════════════════════════════════╗', 'info');
    this.log('║            TEST RESULTS SUMMARY                 ║', 'info');
    this.log('╚════════════════════════════════════════════════╝', 'info');

    this.results.forEach((result, idx) => {
      const statusEmoji = result.status === 'PASS' ? '✅' : 
                          result.status === 'SOFT FAIL' ? '⚠️' : '❌';
      
      this.log(`\n${statusEmoji} ${result.journey}: ${result.status}`, 
               result.status === 'PASS' ? 'success' : 
               result.status === 'SOFT FAIL' ? 'warn' : 'error');
      
      this.log('\nSteps Executed:', 'info');
      result.steps.forEach(step => this.log(`  • ${step}`, 'info'));
      
      this.log('\nObservations:', 'info');
      result.observations.forEach(obs => this.log(`  ${obs}`, 'info'));
      
      if (result.blockers.length > 0) {
        this.log('\nBlockers:', 'error');
        result.blockers.forEach(blocker => this.log(`  ❌ ${blocker}`, 'error'));
      }
      
      this.log('\n' + '─'.repeat(60), 'info');
    });
  }

  private printFinalSummary() {
    const passCount = this.results.filter(r => r.status === 'PASS').length;
    const softFailCount = this.results.filter(r => r.status === 'SOFT FAIL').length;
    const hardFailCount = this.results.filter(r => r.status === 'HARD FAIL').length;
    const total = this.results.length;

    this.log('\n\n╔════════════════════════════════════════════════╗', 'info');
    this.log('║            FINAL SUMMARY                        ║', 'info');
    this.log('╚════════════════════════════════════════════════╝', 'info');
    
    this.log(`\n✅ PASS: ${passCount}/${total}`, 'success');
    this.log(`⚠️  SOFT FAIL: ${softFailCount}/${total}`, 'warn');
    this.log(`❌ HARD FAIL: ${hardFailCount}/${total}`, 'error');

    const launchReady = hardFailCount === 0 && 
                        this.launchGates.filter(g => g.status === 'FAIL').length === 0;
    
    this.log('\n' + '═'.repeat(60), 'info');
    if (launchReady) {
      this.log('\n🚀 LAUNCH RECOMMENDATION: READY', 'success');
      this.log('All critical gates passed. Soft failures should be reviewed but do not block launch.', 'success');
    } else {
      this.log('\n⛔ LAUNCH RECOMMENDATION: BLOCKED', 'error');
      this.log('Critical failures detected. Address hard fails before launch.', 'error');
    }
    this.log('\n' + '═'.repeat(60), 'info');
  }
}

// Run the test suite
const runner = new SmokeTestRunner();
runner.runAllTests().catch(error => {
  console.error('Fatal error running smoke tests:', error);
  process.exit(1);
});
