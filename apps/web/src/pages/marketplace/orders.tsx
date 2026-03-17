import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { OrderCard } from '@/components/marketplace/OrderCard';
import { useMarketplace } from '@/hooks/useMarketplace';
import { marketplaceApi } from '@shared/api/marketplace.api';
import { PageState } from '@/components/ui/PageState';
import { useToast } from '@embr/ui';
import type { MarketplaceOrder } from '@embr/types';

export default function OrdersPage() {
  const { getBuyingOrders, getSellingOrders, createReview } = useMarketplace();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'buying' | 'selling'>('buying');
  const [buyingOrders, setBuyingOrders] = useState<MarketplaceOrder[]>([]);
  const [sellingOrders, setSellingOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<{ orderId: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [shipModal, setShipModal] = useState<{ orderId: string } | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipError, setShipError] = useState('');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const [buying, selling] = await Promise.all([getBuyingOrders(), getSellingOrders()]);
    setBuyingOrders(buying);
    setSellingOrders(selling);
    setLoading(false);
  }, [getBuyingOrders, getSellingOrders]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleShip = (orderId: string) => {
    setTrackingNumber('');
    setShipError('');
    setShipModal({ orderId });
  };

  const handleShipSubmit = async () => {
    if (!shipModal || !trackingNumber.trim()) {
      setShipError('Please enter a tracking number.');
      return;
    }
    try {
      await marketplaceApi.markShipped(shipModal.orderId, trackingNumber.trim());
      setShipModal(null);
      showToast({ title: 'Order marked as shipped', description: `Tracking: ${trackingNumber.trim()}`, kind: 'success' });
      await loadOrders();
    } catch (e: any) {
      setShipError(e.response?.data?.message || 'Failed to update order. Please try again.');
    }
  };

  const handleComplete = async (orderId: string) => {
    try {
      await marketplaceApi.completeOrder(orderId);
      showToast({ title: 'Order marked as complete', kind: 'success' });
      await loadOrders();
    } catch (e: any) {
      showToast({ title: 'Could not complete order', description: e.response?.data?.message || 'Please try again.', kind: 'error' });
    }
  };

  const handleReview = async () => {
    if (!reviewModal) return;
    try {
      await createReview(reviewModal.orderId, rating, reviewComment);
      setReviewModal(null);
      setRating(5);
      setReviewComment('');
      showToast({ title: 'Review submitted', kind: 'success' });
      await loadOrders();
    } catch (e: any) {
      showToast({ title: 'Could not submit review', description: e.response?.data?.message || 'Please try again.', kind: 'error' });
    }
  };

  const current = tab === 'buying' ? buyingOrders : sellingOrders;

  return (
    <ProtectedPageShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>Orders</h1>
        <Link href="/marketplace">
          <button style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>
            ← Browse Marketplace
          </button>
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--embr-border)', marginBottom: '1.5rem' }}>
        {[
          { key: 'buying', label: `Buying (${buyingOrders.length})` },
          { key: 'selling', label: `Selling (${sellingOrders.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            style={{
              padding: '0.625rem 1.5rem', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: tab === t.key ? '700' : '500',
              color: tab === t.key ? 'var(--embr-accent)' : 'var(--embr-muted-text)',
              borderBottom: tab === t.key ? '2px solid var(--embr-accent)' : '2px solid transparent',
              fontSize: '0.875rem',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageState type="loading" title="Loading orders..." />
      ) : current.length === 0 ? (
        <PageState type="empty" title={`No ${tab} orders`} description={tab === 'buying' ? "When you buy something, it'll show up here." : "When someone buys from you, it'll show up here."} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {current.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              role={tab === 'buying' ? 'buyer' : 'seller'}
              onShip={handleShip}
              onComplete={handleComplete}
              onReview={(id) => setReviewModal({ orderId: id })}
            />
          ))}
        </div>
      )}

      {/* Ship modal */}
      {shipModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="ship-modal-title" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShipModal(null)} aria-hidden="true" />
          <div style={{ position: 'relative', background: 'var(--embr-surface)', borderRadius: 'var(--embr-radius-lg)', padding: '1.5rem', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 id="ship-modal-title" style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: '700' }}>Mark as Shipped</h2>
            <div style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="tracking-number" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.375rem' }}>Tracking Number</label>
              <input
                id="tracking-number"
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. 1Z999AA10123456784"
                style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>
            {shipError && (
              <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--embr-error)', padding: '0.625rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-error)', background: 'color-mix(in srgb, var(--embr-error) 10%, white)' }}>
                {shipError}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShipModal(null)} style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              <button onClick={handleShipSubmit} style={{ padding: '0.5rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '700' }}>Confirm Shipment</button>
            </div>
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="review-modal-title" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setReviewModal(null)} aria-hidden="true" />
          <div style={{ position: 'relative', background: 'var(--embr-surface)', borderRadius: 'var(--embr-radius-lg)', padding: '1.5rem', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 id="review-modal-title" style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: '700' }}>Leave a Review</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>Rating</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: n <= rating ? '#f59e0b' : 'var(--embr-border)', padding: 0 }}>
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="review-comment" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.375rem' }}>Comment (optional)</label>
              <textarea id="review-comment" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} placeholder="How was the item and the seller?" style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setReviewModal(null)} style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              <button onClick={handleReview} style={{ padding: '0.5rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '700' }}>Submit Review</button>
            </div>
          </div>
        </div>
      )}
    </ProtectedPageShell>
  );
}
