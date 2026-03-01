# EMBR Launch Roadmap
## What to Build & When (12-Month Plan)

---

## Philosophy

**Build in this order:**
1. **Get creators earning** (month 1-3)
2. **Make earnings visible** (month 3-4)
3. **Multiple revenue streams** (month 4-6)
4. **Discovery/growth** (month 6-9)
5. **Collective power** (month 9-12)

**NOT:**
- ❌ Fancy features nobody uses
- ❌ Algorithms before you have creators
- ❌ Social graphs before community
- ❌ Governance before you have a community to govern

---

## Phase 0: MVP Launch (Before Week 1)

### What Exists Now ✅
- Feed/posts
- Create page
- User profiles
- Messages
- Music licensing
- Gigs booking
- Marketplace
- Wallet/payments

### What Needs to Happen

```
WEEK 1: Final touches before launch
├─ [ ] Apply new design system to Feed
├─ [ ] Apply new design system to Create page
├─ [ ] Update navigation labels (Wallet → Earnings, etc.)
├─ [ ] Create "Why Embr?" landing page
├─ [ ] Write transparency message about 2% fee
└─ [ ] Test basic earn flow: Post → Get tip → See in earnings

WEEK 2: Pre-launch
├─ [ ] Set up analytics (track creator onboarding, first earnings)
├─ [ ] Create onboarding flow (explain mission, 2% fee, how to earn)
├─ [ ] Write help docs
├─ [ ] Set up customer support system
└─ [ ] Soft launch to 20 friends/testers

WEEK 3: LAUNCH 🚀
├─ Launch publicly
├─ Use network to get first 50 creators
├─ Daily check-ins: Are people earning? Are they happy?
└─ Focus: First 10 creators posting and getting tips
```

**Timeline:** 3 weeks
**Team:** You + 1 contractor for design system implementation
**Goal:** Launch with clean, clear interface. Creators understand mission.

---

## Phase 1: Get Creators Earning (Weeks 4-8)

### Goal
**100+ creators, average $300-500/month earning, month 3 ends with $2.6k/month platform revenue**

### What to Build

#### Week 4-5: Make Earnings Crystal Clear

```
PRIMARY FEATURE: Earnings Dashboard

What exists: Wallet shows balance
What's missing: Breakdown of WHERE earnings came from

Build:
├─ Earnings dashboard showing:
│  ├─ Total this month
│  ├─ Money from gigs
│  ├─ Money from tips
│  ├─ Money from music licensing
│  ├─ Money from marketplace sales
│  ├─ Fees (2% platform + 3% payment processor)
│  └─ What you keep
├─ Visual breakdown (simple bar chart or list)
├─ Historical view (last 3 months, 6 months, year)
└─ Export (CSV for taxes)

Design: Follow design system
├─ Large number at top ($X earned)
├─ Simple breakdown below
├─ Clear math (no hidden fees)
└─ Professional, not gamified

Why: Creators need to see "I'm actually earning money here"
This is the #1 retention driver.

Effort: 2-3 days
```

#### Week 5-6: Onboarding + First Earning

```
SECONDARY FEATURE: Creator Onboarding

What exists: Sign up, create profile
What's missing: Guided tour showing HOW to earn

Build:
├─ After sign up, show 4-step onboarding:
│  ├─ Step 1: Create your first post
│  ├─ Step 2: Set up a gig offer
│  ├─ Step 3: Share your profile
│  └─ Step 4: Check your earnings
├─ In-app tooltip: "You earned $0.50 from a tip!"
├─ Email: "Great! You earned your first $X"
└─ Next: "Here's how to earn more..."

Design: Minimal, non-intrusive
├─ One step at a time
├─ Clear CTA per step
└─ Can close anytime

Why: Creators who earn early stay. Period.
Effort: 2 days
```

#### Week 6-7: Payment Settings

```
TERTIARY FEATURE: Payment Methods

What exists: Wallet shows balance
What's missing: Easy way to withdraw

Build:
├─ Earnings dashboard has button: [Withdraw to Bank]
├─ Connect bank account (Stripe ACH)
├─ Set minimum withdrawal ($10? $50?)
├─ Show when payouts happen (weekly? monthly?)
├─ Transparency: "You'll see X% fee from bank"
└─ History: View past withdrawals

Design: Simple form
├─ Bank routing + account number
├─ Verification (micro-deposits)
├─ Done in <5 minutes

Why: Creators need to actually GET their money, not just see a balance
Effort: 2 days (Stripe handles heavy lifting)
```

