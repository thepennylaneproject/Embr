# Embr Payment Infrastructure Documentation

## Overview

Embr supports three distinct payment verticals with a unified infrastructure:
- **Music Licensing** - Immediate settlement
- **Gigs Booking** - 3-day escrow with dispute window
- **Marketplace** - Multi-seller splits with instant settlement

---

## Music Licensing Flow

### Happy Path
```
1. Creator browses music
2. Clicks "License Music"
3. Navigates to /music/licensing/[trackId]
4. Sees track details & licensing terms
5. Clicks "Get License"
6. Frontend calls POST /api/music/licensing/:trackId/checkout
   ├─ Validates track is published
   ├─ Checks licensing permissions
   ├─ Creates Stripe PaymentIntent
   └─ Returns clientSecret to frontend
7. Frontend shows payment form (Stripe Elements)
8. User enters card details
9. Stripe processes payment
10. Webhook receives payment_intent.succeeded
11. Backend:
    ├─ Updates transaction status
    ├─ Credits artist wallet (85%)
    ├─ Records VideoUsage
    ├─ Increments track usage count
    └─ Sends confirmation email
12. Creator sees success page
13. Can now use music in posts
```

### Error Cases
- **Track not found**: 404 + error message
- **Track not published**: 400 + "Track not published"
- **Track restricted**: 400 + "Not available for licensing"
- **Self-licensing**: 400 + "Cannot license your own music"
- **Payment declined**: Payment intent fails → order marked failed
- **Webhook timeout**: Retry logic in Stripe (5 attempts)

### Data Flow
```
Frontend Request
  └─ POST /api/music/licensing/:trackId/checkout
     └─ LicensingPaymentService.createLicensePayment()
        ├─ Fetch track + artist
        ├─ Validate permissions
        ├─ Create Stripe PaymentIntent
        └─ Return clientSecret

Webhook Event
  └─ payment_intent.succeeded
     └─ StripeWebhookController.handlePaymentIntentSucceeded()
        └─ LicensingPaymentService.handlePaymentSuccess()
           ├─ Calculate splits (85% artist, 15% platform)
           ├─ Credit artist wallet
           ├─ Create transactions
           ├─ Record VideoUsage
           └─ Update track usage count
```

---

## Gigs Booking Flow

### Happy Path
```
1. Creator discovers gigs
2. Clicks "Book Gig"
3. Navigates to /gigs/booking/[gigId]
4. Sees gig details & escrow protection info
5. Clicks "Book Now"
6. Frontend calls POST /api/gigs/bookings/:gigId/checkout
   ├─ Validates gig is available
   ├─ Checks for duplicate bookings
   ├─ Creates Stripe PaymentIntent with escrow
   └─ Returns clientSecret
7. Frontend shows payment form
8. User enters card
9. Stripe processes payment
10. Webhook receives payment_intent.succeeded
11. Backend:
    ├─ Updates booking status to CONFIRMED
    ├─ Creates PENDING transaction for artist
    ├─ Holds funds in escrow (3 days)
    ├─ Schedules auto-release
    └─ Sends confirmation
12. Creator sees success page with timeline
13. Day 0-2: Can dispute if needed
    └─ POST /api/gigs/bookings/:bookingId/dispute
14. Day 3: Auto-release triggers
    ├─ Moves funds to artist wallet
    ├─ Updates transaction status to COMPLETED
    └─ Updates booking status to COMPLETED
```

### Key Dates
- **Day 0**: Payment confirmed, booking CONFIRMED, funds in escrow
- **Day 2**: Dispute window closes (24h before auto-release)
- **Day 3 00:00**: Automatic escrow release

### Error Cases
- **Gig not available**: 400
- **Duplicate booking**: 409 + "Already have active booking"
- **Self-booking**: 400
- **Payment failed**: Booking marked FAILED
- **Dispute after window**: 400 + "Dispute window closed"
- **Cancel after completion**: 400 + "Cannot cancel completed booking"

### Dispute Resolution
```
Creator disputes booking
  └─ POST /api/gigs/bookings/:bookingId/dispute
     └─ Creates GigDispute record
        ├─ Status: OPEN
        ├─ Pauses auto-release
        └─ Notifies support team

Support team reviews (manual process)
  └─ Admin resolves dispute
     ├─ Resolution: REFUND or RELEASE
     ├─ Updates dispute status: RESOLVED
     └─ Takes action:
        ├─ If REFUND: Process full refund
        └─ If RELEASE: Release escrow normally
```

---

## Marketplace Checkout Flow

### Happy Path
```
1. Creator adds multiple items to cart
   ├─ Item A from Seller 1 ($20)
   ├─ Item B from Seller 2 ($15)
   └─ Item C from Seller 1 ($10)
2. Navigates to /marketplace/checkout
3. Sees cart grouped by seller
4. Review order summary
5. Clicks "Continue to Payment"
6. Frontend calls POST /api/marketplace/orders/checkout
   ├─ Validates all products exist
   ├─ Checks stock for each item
   ├─ Creates PENDING order
   ├─ Creates Stripe PaymentIntent
   └─ Returns clientSecret
7. Frontend shows payment form
8. User enters card
9. Stripe processes payment
10. Webhook receives payment_intent.succeeded
11. Backend processes multi-seller split:
    ├─ Update order status to PAID
    ├─ For each item:
    │  ├─ Calculate split (85% seller, 15% platform)
    │  ├─ Credit seller wallet
    │  ├─ Create transaction
    │  ├─ Reduce stock
    │  └─ Update product listing
    ├─ Create buyer transaction
    └─ Send confirmations
12. Buyer sees success page
13. Each seller notified of new order
14. Items ship within 24 hours
```

