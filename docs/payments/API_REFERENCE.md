# Payment API Reference

## Base URL
```
Production: https://api.embr.app
Staging: https://staging-api.embr.app
Development: http://localhost:3001
```

## Authentication
All endpoints require Bearer token in Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Music Licensing APIs

### Create License Payment
**Endpoint:** `POST /api/music/licensing/:trackId/checkout`

**Auth:** Required (JWT)

**Body:**
```json
{
  "creatorId": "user_123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_1234567890",
    "clientSecret": "pi_1234567890_secret_xyz",
    "amount": 1000,
    "currency": "usd",
    "track": {
      "id": "track_123",
      "title": "Summer Vibes",
      "artistName": "DJ Cool",
      "price": 10.00,
      "licensingModel": "standard",
      "allowMonetize": true,
      "attributionRequired": true,
      "audioUrl": "https://..."
    }
  }
}
```

**Errors:**
- 404: Track not found
- 400: Track not published / Self-licensing / Not available

---

### Get Creator's Licenses
**Endpoint:** `GET /api/music/licensing/creator/:creatorId/licenses`

**Auth:** Required (must be own ID)

**Query Params:**
- `limit` (optional): Default 50, max 100

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "usage_123",
      "trackId": "track_123",
      "track": {
        "title": "Summer Vibes",
        "artist": { "stageName": "DJ Cool" }
      },
      "usageDate": "2026-02-22T10:30:00Z",
      "licensingModel": "standard",
      "allowMonetize": true
    }
  ]
}
```

---

### Get Artist Licensing Earnings
**Endpoint:** `GET /api/music/licensing/artist/:artistId/earnings`

**Auth:** Required (must be artist owner)

**Query Params:**
- `days` (optional): Period in days, default 30

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 8500,
    "totalUsages": 10,
    "averagePerLicense": 850,
    "period": "30 days",
    "usages": [...]
  }
}
```

---

## Gigs Booking APIs

### Create Booking Payment
**Endpoint:** `POST /api/gigs/bookings/:gigId/checkout`

**Auth:** Required (JWT)

**Body:**
```json
{
  "artistId": "artist_456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_gig_789",
    "clientSecret": "pi_gig_789_secret_abc",
    "amount": 10000,
    "currency": "usd",
    "gig": {
      "id": "gig_456",
      "title": "30-min Instagram Reels Consultation",
      "artistName": "Sarah Creator",
      "price": 100.00,
      "description": "...",
      "duration": 30,
      "category": "consulting"
    },
    "escrowDetails": {
      "holdUntil": "2026-02-25T14:30:00Z",
      "autoReleaseAfter": 3,
      "disputeWindow": 2
    }
  }
}
```

---

### Get Booking Details
**Endpoint:** `GET /api/gigs/bookings/:bookingId`

**Auth:** Required (buyer or artist only)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "booking_123",
    "gigId": "gig_456",
    "userId": "user_123",
    "artistId": "artist_456",
    "amount": 10000,
    "status": "confirmed",
    "confirmedAt": "2026-02-22T14:30:00Z",
    "gig": { /* gig details */ },
    "user": { /* buyer details */ }
  }
}
```

---

### Get User's Bookings
**Endpoint:** `GET /api/gigs/bookings/user/my-bookings`

**Auth:** Required

**Query Params:**
- `limit` (optional): Default 50

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "booking_123",
      "gig": { /* details */ },
      "status": "confirmed",
      "amount": 10000
    }
  ]
}
```

---

### Cancel Booking
**Endpoint:** `POST /api/gigs/bookings/:bookingId/cancel`

**Auth:** Required (buyer or artist)

**Body:**
```json
{
  "reason": "Found another artist"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Booking cancelled and refunded"
}
```

**Errors:**
- 400: Cannot cancel completed booking
- 400: Booking already cancelled

---

### Create Dispute
**Endpoint:** `POST /api/gigs/bookings/:bookingId/dispute`

**Auth:** Required (buyer or artist)

**Body:**
```json
{
  "reason": "Artist didn't show up for call"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "dispute_789",
    "bookingId": "booking_123",
    "initiatedBy": "user_123",
    "reason": "Artist didn't show up",
    "status": "open"
  },
  "message": "Dispute created. Support team will review within 24 hours."
}
```

**Errors:**
- 400: Dispute window closed
- 400: Can only dispute confirmed bookings