#### Week 7-8: Gigs First Push

```
FEATURE: Make Gigs Discoverable

What exists: Gig marketplace, people can post gigs
What's missing: Easy way to FIND gigs to do

Build:
├─ Gigs browse page (like jobs board)
│  ├─ Filter by: location, rate, type
│  ├─ Sort by: newest, highest paying, most booked
│  ├─ Show: creator name, rate, description, rating
│  └─ CTA: "Request gig"
├─ Creator profile shows gigs clearly
├─ Email alerts: "New gig in your area"
└─ Simple gig booking flow

Design: Clean, scannable list
├─ Job board aesthetic (not social)
└─ One gig per line, expandable

Why: Gigs are immediate money for creators
Gig income is stability + recurring work builds relationships
Effort: 2-3 days
```

**Phase 1 Summary:**
- Ship: Earnings dashboard, onboarding, gig discovery
- Metrics: 100 creators, $2.6k/month revenue, first people making real money
- Hiring: Consider contractor for next phase
- Next question: "Are people staying active?"

---

## Phase 2: Multiple Revenue Streams (Weeks 9-16)

### Goal
**300-400 creators, $10k+/month revenue, platform sustainable for you to take salary**

### What to Build

#### Week 9-11: Subscriptions

```
PRIMARY FEATURE: Creator Subscriptions

What creators want: Recurring, predictable income
What we need: Paid subscriber-only content

Build (MVP):
├─ Creator sets subscription price ($5-100/month)
├─ Create subscriber-only posts (marked with lock icon)
├─ Subscribers see subscriber posts, non-subscribers see preview
├─ Subscriber management
│  ├─ List of subscribers
│  ├─ Cancel subscriber (if abuse)
│  └─ Message to all subscribers
├─ Billing handled by Stripe
├─ Creator sees: "50 subscribers × $10/month = $500"

Design:
├─ Creator profile shows: "Subscribe for $X/month"
├─ Click → popup with benefits + price
├─ Click "Subscribe" → Stripe checkout
├─ Post shows lock icon if subscriber-only

Why: Subscriptions = recurring revenue = stable income
Effort: 3-4 days
Risk: Low (Stripe handles payments)

Then in week 12-13:
├─ Add: Subscriber messaging (DM only to subscribers)
├─ Add: Exclusive content library (subscribers see all past posts)
├─ Add: Subscriber-only gigs (group gigs for subscribers)
Effort: 1-2 days per feature
```

#### Week 12-13: Tipping

```
SECONDARY FEATURE: Tip Creators

What creators want: One-time support from fans
What we need: Frictionless way to send money

Build (MVP):
├─ On each post: [Tip] button
├─ Click → modal:
│  ├─ Amount: [___] ($1-50 presets, or custom)
│  ├─ Message: [optional]
│  └─ [Send tip]
├─ Creator gets notified: "John tipped you $5 + message"
├─ Creator sees in earnings: "Tips: $280 this month"
├─ Recurring option: "Tip monthly?"

Design: Simple, one-click
├─ No friction
├─ Mobile-friendly
└─ Amount suggestions: $1, $5, $10, $25, custom

Why: People want to support creators they love
Low barrier to entry for supporters
Effort: 1-2 days
```

#### Week 13-14: Analytics for Creators

```
TERTIARY FEATURE: Creator Analytics

What creators want: Know what's working
What we need: Simple dashboard

Build (MVP):
├─ Creator dashboard:
│  ├─ "This Month's Views": [X posts viewed]
│  ├─ "This Month's Earnings": [broken down]
│  ├─ "Top Post": [which post made most money]
│  ├─ "Most Active Fans": [who supports you most]
│  └─ "Subscribers": [X active, X new this month]
├─ Per-post stats:
│  ├─ Views
│  ├─ Shares
│  ├─ Tips/revenue generated
│  └─ Subscriber conversions
└─ Email weekly: "You earned $X this week"

Design: Simple cards, scannable
├─ Just numbers, no fluff
├─ No engagement metrics (likes, comments, shares)
└─ Focus: What made money?

Why: Creators need to know what's working
Informs their content strategy
Effort: 2-3 days
Premium feature: Offer in "Creator Plus" tier ($9.99/mo)
```

