# Payment Error Handling Guide

## HTTP Status Codes

### 200 OK
Payment operation successful. Response includes:
```json
{
  "success": true,
  "data": { /* payment details */ }
}
```

### 400 Bad Request
Client error - invalid input, validation failed. Response:
```json
{
  "success": false,
  "error": "Specific error message"
}
```

**Common cases:**
- Empty cart
- Invalid quantity
- Out of stock
- Insufficient funds
- Self-transaction (can't license own music, can't book own gig)
- Product not available
- Invalid price

### 401 Unauthorized
Missing or invalid JWT token. Client should:
1. Redirect to login
2. Refresh token
3. Store token in localStorage

### 404 Not Found
Resource doesn't exist:
```json
{
  "error": "Track not found"
}
```

**Common cases:**
- Track/Gig/Product ID doesn't exist
- User not found
- Booking not found
- Order not found

### 409 Conflict
Resource conflict:
```json
{
  "error": "You already have an active booking for this gig"
}
```

**Common cases:**
- Duplicate active booking
- Order already paid
- Booking already completed

### 500 Internal Server Error
Server error. Should not happen in normal operation. Log details and notify user.

---

## Error Messages - Buyer Perspective

### Music Licensing

| Scenario | Message | Action |
|----------|---------|--------|
| Track not found | "Track no longer available" | Redirect to browse |
| Track unpublished | "This track isn't available yet" | Show similar tracks |
| Can't license own | "You can't license your own music" | Disable button |
| Payment declined | "Card was declined. Try another card." | Retry with different card |
| Insufficient funds | "Insufficient funds on card" | Suggest different payment method |
| Network error | "Connection lost. Please try again." | Auto-retry |
| Timeout | "Taking longer than expected..." | Show loading state |

### Gigs Booking

| Scenario | Message | Action |
|----------|---------|--------|
| Gig not available | "This gig is no longer available" | Redirect to search |
| Already booked | "You already have an active booking for this gig" | Show existing booking |
| Can't book own | "You can't book your own gig" | Disable button |
| Payment failed | "Payment couldn't be processed" | Retry payment |
| Booking full | "This gig is fully booked" | Suggest similar gigs |
| Dispute after window | "Dispute window has closed" | Contact support |

### Marketplace

| Scenario | Message | Action |
|----------|---------|--------|
| Product not found | "This item is no longer available" | Remove from cart |
| Out of stock | "Only 2 available, but you requested 5" | Update quantity |
| Stock depleted | "This item sold out" | Wait list option |
| Product delisted | "Seller removed this item" | Remove from cart |
| Multi-seller issue | "Item from [Seller] is out of stock" | Remove that item |
| Cart empty | "Add items before checkout" | Redirect to browse |

---

## Error Handling - Backend Implementation

### Database Errors
```typescript
try {
  // Database operation
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint violation
    throw new BadRequestException('Item already exists');
  } else if (error.code === 'P2025') {
    // Record not found
    throw new NotFoundException('Item not found');
  } else {
    // Log error, return generic message
    this.logger.error(`Database error: ${error.message}`);
    throw new InternalServerErrorException('Database operation failed');
  }
}
```

### Stripe Errors
```typescript
try {
  const paymentIntent = await this.stripe.paymentIntents.create({...});
} catch (error) {
  if (error instanceof Stripe.errors.CardError) {
    throw new BadRequestException(`Payment declined: ${error.message}`);
  } else if (error instanceof Stripe.errors.RateLimitError) {
    throw new HttpException('Too many requests', 429);
  } else if (error instanceof Stripe.errors.AuthenticationError) {
    throw new InternalServerErrorException('Stripe auth failed');
  } else {
    this.logger.error(`Stripe error: ${error.message}`);
    throw new InternalServerErrorException('Payment processing failed');
  }
}
```

### Validation Errors
```typescript
if (!cart || cart.length === 0) {
  throw new BadRequestException('Cart is empty');
}

for (const item of cart) {
  if (item.quantity < 1) {
    throw new BadRequestException('Quantity must be at least 1');
  }

  if (!Number.isInteger(item.quantity)) {
    throw new BadRequestException('Quantity must be a whole number');
  }
}
```

---

## Recovery Strategies

### Automatic Retries
```
Transaction Tier 1: Immediate retry (no wait)
Transaction Tier 2: Wait 1s, retry
Transaction Tier 3: Wait 5s, retry
Transaction Tier 4: Wait 30s, retry
Transaction Tier 5: Wait 5m, retry

After 5 attempts:
- Log error
- Alert monitoring system
- Manual intervention required
```