---

## Marketplace APIs

### Create Order
**Endpoint:** `POST /api/marketplace/orders/checkout`

**Auth:** Required (JWT)

**Body:**
```json
{
  "cartItems": [
    {
      "productId": "prod_123",
      "quantity": 2
    },
    {
      "productId": "prod_456",
      "quantity": 1
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_market_012",
    "clientSecret": "pi_market_012_secret_def",
    "amount": 5500,
    "currency": "usd",
    "orderId": "order_789",
    "items": [
      {
        "productId": "prod_123",
        "title": "Wireless Microphone",
        "quantity": 2,
        "price": 20.00
      },
      {
        "productId": "prod_456",
        "title": "USB Cable",
        "quantity": 1,
        "price": 15.00
      }
    ]
  }
}
```

**Errors:**
- 400: Cart is empty
- 400: Product not found
- 400: Out of stock
- 400: Product not available

---

### Get Order Details
**Endpoint:** `GET /api/marketplace/orders/:orderId`

**Auth:** Required (buyer only)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "order_789",
    "userId": "user_123",
    "totalAmount": 5500,
    "status": "paid",
    "paidAt": "2026-02-22T15:00:00Z",
    "items": [
      {
        "productId": "prod_123",
        "quantity": 2,
        "price": 20.00,
        "product": { /* details */ }
      }
    ]
  }
}
```

---

### Get Buyer's Orders
**Endpoint:** `GET /api/marketplace/orders/user/my-orders`

**Auth:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "order_789",
      "totalAmount": 5500,
      "status": "paid",
      "paidAt": "2026-02-22T15:00:00Z",
      "items": [/* ... */]
    }
  ]
}
```

---

### Get Seller's Sales
**Endpoint:** `GET /api/marketplace/orders/seller/my-sales`

**Auth:** Required (seller account)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "order_789",
      "user": { /* buyer */ },
      "items": [
        {
          "product": { "title": "Microphone" },
          "quantity": 2,
          "price": 20.00
        }
      ],
      "paidAt": "2026-02-22T15:00:00Z"
    }
  ]
}
```

---

### Get Seller Analytics
**Endpoint:** `GET /api/marketplace/orders/seller/analytics`

**Auth:** Required (seller account)

**Query Params:**
- `days` (optional): Period, default 30

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 127500,
    "totalOrders": 15,
    "totalItemsSold": 45,
    "averageOrderValue": 8500,
    "period": "30 days",
    "topProducts": [
      {
        "productId": "prod_123",
        "title": "Wireless Microphone",
        "sold": 12,
        "revenue": 204000
      }
    ]
  }
}
```

---

### Cancel Order
**Endpoint:** `POST /api/marketplace/orders/:orderId/cancel`

**Auth:** Required (buyer only)

**Body:**
```json
{
  "reason": "Changed my mind"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order cancelled"
}
```

**Errors:**
- 400: Can only cancel pending or failed orders
- 400: Order already cancelled

---

## Webhook Events

### Endpoint
`POST /webhooks/stripe`

**Headers:**
```
Content-Type: application/json
stripe-signature: t=1614067000,v1=abc123...
```

### Events Handled

#### payment_intent.succeeded
```json
{
  "id": "evt_123",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_123",
      "status": "succeeded",
      "amount_received": 10000,
      "metadata": {
        "type": "music_license|gig_booking|marketplace_order",
        "trackId|gigId|orderId": "value"
      }
    }
  }
}
```

#### payment_intent.payment_failed
```json
{
  "id": "evt_124",
  "type": "payment_intent.payment_failed",
  "data": {
    "object": {
      "id": "pi_123",
      "last_payment_error": {
        "message": "Card declined"
      }
    }
  }
}
```

---

## Rate Limits

All endpoints are rate limited:

```
Default: 100 requests / minute per API key
Burst: 1000 requests / 10 seconds
```

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1614067800
```

**When exceeded:**
```
HTTP 429 Too Many Requests
Retry-After: 60
```

---

## Pagination

List endpoints support cursor pagination:

**Query Params:**
```
?limit=50&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## Common Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Cart is empty"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or expired token"
}
```

### 404 Not Found
```json
{
  "error": "Order not found"
}
```

### 409 Conflict
```json
{
  "error": "You already have an active booking for this gig"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error. Contact support."
}
```