#### Week 15-16: Payment Methods & Premium Tier

```
SECONDARY: Premium Tier Launch

Creator Plus ($9.99/month):
├─ Advanced analytics
├─ Subscriber messaging
├─ API access
├─ Priority support
└─ 1% lower platform fee (1% instead of 2% on earnings)

Build:
├─ Pricing page explaining what they get
├─ Stripe subscription setup
├─ Access control (premium features locked until subscribed)
├─ Cancel anytime
└─ Estimated: 5-10% of creators subscribe

Why: Revenue diversification
Not all creators need it, but valuable ones will pay
Effort: 1-2 days
```

**Phase 2 Summary:**
- Ship: Subscriptions, tipping, analytics, premium tier
- Revenue: $8k-10k/month from platform fees + premium tiers
- Creators: 300-400 active, earning $1,300-2,000/month avg
- You: Can now take $4k/month salary
- Next hire: First full-time engineer (already working with freelancer)

---

## Phase 3: Discovery & Growth (Weeks 17-24)

### Goal
**600-850 creators, $20k+/month revenue, strong network effects**

### What to Build

#### Week 17-19: Creator Discovery

```
PRIMARY FEATURE: Find Creators by Expertise

What creators want: Audience to find them
What people want: Find creators doing what they care about

Build:
├─ Browse page: /discover
├─ Filter by:
│  ├─ Creator type: Musician | Historian | Journalist | Scientist | Activist | etc.
│  ├─ Location: Show creators near you
│  ├─ Content: What are they teaching/making?
│  └─ Earnings: How much they charge
├─ Sort by:
│  ├─ Newest creators
│  ├─ Most supported (social proof)
│  ├─ Best rating
│  └─ Trending (community vote, not algorithm)
├─ Creator card shows:
│  ├─ Name, bio, expertise
│  ├─ Rating (4.8⭐)
│  ├─ Price/tier (Sub $X/mo, Gigs $X/hr, Tips)
│  └─ [Subscribe] [Tip] [Hire] buttons
└─ Search by name, topic, location

Design: Magazine-style grid
├─ Clean, not overwhelming
├─ Show 12-20 per page
├─ Progressive disclosure (click card for more)

Why: Discovery is network effects multiplier
Helps new creators find audience
Helps audience find their people
Effort: 3-4 days
```

#### Week 19-21: Location-Based Organizing

```
SECONDARY FEATURE: Organize By Location

Build:
├─ "Near Me" tab on discover
│  ├─ Shows creators in your zip/city
│  ├─ Filters: distance (5mi, 10mi, 25mi, 50mi)
│  └─ "X creators in Portland"
├─ Local events
│  ├─ Creators can create local events
│  ├─ Other creators and fans can RSVP
│  ├─ Shows on local map/list
│  └─ Ticketed events (split revenue)
├─ Collaborative opportunities
│  ├─ "Looking for musicians in NYC for project"
│  ├─ Other creators can apply
│  └─ Direct coordination

Design: Map + list view
├─ Show creators, events, gigs by location
├─ Filter by distance
└─ RSVP/booking flow

Why: Real-world organizing requires proximity
Platform should enable local action
Effort: 3-4 days

NOTE: Skip Week 20-21, defer if timeline tight
```

#### Week 21-24: Creator Types & Communities

```
TERTIARY FEATURE: Community Directory

Build:
├─ Creator profiles tagged by type:
│  ├─ "Historian" (showing all historians on platform)
│  ├─ "Journalist" (showing all journalists)
│  ├─ "Activist" (showing all organizers)
│  └─ etc.
├─ Communities organize around type:
│  ├─ "Historians Collective" (group of historians)
│  ├─ "Black Journalists" (niche community)
│  └─ "Labor Organizers Network"
├─ Community directory:
│  ├─ Browse communities by focus
│  ├─ Join/subscribe to communities
│  ├─ See community posts/activity
│  └─ Support community creators together

Design: Cards showing communities
├─ Mission, member count
├─ [Join] button
└─ Link to browse community creators

Why: Micro-communities are powerful
Enables collective identity and power
Effort: 2-3 days

NOTE: This is setup for Phase 4 (Collectives)
```