### Idempotency Keys
```
// Use event ID as idempotency key
const paymentIntentId = paymentIntent.id;
const idempotencyKey = `${paymentIntentId}:${event.id}`;

// Check if already processed
const existing = await Transaction.findOne({ idempotencyKey });
if (existing) {
  return; // Already processed, skip
}

// Process and store
await this.processPayment(...);
await Transaction.create({ idempotencyKey });
```

### Partial Failure Handling
```
// Marketplace with multiple sellers
// One seller's wallet credit fails

for (const split of sellerSplits) {
  try {
    await this.walletService.addToWallet(split.sellerId, split.amount);
  } catch (error) {
    // Log error
    this.logger.error(`Failed to credit seller ${split.sellerId}`);

    // Create retry job
    await this.retryQueue.add({
      type: 'credit_wallet',
      sellerId: split.sellerId,
      amount: split.amount,
      orderId: order.id,
    });

    // Continue with other sellers
  }
}

// Mark order as "Partial" until all credits succeed
```

---

## Monitoring & Alerts

### Critical Errors (Immediate Alert)
- Payment intent creation fails
- Webhook signature verification fails
- Database connection lost
- Stripe API unreachable
- Wallet credit fails
- Stock update fails

### Warning Errors (30-minute digest)
- Payment declined
- Webhook retry (> 2 retries)
- High latency (> 5s)
- Rate limit approaching

### Info Errors (Logged only)
- Out of stock
- User validation failure
- Duplicate request

### Monitoring Dashboard Should Track

```
Real-time metrics:
- Successful payments (count, total, average)
- Failed payments (count, reasons)
- Webhook latency
- Payment intent creation time
- Escrow auto-releases (count)
- Disputes opened (count)
- Refunds processed (count)

Per-vertical:
- Music licensing: licenses sold, revenue
- Gigs: bookings, escrow holds, releases
- Marketplace: orders, sellers involved, revenue

Seller metrics:
- Sales count
- Revenue
- Top products
- Refund rate
```

---

## Testing Error Scenarios

### Unit Tests
```typescript
describe('LicensingPaymentService', () => {
  describe('createLicensePayment', () => {
    it('should throw if track not found', async () => {
      await expect(
        service.createLicensePayment({
          trackId: 'invalid-id',
          creatorId: 'user1',
          userId: 'user2',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if user tries to license own music', async () => {
      await expect(
        service.createLicensePayment({
          trackId: 'track1',
          creatorId: 'user1',
          userId: 'user1', // Same user!
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if track not published', async () => {
      // Setup: unpublished track
      await expect(...).rejects.toThrow(BadRequestException);
    });
  });
});
```

### Integration Tests
```typescript
describe('Payment Flow - Music Licensing', () => {
  it('should handle successful payment flow', async () => {
    // 1. Create payment intent
    const result = await service.createLicensePayment({...});
    expect(result.clientSecret).toBeDefined();

    // 2. Simulate webhook
    await controller.handleWebhook(
      mockPaymentIntentSucceededEvent
    );

    // 3. Verify artist credited
    const wallet = await walletService.getBalance(artistId);
    expect(wallet.balance).toBeGreaterThan(0);
  });

  it('should handle webhook timeout and retry', async () => {
    // First attempt fails
    // Second attempt succeeds
    // Verify: processed only once (idempotency)
  });
});
```

---

## Customer Support Guide

### When to Escalate
1. Payment stuck (not succeeded/failed)
2. Money not credited after 24 hours
3. Customer disputes charge (chargeback)
4. Booking deleted mysteriously
5. Stock issue (oversold)

### Information to Collect
- Order/Booking ID
- Transaction ID
- Timestamp
- Error message shown
- Payment method used
- Browser/device
- Steps before error

### Resolution Steps
1. Check Stripe dashboard for transaction
2. Verify database transaction record
3. Check if webhook processed
4. Check if wallet credited
5. Review logs for errors
6. Contact Stripe support if needed
7. Manual credit if necessary

### Common Resolutions
| Issue | Resolution |
|-------|-----------|
| Payment charged but not credited | Manual wallet credit + note transaction |
| Webhook never fired | Manually trigger payment success handler |
| Partial credit (1 of 2 sellers) | Credit missing seller manually |
| Stuck in "pending" | Check Stripe, mark as failed or success |
| Duplicate charge | Refund one charge via Stripe |
| Chargebacks | Dispute via Stripe + document |