### Payment Split Example
```
Total: $45.00

Product A (Seller 1): $20.00
├─ Platform fee: $3.00 (15%)
└─ Seller 1 gets: $17.00

Product B (Seller 2): $15.00
├─ Platform fee: $2.25 (15%)
└─ Seller 2 gets: $12.75

Product C (Seller 1): $10.00
├─ Platform fee: $1.50 (15%)
└─ Seller 1 gets: $8.50

Seller 1 total: $25.50 (Items A + C)
Seller 2 total: $12.75 (Item B)
Platform total: $6.75
```

### Error Cases
- **Product not found**: 400
- **Out of stock**: 400 + "Only 3 available"
- **Product unavailable**: 400 + "Product delisted"
- **Payment declined**: Order marked FAILED
- **Partial stock**: Entire order fails (no partial fulfillment)
- **Duplicate order**: Allowed (user can order same item twice)

---

## Common Patterns

### Transaction Types
```
MUSIC_LICENSE              → Creator purchases music license
MUSIC_LICENSE_EARNED       → Artist earns from license sale
GIG_BOOKING                → Buyer pays for gig
GIG_BOOKING_ESCROW         → Funds held in escrow
GIG_BOOKING_EARNED         → Artist earns after escrow releases
MARKETPLACE_PURCHASE       → Buyer purchases item(s)
MARKETPLACE_SALE           → Seller earns from sale
PAYOUT                     → Artist withdraws to bank
```

### Status Codes
```
payment_intent:
  - processing: Payment being processed
  - succeeded: Payment successful
  - failed: Payment failed
  - canceled: User canceled
  - requires_action: 3D Secure needed

order/booking:
  - pending: Waiting for payment
  - confirmed/paid: Payment received
  - completed: Fulfilled/Released
  - failed: Payment failed
  - cancelled: User cancelled
```

### Webhook Retry Logic
- Initial attempt: Immediate
- Retry 1: After 1 minute
- Retry 2: After 5 minutes
- Retry 3: After 30 minutes
- Retry 4: After 2 hours
- Retry 5: After 5 hours

Total window: ~8 hours

---

## Testing Scenarios

### Stripe Test Cards
```
Success:
  4242 4242 4242 4242 (standard success)
  4000 0000 0000 3220 (requires 3D Secure)

Declined:
  4000 0000 0000 0002 (card declined)
  4000 0000 0000 0069 (expired)
  4000 0000 0000 0127 (incorrect CVC)

Other:
  5555 5555 5555 4444 (Mastercard success)
  3782 822463 10005 (American Express)
```

### Test Flows

#### Music Licensing
```bash
1. Get test token
2. GET /api/music/tracks/[testTrackId]
3. POST /api/music/licensing/[trackId]/checkout
   └─ Verify clientSecret returned
4. Simulate Stripe webhook: payment_intent.succeeded
5. Verify:
   └─ Artist wallet credited
   └─ Transaction created
   └─ VideoUsage recorded
```

#### Gigs Booking
```bash
1. GET /api/gigs/[testGigId]
2. POST /api/gigs/bookings/[gigId]/checkout
   └─ Verify clientSecret returned
3. Simulate webhook: payment_intent.succeeded
4. Verify:
   └─ Booking status: CONFIRMED
   └─ Transaction status: PENDING
   └─ Auto-release scheduled
5. Wait 3 days (or trigger manually in test)
6. Verify:
   └─ Artist wallet credited
   └─ Transaction status: COMPLETED
```

#### Marketplace
```bash
1. Add items from multiple sellers to cart
2. POST /api/marketplace/orders/checkout
   └─ Verify clientSecret returned
3. Simulate webhook: payment_intent.succeeded
4. Verify:
   └─ Each seller wallet credited
   └─ Stock decremented
   └─ Multiple transactions created
   └─ Order status: PAID
```

---

## Performance Considerations

### Database Queries
- `createLicensePayment`: 2 queries (fetch track, fetch users)
- `handlePaymentSuccess`: 4 queries (update transaction, update track, create video usage)
- `createGigPayment`: 3 queries
- `createOrderPayment`: N+1 optimization (fetch all products in single query)

### Caching
- Track details: Cache 5 minutes
- Gig details: Cache 5 minutes
- Seller info: Cache 10 minutes
- Product stock: Cache 30 seconds (refresh on purchase)

### Optimization Opportunities
1. Batch update stocks (marketplace)
2. Cache frequently purchased items
3. Async email notifications
4. Job queue for escrow releases
5. Analytics aggregation

---

## Security Considerations

### Stripe Webhook Verification
```
1. Verify signature: stripe.webhooks.constructEvent()
2. Check timestamp: Should be recent (< 5 minutes old)
3. Verify idempotency: Check if event already processed
4. Validate metadata: Ensure not tampered
```

### Authorization
```
All endpoints require:
1. Valid JWT token in Authorization header
2. User ownership verification
3. Resource ownership check (can't access others' orders)
4. Role verification (seller vs buyer)
```

### Data Validation
```
Validate on all inputs:
- gigId, productId, trackId: Must exist and be valid
- quantity: Must be positive integer
- userId, creatorId: Must be valid user
- Price: Must not be negative
- Stock: Must be available
```

---

## Deployment Checklist

- [ ] Stripe API keys configured (live + test)
- [ ] Webhook endpoint registered
- [ ] Webhook signature verification enabled
- [ ] Database migrations run
- [ ] Email templates created
- [ ] Error monitoring (Sentry) configured
- [ ] Logging configured
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Environment variables set
- [ ] Backup strategy in place
- [ ] Monitoring/alerts configured
- [ ] Load testing completed
- [ ] Security audit done
- [ ] Documentation reviewed
