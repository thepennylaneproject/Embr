import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { Button } from '@embr/ui';
import { ShoppingCart, Package, Truck, AlertCircle } from 'lucide-react';
import { useMarketplace } from '@/hooks/useMarketplace';
import { trackReliabilityEvent } from '@/lib/reliability';

interface CartItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  sellerId: string;
  sellerName: string;
}

export default function MarketplaceCheckoutPage() {
  const { checkout } = useMarketplace();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'cart' | 'success'>('cart');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [checkoutStatus, setCheckoutStatus] = useState('');
  const demoMode = process.env.NEXT_PUBLIC_DEMO_SAFE_MODE === 'true';

  // Fetch cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('marketplace_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (err) {
        console.error('Failed to load cart:', err);
      }
    }
    setLoading(false);
  }, []);

  const handleCheckout = async () => {
    if (demoMode) {
      setError('Checkout is disabled in demo-safe mode.');
      return;
    }

    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    setPaymentLoading(true);
    setError('');
    setCheckoutStatus('Creating your order...');

    try {
      const cartItems = cart.map((item) => ({
        listingId: item.productId,
        quantity: item.quantity,
      }));

      const idempotencyKey = sessionStorage.getItem('checkout_idempotency_key') || (
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `checkout_${Date.now()}`
      );
      sessionStorage.setItem('checkout_idempotency_key', idempotencyKey);

      const response = await checkout({
        items: cartItems,
        idempotencyKey,
      });

      if (!response?.orders?.length) {
        throw new Error('No orders were created. Please retry.');
      }

      const ids = response.orders.map((order) => order.id);
      setOrderIds(ids);
      setCheckoutStatus(response.idempotentReplay ? 'Recovered your previous checkout result.' : 'Order confirmed by server.');
      setStep('success');
      localStorage.removeItem('marketplace_cart');
      sessionStorage.removeItem('checkout_idempotency_key');
      trackReliabilityEvent('checkout_confirmed', {
        orderCount: response.orders.length,
        idempotentReplay: response.idempotentReplay,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to process checkout');
      setCheckoutStatus('');
      trackReliabilityEvent('checkout_failed');
    } finally {
      setPaymentLoading(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;

    return { subtotal, tax, total };
  };

  const groupBySeller = () => {
    const grouped: { [key: string]: CartItem[] } = {};
    cart.forEach((item) => {
      if (!grouped[item.sellerId]) {
        grouped[item.sellerId] = [];
      }
      grouped[item.sellerId].push(item);
    });
    return Object.entries(grouped);
  };

  const { subtotal, tax, total } = calculateTotals();

  if (loading) {
    return (
      <ProtectedPageShell
        title="Checkout"
        breadcrumbs={[
          { label: 'Marketplace', href: '/marketplace' },
          { label: 'Cart', href: '/marketplace/cart' },
          { label: 'Checkout' },
        ]}
      >
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500 mx-auto"></div>
          <p style={{ marginTop: '1rem', color: 'var(--embr-muted-text)' }}>
            Loading checkout...
          </p>
        </div>
      </ProtectedPageShell>
    );
  }

  if (cart.length === 0 && step === 'cart') {
    return (
      <ProtectedPageShell
        title="Checkout"
        breadcrumbs={[
          { label: 'Marketplace', href: '/marketplace' },
          { label: 'Cart', href: '/marketplace/cart' },
          { label: 'Checkout' },
        ]}
      >
        <div className="ui-card" data-padding="lg" style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
          <ShoppingCart size={48} style={{ color: 'var(--embr-muted-text)', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Your cart is empty
          </h2>
          <p style={{ color: 'var(--embr-muted-text)', marginBottom: '2rem' }}>
            Add items from the marketplace to get started
          </p>
          <Link href="/marketplace">
            <Button style={{ width: '100%' }}>Browse Marketplace</Button>
          </Link>
        </div>
      </ProtectedPageShell>
    );
  }

  const sellers = groupBySeller();

  return (
    <ProtectedPageShell
      title="Checkout"
      breadcrumbs={[
        { label: 'Marketplace', href: '/marketplace' },
        { label: 'Cart', href: '/marketplace/cart' },
        { label: 'Checkout' },
      ]}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Main Content */}
        <div>
          {step === 'cart' && (
            <>
              {demoMode && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', color: 'var(--embr-muted-text)' }}>
                  Demo-safe mode is active: checkout submission is disabled for live demos.
                </div>
              )}
              {/* Items by Seller */}
              {sellers.map(([sellerId, items]) => (
                <div key={sellerId} className="ui-card" data-padding="lg" style={{ marginBottom: '2rem' }}>
                  <h3
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      marginBottom: '1rem',
                      paddingBottom: '1rem',
                      borderBottom: '1px solid var(--embr-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Package size={20} style={{ color: 'var(--embr-accent)' }} />
                    {items[0].sellerName}
                  </h3>

                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {items.map((item) => (
                      <div
                        key={item.productId}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto auto',
                          gap: '1rem',
                          padding: '1rem',
                          borderRadius: 'var(--embr-radius-md)',
                          border: '1px solid var(--embr-border)',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: '600' }}>
                            {item.title}
                          </h4>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--embr-muted-text)' }}>
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--embr-muted-text)' }}>
                            ${item.price.toFixed(2)} each
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Shipping Info */}
              <div className="ui-card" data-padding="lg" style={{ marginBottom: '2rem', backgroundColor: 'var(--embr-bg)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Truck size={20} style={{ color: 'var(--embr-accent)' }} />
                  Shipping & Delivery
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ padding: '1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--embr-muted-text)', marginBottom: '0.5rem' }}>
                      Shipping Method
                    </div>
                    <div style={{ fontWeight: '600' }}>Standard Shipping (5-7 days)</div>
                  </div>
                  <div style={{ padding: '1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--embr-muted-text)', marginBottom: '0.5rem' }}>
                      Estimated Arrival
                    </div>
                    <div style={{ fontWeight: '600' }}>March 1-5, 2026</div>
                  </div>
                </div>
              </div>

              {error && (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--embr-radius-md)',
                    backgroundColor: 'color-mix(in srgb, var(--embr-error) 15%, white)',
                    border: '1px solid var(--embr-error)',
                    color: 'var(--embr-error)',
                    marginBottom: '2rem',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'flex-start',
                  }}
                >
                  <AlertCircle size={20} style={{ flexShrink: 0 }} />
                  <div>{error}</div>
                </div>
              )}
              {checkoutStatus && !error && (
                <div style={{ marginBottom: '1rem', color: 'var(--embr-muted-text)', fontSize: '0.9rem' }}>
                  {checkoutStatus}
                </div>
              )}
            </>
          )}

          {step === 'success' && (
            <div className="ui-card" data-padding="lg" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                Order Placed!
              </h2>
              <p style={{ color: 'var(--embr-muted-text)', marginBottom: '2rem' }}>
                {orderIds.length === 1
                  ? `Order #${orderIds[0]?.slice(0, 8).toUpperCase()} has been confirmed.`
                  : `${orderIds.length} orders were confirmed with your sellers.`}
              </p>
              {checkoutStatus && (
                <p style={{ color: 'var(--embr-muted-text)', marginTop: '-1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                  {checkoutStatus}
                </p>
              )}

              <div
                style={{
                  padding: '1.5rem',
                  borderRadius: 'var(--embr-radius-md)',
                  backgroundColor: 'var(--embr-bg)',
                  border: '1px solid var(--embr-border)',
                  marginBottom: '2rem',
                  textAlign: 'left',
                }}
              >
                <h3 style={{ margin: '0 0 1rem 0', fontWeight: '600' }}>
                  📦 What Happens Next
                </h3>
                <div style={{ fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: '600', color: 'var(--embr-accent)', minWidth: '60px' }}>
                      Now
                    </div>
                    <div style={{ color: 'var(--embr-muted-text)' }}>
                      Order confirmed and sellers notified
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: '600', color: 'var(--embr-accent)', minWidth: '60px' }}>
                      24h
                    </div>
                    <div style={{ color: 'var(--embr-muted-text)' }}>
                      Items will ship from sellers
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: '600', color: 'var(--embr-accent)', minWidth: '60px' }}>
                      5-7 days
                    </div>
                    <div style={{ color: 'var(--embr-muted-text)' }}>
                      Estimated delivery to your address
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link href="/marketplace/orders" style={{ flex: 1, minWidth: '150px' }}>
                  <Button style={{ width: '100%' }}>View Order</Button>
                </Link>
                <Link href="/marketplace" style={{ flex: 1, minWidth: '150px' }}>
                  <Button
                    type="button"
                    variant="secondary"
                    style={{ width: '100%' }}
                  >
                    Continue Shopping
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="ui-card" data-padding="lg" style={{ height: 'fit-content', position: 'sticky', top: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.5rem' }}>
            Order Summary
          </h3>

          <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--embr-border)' }}>
            <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--embr-muted-text)' }}>
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--embr-muted-text)' }}>
                <span>Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--embr-muted-text)' }}>
                <span>Shipping</span>
                <span>FREE</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.2rem',
              fontWeight: '700',
              marginBottom: '1.5rem',
            }}
          >
            <span>Total</span>
            <span style={{ color: 'var(--embr-accent)' }}>${total.toFixed(2)}</span>
          </div>

          {step === 'cart' && (
            <Button
              onClick={handleCheckout}
              disabled={paymentLoading || cart.length === 0 || demoMode}
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              {demoMode
                ? 'Checkout Disabled (Demo Mode)'
                : paymentLoading
                  ? 'Processing...'
                  : 'Place Order'}
            </Button>
          )}

          <Link href="/marketplace/cart">
            <Button
              type="button"
              variant="secondary"
              disabled={paymentLoading}
              style={{ width: '100%' }}
            >
              Edit Cart
            </Button>
          </Link>

          {/* Trust Badges */}
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--embr-border)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--embr-muted-text)', marginBottom: '1rem' }}>
              ✓ Secure payment
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--embr-muted-text)', marginBottom: '1rem' }}>
              ✓ Money-back guarantee
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--embr-muted-text)' }}>
              ✓ Free returns
            </div>
          </div>
        </div>
      </div>
    </ProtectedPageShell>
  );
}