**Phase 3 Summary:**
- Ship: Creator discovery, location-based features, community directory
- Retention: Creators finding each other
- Growth: Network effects kick in (word of mouth)
- Revenue: $20k+/month
- Team: You + 1 full-time engineer + freelancer
- Creators: 600-850, mostly earning $1,500-3,000/month

---

## Phase 4: Collective Power (Weeks 25-32)

### Goal
**850-1,000+ creators, $25k+/month revenue, organized collectives**

### What to Build

#### Week 25-27: Groups/Collectives

```
PRIMARY FEATURE: Creator Collectives

What creators want: Organize together, pool resources
What we need: Group structure with shared earnings

Build (MVP):
├─ Create Collective:
│  ├─ Name, mission, description
│  ├─ Public or private
│  ├─ Invite creators
│  └─ Approve new members (optional)
├─ Collective profile:
│  ├─ Mission statement
│  ├─ List of members
│  ├─ Collective earnings (visible)
│  ├─ Member-only posts
│  └─ [Subscribe to collective] option
├─ Collective earnings:
│  ├─ Pool % of member earnings (opt-in)
│  ├─ Show in dashboard: "Collective: $X pooled"
│  ├─ View breakdown by member
│  └─ Withdraw individual share
└─ Member management:
   ├─ Add/remove members
   ├─ Set roles (founder, organizer, member)
   └─ Change permissions

Design: Group page
├─ Cover photo, mission, members
├─ Earnings transparency
├─ [Join] or [Subscribe] buttons

Why: Collective power beats individual isolation
Enables: Resource pooling, mutual support, coordination
Effort: 4-5 days
```

#### Week 27-29: Collective Voting

```
SECONDARY FEATURE: Collective Decisions

Build:
├─ Proposal system:
│  ├─ Any member can create proposal
│  ├─ "Should we fund the archive project?"
│  ├─ "Should we endorse this journalist?"
│  ├─ Set voting deadline (3 days? 1 week?)
│  └─ Simple yes/no or ranked choice
├─ Voting:
│  ├─ Members vote (one person = one vote)
│  ├─ Real-time results visible
│  ├─ Quorum optional (X% must vote)
│  └─ Result: "Passed 23/25"
├─ Decision log:
│  ├─ History of all votes
│  ├─ Rationale/discussion
│  ├─ Who voted yes/no (transparent)
│  └─ How decision was spent (if funding)
└─ Integration with earnings:
   ├─ Vote: "Fund X project with $Y"
   ├─ If passes, money from collective fund goes to it
   └─ Full transparency

Design: Simple voting cards
├─ Proposal title, description
├─ [Vote Yes] [Vote No] buttons
├─ Real-time counter
└─ Results visible after voting

Why: Real organizing requires real decisions
Collective agency (not top-down)
Transparency builds trust
Effort: 2-3 days
```

#### Week 29-32: Collective Tools

```
TERTIARY FEATURES

Shared Gig Board:
├─ Collective posts gig opportunity
├─ Members apply or are nominated
├─ Revenue split among members
├─ Example: "University wants 3 historians for $5k workshop"
└─ Effort: 1-2 days

Collective Fundraising:
├─ "Bail fund" (raise $X, visible progress)
├─ "Emergency support" (members contribute to fund)
├─ Transparent where money goes
└─ Effort: 2 days

Collective Messaging:
├─ Private channel for collective members
├─ Discuss decisions, coordinate
├─ Not DMs, not public (group only)
└─ Effort: 1-2 days

Collective Verification:
├─ Collectives get verified badge
├─ Community votes on legitimacy
├─ Transparent standards
└─ Effort: 1 day
```

**Phase 4 Summary:**
- Ship: Collectives, voting, shared tools
- Impact: Creators can organize and pool resources
- Revenue: $25k+/month
- Team: You + 2 engineers + community manager
- Creators: 1,000+, collectively organized
- Sustainability: Platform profitable, independent

---

## Phase 5: Governance & Transparency (Ongoing)

### Running Parallel to Above

#### Moderation Transparency
```
Build:
├─ Public moderation log
├─ Why content was removed
├─ Appeals process
├─ Community voting on appeals
└─ Full transparency

Effort: 1-2 weeks (can be ongoing)
```

