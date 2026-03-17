import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ProtectedPageShell } from '@/components/layout';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { Button } from '@embr/ui';

interface CartItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  sellerId: string;
  sellerName: string;
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('marketplace_cart');
      if (saved) setCart(JSON.parse(saved));
    } catch {
      // invalid JSON — start fresh
    }
    setLoading(false);
  }, []);

  const persist = (updated: CartItem[]) => {
    setCart(updated);
    localStorage.setItem('marketplace_cart', JSON.stringify(updated));
  };

  const updateQty = (productId: string, delta: number) => {
    const updated = cart
      .map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + delta } : item,
      )
      .filter((item) => item.quantity > 0);
    persist(updated);
  };

  const remove = (productId: string) => {
    persist(cart.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    persist([]);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const groupBySeller = () => {
    const grouped: Record<string, CartItem[]> = {};
    cart.forEach((item) => {
      if (!grouped[item.sellerId]) grouped[item.sellerId] = [];
      grouped[item.sellerId].push(item);
    });
    return Object.entries(grouped);
  };

  if (loading) {
    return (
      <ProtectedPageShell
        title="Cart"
        breadcrumbs={[{ label: 'Marketplace', href: '/marketplace' }, { label: 'Cart' }]}
      >
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--embr-muted-text)' }}>
          Loading cart...
        </div>
      </ProtectedPageShell>
    );
  }

  if (cart.length === 0) {
    return (
      <ProtectedPageShell
        title="Cart"
        breadcrumbs={[{ label: 'Marketplace', href: '/marketplace' }, { label: 'Cart' }]}
      >
        <div
          style={{
            textAlign: 'center',
            maxWidth: '480px',
            margin: '3rem auto',
            padding: '2rem',
            background: 'var(--embr-surface)',
            border: '1px solid var(--embr-border)',
            borderRadius: 'var(--embr-radius-lg)',
          }}
        >
          <ShoppingCart size={56} style={{ color: 'var(--embr-muted-text)', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: '0 0 0.5rem' }}>
            Your cart is empty
          </h2>
          <p style={{ color: 'var(--embr-muted-text)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Browse the marketplace and add items you'd like to buy.
          </p>
          <Link href="/marketplace">
            <Button style={{ width: '100%' }}>Browse Marketplace</Button>
          </Link>
        </div>
      </ProtectedPageShell>
    );
  }

  return (
    <ProtectedPageShell
      title={`Cart (${itemCount} item${itemCount !== 1 ? 's' : ''})`}
      breadcrumbs={[{ label: 'Marketplace', href: '/marketplace' }, { label: 'Cart' }]}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '2rem',
          maxWidth: '1100px',
          margin: '0 auto',
          alignItems: 'start',
        }}
      >
        {/* Cart Items */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>
              Shopping Cart
            </h1>
            <button
              onClick={clearCart}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--embr-muted-text)',
                cursor: 'pointer',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <Trash2 size={14} /> Clear all
            </button>
          </div>

          {groupBySeller().map(([sellerId, items]) => (
            <div
              key={sellerId}
              style={{
                background: 'var(--embr-surface)',
                border: '1px solid var(--embr-border)',
                borderRadius: 'var(--embr-radius-lg)',
                overflow: 'hidden',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'var(--embr-bg)',
                  borderBottom: '1px solid var(--embr-border)',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  color: 'var(--embr-muted-text)',
                }}
              >
                Sold by {items[0].sellerName}
              </div>
              <div>
                {items.map((item, idx) => (
                  <div
                    key={item.productId}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: '1rem',
                      padding: '1rem',
                      alignItems: 'center',
                      borderTop: idx > 0 ? '1px solid var(--embr-border)' : undefined,
                    }}
                  >
                    <div>
                      <Link
                        href={`/marketplace/${item.productId}`}
                        style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--embr-text)', textDecoration: 'none' }}
                      >
                        {item.title}
                      </Link>
                      <div style={{ fontSize: '0.82rem', color: 'var(--embr-muted-text)', marginTop: '0.2rem' }}>
                        ${item.price.toFixed(2)} each
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => updateQty(item.productId, -1)}
                        aria-label="Decrease quantity"
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--embr-radius-sm)',
                          border: '1px solid var(--embr-border)',
                          background: 'var(--embr-bg)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontWeight: '700', minWidth: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.productId, 1)}
                        aria-label="Increase quantity"
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--embr-radius-sm)',
                          border: '1px solid var(--embr-border)',
                          background: 'var(--embr-bg)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Price + remove */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '0.375rem' }}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                      <button
                        onClick={() => remove(item.productId)}
                        aria-label={`Remove ${item.title}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--embr-muted-text)',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.78rem',
                          marginLeft: 'auto',
                        }}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Link href="/marketplace" style={{ fontSize: '0.85rem', color: 'var(--embr-muted-text)', textDecoration: 'none' }}>
            ← Continue Shopping
          </Link>
        </div>

        {/* Summary Sidebar */}
        <div
          style={{
            background: 'var(--embr-surface)',
            border: '1px solid var(--embr-border)',
            borderRadius: 'var(--embr-radius-lg)',
            padding: '1.5rem',
            position: 'sticky',
            top: '1.5rem',
          }}
        >
          <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: '700' }}>Order Summary</h2>

          <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--embr-border)' }}>
            {cart.map((item) => (
              <div
                key={item.productId}
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem', color: 'var(--embr-muted-text)' }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                  {item.title} × {item.quantity}
                </span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--embr-muted-text)', marginBottom: '0.5rem' }}>
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--embr-muted-text)', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--embr-border)' }}>
            <span>Tax (8%)</span>
            <span>${(subtotal * 0.08).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            <span>Total</span>
            <span style={{ color: 'var(--embr-accent)' }}>${(subtotal * 1.08).toFixed(2)}</span>
          </div>

          <Button
            onClick={() => router.push('/marketplace/checkout')}
            style={{ width: '100%', marginBottom: '0.75rem' }}
          >
            Proceed to Checkout
          </Button>

          <Link href="/marketplace" style={{ display: 'block', textAlign: 'center', fontSize: '0.82rem', color: 'var(--embr-muted-text)', textDecoration: 'none' }}>
            Continue Shopping
          </Link>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--embr-border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--embr-muted-text)', marginBottom: '0.5rem' }}>✓ Secure checkout</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--embr-muted-text)', marginBottom: '0.5rem' }}>✓ Money-back guarantee</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--embr-muted-text)' }}>✓ Free returns</div>
          </div>
        </div>
      </div>
    </ProtectedPageShell>
  );
}
