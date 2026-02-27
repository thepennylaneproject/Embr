# Music Domain Audit Report

**Date:** February 26, 2026
**Codebase:** Embr Creator Platform
**Domain:** Music (SDK, Artist Profiles, Track Management, Licensing, Revenue)
**Scope:** Backend services, frontend components, SDK client, type definitions

---

## Executive Summary

The Music domain provides artist profiles, track management, licensing workflows, and revenue tracking. The architecture consists of:
- **Backend:** NestJS with Express routes (non-standard pattern)
- **Frontend:** React components with custom hooks
- **SDK:** TypeScript client with Axios
- **Database:** Prisma ORM with PostgreSQL

**Overall Risk Level:** 🔴 **HIGH** - Multiple critical authorization and data protection issues

---

## 🔴 Critical Issues

### Issue #1: Missing Authorization on Track Updates
**File:** `apps/api/src/music/controllers/musicController.ts` (lines 122-129, 173-189)

**Problem:** The `PUT /tracks/:trackId/publish` and `PUT /tracks/:trackId/licensing` endpoints have `requireAuth` middleware but don't verify the authenticated user is the track owner. Any authenticated user can publish or modify licensing on any track.

**Risk Level:** CRITICAL - Data integrity violation; artists can sabotage each other's tracks

**Code Example:**
```typescript
// VULNERABLE: No ownership check
async publishTrack(req: Request, res: Response) {
  const { trackId } = req.params;
  const track = await trackService.publishTrack(trackId);  // No userId check
  res.json(track);
}
```

**Impact:**
- Any creator can publish/unpublish tracks they don't own
- Any creator can modify licensing on tracks they don't own
- Malicious users could change "restricted" to "free" to bypass licensing