#### Financial Transparency
```
Build:
├─ Public financials page
├─ Revenue breakdown
├─ Where money goes
├─ Annual report
├─ Creator audit (can verify you're reporting accurately)

Effort: 1 week (then ongoing, quarterly updates)
```

#### Creator Bill of Rights
```
Publish:
├─ No algorithmic shadow banning
├─ Content not sold to advertisers
├─ Right to export/delete data
├─ Right to appeal moderation
├─ Transparent terms of service
└─ Annual governance meeting

Effort: 2 days (then ongoing)
```

---

## Timeline Summary

```
MONTH 1-3: MVP + Earnings (Phase 0-1)
├─ Design system implementation
├─ Earnings dashboard
├─ Onboarding
├─ Launch
└─ Goal: 100 creators, $2.6k revenue

MONTH 4-6: Revenue Streams (Phase 2a)
├─ Subscriptions
├─ Tipping
├─ Premium tier
├─ Hire first engineer
└─ Goal: 300-400 creators, $10k revenue

MONTH 7-9: Discovery (Phase 3)
├─ Creator discovery
├─ Location features
├─ Community directory
└─ Goal: 600+ creators, $20k revenue

MONTH 10-12: Collectives (Phase 4)
├─ Groups & collectives
├─ Voting system
├─ Collective tools
├─ Governance
└─ Goal: 1,000 creators, $25k+ revenue

YEAR 2: Scale & Refinement
├─ Build on foundation
├─ Expand team
├─ Raise if needed
└─ Hit 5,000-10,000 creators
```

---

## Team & Hiring Timeline

```
NOW: Just you
├─ Design system cleanup
├─ MVP polish
└─ Launch

MONTH 2-3: Maybe freelancer
├─ Part-time help on specific features
└─ $1-2k/month

MONTH 4-5: Freelance engineer (if revenue supports)
├─ Part-time backend work
├─ Subscriptions infrastructure
└─ $2-3k/month

MONTH 6+: First full-time engineer
├─ Subscriptions, tipping, analytics
├─ New discovery features
├─ Scale infrastructure
└─ $4-5k/month

MONTH 9+: (Optional) Second engineer
├─ If raising money OR hitting $20k+/month
├─ Build collectives, voting
└─ $4-5k/month

MONTH 9+: Community manager (if raising)
├─ Support creators
├─ Moderate
├─ Handle support
└─ $2-3k/month
```

---

## Success Metrics

What you're measuring (NOT engagement metrics):

```
Creator Health:
├─ % of creators earning > $0/month
├─ Average earnings per creator
├─ Average time to first earning
├─ Retention (% active after 30 days)
└─ Creator satisfaction (NPS)

Platform Health:
├─ Monthly revenue
├─ Platform fee/creator (should be consistent at 2%)
├─ Churn (% of creators leaving)
├─ Growth rate (new creators/month)
└─ Sustainability (runway months)

Community Health:
├─ Collectives formed
├─ Collective members
├─ Voting participation
├─ Diversity of creator types
└─ Geographic spread
```

---

## Risks & Contingency

```
Risk: Creator adoption slower than expected
├─ Fix: Personal outreach (email contacts, journalists, historians)
├─ Timeline: Slip phase dates, extend month 1-3

Risk: Your first engineer doesn't work out
├─ Fix: Hire freelancer instead (month 6-7)
├─ Timeline: Slower feature ship, but sustainable

Risk: Creators not earning as much as expected
├─ Fix: Adjust platform fee down (1.5%?) or offer premium tier
├─ Impact: Revenue takes hit, but creators stay

Risk: You get burned out
├─ Fix: Hire earlier (month 4-5, not month 6)
├─ Impact: Revenue pressure, but you stay sane

Risk: Competitor copies Embr
├─ Fix: Your moat is transparency + community
├─ Hard to copy the culture
```

---

## Conclusion

**You have a clear path.**

1. Ship what you have (weeks 1-3)
2. Get creators earning (weeks 4-8)
3. Add revenue streams (weeks 9-16)
4. Enable discovery (weeks 17-24)
5. Build collective power (weeks 25-32)
6. Scale and sustain (year 2+)

At each phase, you're:
- ✅ Shipping value for creators
- ✅ Growing revenue to sustain team
- ✅ Building toward the mission (collective power, transparency, economic liberation)

**First goal: Get 100 creators earning by month 3.**

Everything else flows from that.

Let's build.