**Fix:**
```typescript
async publishTrack(req: Request, res: Response) {
  try {
    const { trackId } = req.params;
    const userId = (req as any).user?.id;

    // Get track and verify ownership
    const track = await trackService.getTrack(trackId);
    const artist = await prisma.artist.findUnique({
      where: { id: track.artistId }
    });

    if (artist.userId !== userId) {
      return res.status(403).json({ error: 'Not track owner' });
    }

    const published = await trackService.publishTrack(trackId);
    res.json(published);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

### Issue #2: Missing Authorization on Artist Profile Updates
**File:** `apps/api/src/music/controllers/musicController.ts` (lines 48-57)

**Problem:** The `PUT /artists/:artistId` endpoint allows any authenticated user to update any artist profile (including changing stage name, bio, avatar).

**Risk Level:** CRITICAL - Account takeover / identity spoofing

**Code Example:**
```typescript
// VULNERABLE: No ownership check
async updateArtist(req: Request, res: Response) {
  const { artistId } = req.params;
  const data = req.body;
  const artist = await artistService.updateArtist(artistId, data);  // No verification
  res.json(artist);
}
```

**Impact:**
- Users can impersonate artists by changing profile info
- Profile pictures can be replaced maliciously
- Artist bios/social links can be hijacked

**Fix:**
```typescript
async updateArtist(req: Request, res: Response) {
  try {
    const { artistId } = req.params;
    const userId = (req as any).user?.id;
    const data = req.body;

    // Verify ownership
    const artist = await prisma.artist.findUnique({
      where: { id: artistId }
    });

    if (!artist || artist.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Don't allow verification status to be changed
    if (data.isVerified !== undefined) {
      delete data.isVerified;
    }

    const updated = await artistService.updateArtist(artistId, data);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

### Issue #3: Licensing Check Endpoint Not Protected
**File:** `apps/api/src/music/controllers/musicController.ts` (lines 197-214)
**Route:** `GET /licensing/check?trackId=X&creatorId=Y` (from routes/index.ts line 55)

**Problem:** The licensing check endpoint has NO authentication requirement (`requireAuth` not applied). Any unauthenticated user can query the licensing status and configuration of any track.

**Risk Level:** CRITICAL - Information disclosure; competitive intelligence leak

**Code Example:**
```typescript
// From routes/index.ts - NO requireAuth
router.get('/licensing/check', licensingController.checkLicensing);

// Anyone can call:
// GET /api/music/licensing/check?trackId=track-123&creatorId=creator-456
// Returns: licensing model, remix/monetization/attribution flags
```

**Impact:**
- Competitors can analyze artist licensing strategies
- Attackers can enumerate all track licensing configurations
- Sensitive business intelligence exposed

**Fix:**
```typescript
// Add authentication requirement
router.get('/licensing/check', requireAuth, licensingController.checkLicensing);

// Also validate the requestor has permission to check for this creatorId
async checkLicensing(req: Request, res: Response) {
  try {
    const { trackId, creatorId } = req.query;
    const userId = (req as any).user?.id;

    // Only allow users to check licensing for themselves
    if (userId !== creatorId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await licensingService.checkLicensing(...);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

### Issue #4: Revenue Update Endpoint Not Protected
**File:** `apps/api/src/music/controllers/musicController.ts` (lines 284-299)
**Route:** `PUT /usage/:usageId/revenue` (from routes/index.ts line 71)

**Problem:** The revenue update endpoint does NOT have `requireAuth` middleware. Anyone (unauthenticated) can modify revenue figures for any track usage.

**Risk Level:** CRITICAL - Financial fraud; revenue manipulation

**Code Example:**
```typescript
// From routes/index.ts - NO requireAuth
router.put('/usage/:usageId/revenue', revenueController.updateUsageRevenue);

// Unauthenticated attacker can:
POST /api/music/usage/usage-123/revenue
{
  "totalRevenue": 999999,
  "impressions": 999999,
  "engagements": 999999
}
```

**Impact:**
- Artists could inflate their own revenue figures
- Creators could claim unearned revenue shares
- Platform payouts could be fraudulently inflated
- Complete financial system integrity failure

**Fix:**
```typescript
router.put('/usage/:usageId/revenue', requireAuth, revenueController.updateUsageRevenue);

async updateUsageRevenue(req: Request, res: Response) {
  try {
    const { usageId } = req.params;
    const userId = (req as any).user?.id;

    // Verify the user is authorized to update this usage
    // Should be admin only or automated system only
    const usage = await prisma.videoUsage.findUnique({
      where: { id: usageId },
      include: { track: { include: { artist: true } } }
    });

    if (!usage) {
      return res.status(404).json({ error: 'Usage not found' });
    }

    // Restrict to admin or specific service account
    if (!isAdmin(userId)) {
      return res.status(403).json({ error: 'Only admins can update revenue' });
    }

    const updated = await revenueService.updateUsageRevenue(usageId, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

### Issue #5: SDK Token Handling Not Secure
**File:** `packages/music-sdk/src/client.ts` (lines 33-36, 135-142)

**Problem:** The SDK requires a token to be passed at client initialization. There's no mechanism to load this securely from environment variables or secure storage. Developers might hardcode tokens in client-side code.

**Risk Level:** CRITICAL - Credential exposure; API key in source code

**Current Implementation:**
```typescript
export interface ClientConfig {
  token: string;  // Must be passed explicitly
  baseURL?: string;
}

// Usage - token could be hardcoded
const music = new EmbrtMusicClient({
  token: 'sk_live_12345...',  // ⚠️ BAD: Hardcoded in code
  baseURL: 'https://api.embr.dev/v1/music'
});
```

**Risk:**
- Token exposed in GitHub repositories
- Token leaked in client bundles (browser console)
- No automatic token rotation
- No environment-based configuration

**Fix:**
```typescript
// SDK should support environment variables
export interface ClientConfig {
  token?: string;
  baseURL?: string;
  useEnvToken?: boolean;  // Use process.env.EMBR_MUSIC_API_TOKEN
}

export class EmbrtMusicClient {
  constructor(config: ClientConfig) {
    const token = config.token ||
      (config.useEnvToken ? process.env.EMBR_MUSIC_API_TOKEN : undefined);

    if (!token) {
      throw new Error(
        'Music API token required. Pass token or set EMBR_MUSIC_API_TOKEN env var'
      );
    }

    this.client = axios.create({
      baseURL: config.baseURL || 'https://api.embr.dev/v1/music',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }
}
```

Also update frontend initialization:
```typescript
// apps/web/src/components/music/hooks/useMusic.ts
const client = useMemo(() => {
  // Client-side SDK should NOT have API token
  // Use fetch with implicit auth (from auth context)
  // Or use a backend proxy endpoint
  return new EmbrtMusicClient({
    baseURL: '/api/music',  // Use proxy, not direct API
  });
}, []);
```

---

## 🟡 Warning Issues

### Warning #1: Music Player Allows Download Without License Validation
**File:** `apps/web/src/components/music/player/MusicPlayer.tsx` (lines 111-113)

**Problem:** The player shows a "Download" button without checking if the track allows downloads based on its licensing model.

**Risk Level:** WARNING - License agreement violation

**Code:**
```typescript
<button className="text-xs bg-embr-primary-400 hover:bg-embr-primary-500 text-white px-3 py-1 rounded-full transition">
  <Download size={14} className="inline mr-1" />
  Download
</button>
```

**Issue:** No check of `track.licensingModel` or `track.allowDownload` status before enabling download.

**Fix:**
```typescript
const canDownload = track?.allowDownload &&
  !['restricted', 'exclusive'].includes(track?.licensingModel);

<button
  disabled={!canDownload}
  className={`text-xs px-3 py-1 rounded-full transition ${
    canDownload
      ? 'bg-embr-primary-400 hover:bg-embr-primary-500 text-white cursor-pointer'
      : 'bg-gray-300 text-gray-600 cursor-not-allowed'
  }`}
>
  <Download size={14} className="inline mr-1" />
  {canDownload ? 'Download' : 'Download Not Allowed'}
</button>
```

---

### Warning #2: No Rate Limiting on Stream Recording
**File:** `apps/api/src/music/controllers/musicController.ts` (lines 265-278)

**Problem:** The `POST /stream` endpoint records stream plays with no rate limiting. Users could artificially inflate stream counts by recording multiple streams for the same track.

**Risk Level:** WARNING - Chart manipulation; artificially inflated metrics

**Code:**
```typescript
// Records stream immediately, no validation
async recordStream(req: Request, res: Response) {
  const { trackId, durationPlayed, quality } = req.body;
  const userId = (req as any).user?.id;

  const play = await revenueService.recordStream(
    trackId,
    userId,
    durationPlayed,
    quality || 'standard',
  );

  res.json(play);  // No limit on how often this can be called
}
```

**Fix:**
```typescript
// Add rate limiting and validation
const streamCache = new Map<string, number>();  // userId -> lastStreamTime

async recordStream(req: Request, res: Response) {
  const { trackId, durationPlayed, quality } = req.body;
  const userId = (req as any).user?.id;

  // Validate minimum play duration
  if ((durationPlayed || 0) < 30) {
    return res.status(400).json({
      error: 'Must play at least 30 seconds to count as stream'
    });
  }

  // Rate limiting: max 1 stream per track per user per minute
  const cacheKey = `${userId}:${trackId}`;
  const lastStream = streamCache.get(cacheKey);

  if (lastStream && Date.now() - lastStream < 60000) {
    return res.status(429).json({
      error: 'Too many streams. Please wait before streaming again.'
    });
  }

  const play = await revenueService.recordStream(trackId, userId, durationPlayed, quality);
  streamCache.set(cacheKey, Date.now());

  res.json(play);
}
```

---

### Warning #3: No SDK Error Handling / Retry Logic
**File:** `packages/music-sdk/src/client.ts` (lines 144-150)

**Problem:** SDK has basic error handling but no retry logic or exponential backoff for transient failures.

**Risk Level:** WARNING - Unreliable SDK; no graceful degradation

**Code:**
```typescript
this.client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const apiError = error.response?.data;
    if (apiError) {
      throw new MusicApiError(apiError.code, apiError.message, apiError.details);
    }
    throw error;  // Generic network errors not handled
  },
);
```

**Issues:**
- Network timeouts not retried
- No exponential backoff
- No circuit breaker pattern
- SDK calls can fail completely on transient errors

**Fix:**
```typescript
export class EmbrtMusicClient {
  private retryConfig = {
    maxRetries: 3,
    initialDelayMs: 100,
    maxDelayMs: 2000,
    backoffMultiplier: 2,
  };

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    attempt = 0
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt < this.retryConfig.maxRetries && this.isRetryable(error)) {
        const delay = Math.min(
          this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
          this.retryConfig.maxDelayMs
        );

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryWithBackoff(fn, attempt + 1);
      }

      throw error;
    }
  }

  private isRetryable(error: any): boolean {
    // Retry on network errors and 5xx
    if (!error.response) return true;  // Network error
    return error.response.status >= 500 || error.response.status === 429;  // Server error or rate limit
  }
}
```

---

### Warning #4: Play Count Can Be Manipulated
**File:** `apps/api/src/music/services/musicService.ts` (lines 300-329)

**Problem:** Stream recording doesn't verify actual playback. The `recordStream` function just accepts whatever values the client sends.

**Risk Level:** WARNING - Play count inflation; chart manipulation

**Code:**
```typescript
async recordStream(trackId: string, userId: string | null, durationPlayed: number, quality: string) {
  const track = await prisma.track.findUnique({ where: { id: trackId } });

  if (!track) {
    throw new Error('Track not found');
  }

  // No validation of durationPlayed
  const royaltyAmount = 0.003;

  const play = await prisma.trackPlay.create({
    data: {
      trackId,
      userId: userId || undefined,
      durationPlayed,  // ⚠️ Trusts client value
      quality: quality as any,
      royaltyAmount,
    },
  });

  // Blindly increments stream count
  await prisma.track.update({
    where: { id: trackId },
    data: { streams: { increment: 1n } },
  });

  return play;
}
```

**Attack:**
```typescript
// Attacker can call repeatedly:
POST /api/music/stream
{
  "trackId": "track-123",
  "durationPlayed": 999999,
  "quality": "high"
}
```

**Fix:**
```typescript
async recordStream(trackId: string, userId: string | null, durationPlayed: number, quality: string) {
  const track = await prisma.track.findUnique({ where: { id: trackId } });

  if (!track) {
    throw new Error('Track not found');
  }

  // Validate play duration
  if (!durationPlayed || durationPlayed < 30) {
    throw new Error('Must listen for at least 30 seconds');
  }

  if (durationPlayed > track.duration + 60) {  // Allow 60s buffer
    throw new Error('Invalid play duration (exceeds track length)');
  }

  // Only count as stream if 30+ seconds played
  const countsAsStream = durationPlayed >= 30;
  const royaltyAmount = countsAsStream ? 0.003 : 0;

  const play = await prisma.trackPlay.create({
    data: {
      trackId,
      userId: userId || undefined,
      durationPlayed: Math.min(durationPlayed, track.duration),  // Cap at track duration
      quality: quality as any,
      royaltyAmount,
    },
  });

  if (countsAsStream) {
    await prisma.track.update({
      where: { id: trackId },
      data: { streams: { increment: 1n } },
    });
  }

  return play;
}
```

---

### Warning #5: Potential Revenue Double-Counting Between Domains
**File:** `apps/api/src/music/services/musicService.ts` (lines 355-402)

**Problem:** Revenue can be tracked both in the Music domain (`recordStream`) and in the Monetization domain (`tips`). If a post uses music and receives tips, the revenue might be counted twice - once in Tip revenue, once in Music licensing revenue.

**Risk Level:** WARNING - Financial reconciliation issues; payout integrity

**Affected Flows:**
1. Creator posts content with music track → earns revenue from track licensing
2. Creator receives tips on that post → earns revenue from tips
3. Post engagement generates revenue for music usage → creator gets 40% of music licensing revenue

**Scenario:**
```
Post with Music Track:
- Music licensing revenue: $10 (Creator gets 40% = $4)
- Tip revenue: $5 (Creator gets tip)
- Monetization revenue: $0.50 from ad share

Total creator earns: $4 + $5 + $0.50 = $9.50 ✓

But if both systems track independently:
- Music dashboard shows: Creator earned $4 from music
- Monetization dashboard shows: Creator earned $5.50 from post
- Creator might see $9.50 twice or systems don't reconcile properly
```

**Fix:**
Implement a unified revenue ledger:
```typescript
// Create a single revenue event that both domains reference
interface RevenueEvent {
  id: string;
  creatorId: string;
  contentId: string;
  eventType: 'music_usage' | 'tip' | 'monetization';
  source: 'music' | 'monetization' | 'tips';
  amount: number;
  createdAt: Date;
}

// Music domain records:
await prisma.revenueEvent.create({
  data: {
    creatorId,
    contentId: usage.contentId,
    eventType: 'music_usage',
    source: 'music',
    amount: creatorShare,
  }
});

// Monetization domain records:
await prisma.revenueEvent.create({
  data: {
    creatorId,
    contentId: tipId,
    eventType: 'tip',
    source: 'monetization',
    amount: tipAmount,
  }
});
```

---

## 🟢 Suggestions

### Suggestion #1: Migrate Away From Express Routes Pattern
**File:** `apps/api/src/music/music.module.ts`, `apps/api/src/music/routes/index.ts`

**Issue:** The music module uses Express routes directly instead of NestJS @Controller pattern. This is inconsistent with the rest of the codebase and harder to maintain.

**Current Pattern:**
```typescript
// routes/index.ts
router.post('/artists', requireAuth, artistController.createArtist);

// music.module.ts
configure(consumer: MiddlewareConsumer) {
  consumer.apply(musicRoutes).forRoutes({
    path: 'music/*',
    method: RequestMethod.ALL,
  });
}
```

**Recommended Pattern:**
```typescript
@Controller('music')
export class MusicController {
  @Post('artists')
  @UseGuards(JwtAuthGuard)
  createArtist(@Request() req: any, @Body() createArtistDto: CreateArtistDto) {
    return this.musicService.createArtist(req.user.id, createArtistDto);
  }
}

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [MusicController],
})
export class MusicModule {}
```

**Benefit:** Consistent with NestJS patterns, better type safety, easier testing

---

### Suggestion #2: Add Comprehensive SDK Error Handling
**File:** `packages/music-sdk/src/client.ts`

The SDK should provide helpful error messages and fallback strategies.

```typescript
export class EmbrtMusicClient {
  async safeCall<T>(
    fn: () => Promise<T>,
    fallback?: T
  ): Promise<T> {
    try {
      return await this.retryWithBackoff(fn);
    } catch (error) {
      if (fallback !== undefined) {
        console.warn('Music API error, using fallback:', error);
        return fallback;
      }
      throw error;
    }
  }
}

// Usage in frontend:
const tracks = await music.tracks.search({ q: 'ambient' }).catch(() => []);
```

---

### Suggestion #3: Validate Licensing Against Content Type
**File:** `apps/api/src/music/services/musicService.ts` (licensingService)

The licensing check doesn't validate whether the content type is allowed for the licensing model.

```typescript
// Current: Just checks licensing model
if (track.licensingModel === LicensingModel.RESTRICTED) {
  return { allowed: false };
}

// Suggested: Also check content type
async checkLicensing(
  trackId: string,
  creatorId: string,
  contentType: 'video' | 'audio' | 'remix'
): Promise<LicensingInfo> {
  const track = await prisma.track.findUnique({ where: { id: trackId } });

  if (!track) return { allowed: false, reason: 'Track not found' };

  // Validate content type is allowed
  if (contentType === 'remix' && !track.allowRemix) {
    return { allowed: false, reason: 'Remixes not allowed' };
  }

  if (contentType === 'video' && track.licensingModel === 'audio-only') {
    return { allowed: false, reason: 'Not licensed for video use' };
  }

  return { allowed: true, ...track };
}
```

---

## Architecture Issues

### Non-Standard NestJS Pattern
**Severity:** Medium
**Issue:** Using Express routes instead of @Controller classes violates NestJS conventions
**Impact:** Harder to test, less type-safe, inconsistent with gigs/monetization modules
**Recommendation:** Migrate to NestJS controllers

### Missing Tests
**Severity:** Medium
**Issue:** No test files found for music services/controllers
**Impact:** No test coverage for authorization, edge cases
**Recommendation:** Add comprehensive integration tests

---

## Summary: Music Domain Integrity Assessment

| Category | Status | Issues | Severity |
|----------|--------|--------|----------|
| **Authorization** | 🔴 CRITICAL | 4 unprotected endpoints | Critical |
| **Data Protection** | 🟡 WARNING | Manipulable stream counts | High |
| **SDK Security** | 🔴 CRITICAL | Token handling insecure | Critical |
| **Revenue Tracking** | 🟡 WARNING | Potential double-counting | Medium |
| **Licensing Enforcement** | 🟡 WARNING | Download not validated | Medium |
| **Architecture** | 🟡 WARNING | Non-standard patterns | Low |

### Overall Risk Level: 🔴 **CRITICAL**

**Blocking Issues (Must Fix Before Production):**
1. ✋ Artist profile update authorization (any user can impersonate any artist)
2. ✋ Track update/licensing authorization (any user can modify any track)
3. ✋ Revenue update authorization (unauthenticated users can commit fraud)
4. ✋ Licensing check authorization (sensitive business intel exposed)
5. ✋ SDK token handling (credentials exposed in code)

**Estimated Remediation Effort:**
- Authorization fixes: 4-6 hours
- SDK security: 2-3 hours
- Play count validation: 2-3 hours
- Revenue reconciliation: 4-6 hours
- **Total: 12-18 hours**

**Recommended Action:** Immediate security patch required before accepting any music revenue or allowing artist profile updates in production.

---

## Next Steps

1. **Immediate (Today):**
   - Add authorization checks to all track/artist mutation endpoints
   - Protect licensing check and revenue endpoints
   - Fix SDK token handling

2. **Short-term (This Week):**
   - Add stream count validation
   - Implement rate limiting
   - Add comprehensive tests

3. **Medium-term (Next Sprint):**
   - Implement revenue reconciliation between domains
   - Migrate to standard NestJS pattern
   - Add SDK retry/backoff logic

4. **Long-term:**
   - Add comprehensive monitoring/alerting
   - Implement revenue audit trails
   - Add analytics for fraud detection
