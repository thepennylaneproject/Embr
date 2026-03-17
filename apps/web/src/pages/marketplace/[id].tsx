import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useAuth } from '@/contexts/AuthContext';
import { PageState } from '@/components/ui/PageState';
import { useToast } from '@embr/ui';
import type { MarketplaceListing } from '@embr/types';
import { LISTING_CONDITION_LABELS } from '@embr/types';

export default function ListingDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { getListing, createOrder, makeOffer, loading: _loading } = useMarketplace();
  const { showToast } = useToast();

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [buyError, setBuyError] = useState('');
  const [offerError, setOfferError] = useState('');

  useEffect(() => {
    if (!id) return;
    getListing(id as string).then(setListing).catch((e) => setError(e.response?.data?.message || 'Not found')).finally(() => setPageLoading(false));
  }, [id]);

  const handleBuy = async () => {
    if (!listing) return;
    setBuyError('');
    setOrderLoading(true);
    try {
      await createOrder({ listingId: listing.id });
      setShowBuyModal(false);
      setOrderSuccess(true);
    } catch (e: any) {
      setBuyError(e.response?.data?.message || 'Order failed. Please try again or contact support.');
    } finally {
      setOrderLoading(false);
    }
  };

  const handleOffer = async () => {
    if (!listing || !offerAmount) return;
    setOfferError('');
    setOrderLoading(true);
    try {
      await makeOffer(listing.id, Math.round(parseFloat(offerAmount) * 100), offerMessage);
      setShowOfferModal(false);
      showToast({ title: 'Offer sent!', description: 'The seller will be notified of your offer.', kind: 'success' });
    } catch (e: any) {
      setOfferError(e.response?.data?.message || 'Failed to send offer. Please try again.');
    } finally {
      setOrderLoading(false);
    }
  };

  if (pageLoading) return <ProtectedPageShell><PageState type="loading" title="Loading..." /></ProtectedPageShell>;
  if (error || !listing) return <ProtectedPageShell><PageState type="empty" title="Listing not found" description={error} /></ProtectedPageShell>;

  const isSeller = listing.sellerId === user?.id;
  const price = (listing.price / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const avgRating = listing.reviews?.length ? listing.reviews.reduce((s, r) => s + r.rating, 0) / listing.reviews.length : null;

  return (
    <ProtectedPageShell>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Link href="/marketplace" style={{ fontSize: '0.875rem', color: 'var(--embr-muted-text)', textDecoration: 'none', display: 'block', marginBottom: '1.25rem' }}>
          ← Back to Marketplace
        </Link>

        {orderSuccess && (
          <div style={{ padding: '1rem', borderRadius: 'var(--embr-radius-md)', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', marginBottom: '1.5rem', fontWeight: '600' }}>
            ✓ Order placed! <Link href="/marketplace/orders" style={{ color: '#16a34a' }}>View your orders →</Link>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Images */}
          <div>
            <div style={{ height: '320px', borderRadius: 'var(--embr-radius-lg)', overflow: 'hidden', background: 'var(--embr-bg)', marginBottom: '0.75rem' }}>
              {listing.images.length > 0 ? (
                <img src={listing.images[activeImageIdx]} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', opacity: 0.3 }}>📦</div>
              )}
            </div>
            {listing.images.length > 1 && (
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
                {listing.images.map((img, i) => (
                  <div key={i} onClick={() => setActiveImageIdx(i)} style={{ width: '64px', height: '64px', borderRadius: 'var(--embr-radius-md)', cursor: 'pointer', overflow: 'hidden', border: `2px solid ${i === activeImageIdx ? 'var(--embr-accent)' : 'var(--embr-border)'}`, flexShrink: 0 }}>
                    <img src={img} alt={`${listing.title} photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info + buy panel */}
          <div>
            <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.375rem', fontWeight: '800', lineHeight: 1.3 }}>{listing.title}</h1>

            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--embr-accent)', marginBottom: '1rem' }}>{price}</div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {listing.condition && (
                <span style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', borderRadius: '999px', background: 'var(--embr-bg)', border: '1px solid var(--embr-border)', color: 'var(--embr-muted-text)' }}>
                  {LISTING_CONDITION_LABELS[listing.condition]}
                </span>
              )}
              <span style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', borderRadius: '999px', background: 'var(--embr-bg)', border: '1px solid var(--embr-border)', color: 'var(--embr-muted-text)' }}>
                {listing.category}
              </span>
              {listing.location && (
                <span style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)' }}>📍 {listing.location}</span>
              )}
              {listing.isShippable && listing.shippingCost !== undefined && (
                <span style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)' }}>
                  🚚 {listing.shippingCost === 0 ? 'Free shipping' : `+${(listing.shippingCost / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} shipping`}
                </span>
              )}
              {avgRating && (
                <span style={{ fontSize: '0.78rem', color: '#f59e0b' }}>
                  {'★'.repeat(Math.round(avgRating))} ({listing.reviews?.length} reviews)
                </span>
              )}
            </div>

            {/* Seller */}
            <Link href={`/${listing.seller?.username}`} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none', marginBottom: '1.25rem', padding: '0.75rem', background: 'var(--embr-bg)', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: listing.seller?.profile?.avatarUrl ? `url(${listing.seller.profile.avatarUrl}) center/cover` : 'var(--embr-warm-1)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--embr-text)' }}>
                  {listing.seller?.profile?.displayName || listing.seller?.username}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--embr-muted-text)' }}>Seller</div>
              </div>
            </Link>

            {/* CTA */}
            {!isSeller && listing.status === 'ACTIVE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <button onClick={() => setShowBuyModal(true)} style={{ padding: '0.75rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '800', fontSize: '1rem' }}>
                  Buy Now
                </button>
                {listing.allowOffers && (
                  <button onClick={() => setShowOfferModal(true)} style={{ padding: '0.75rem', borderRadius: 'var(--embr-radius-md)', border: '2px solid var(--embr-accent)', background: 'transparent', color: 'var(--embr-accent)', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem' }}>
                    Make an Offer
                  </button>
                )}
              </div>
            )}

            {isSeller && (
              <Link href={`/marketplace/sell?edit=${listing.id}`}>
                <button style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '700' }}>
                  Edit Listing
                </button>
              </Link>
            )}

            {listing.status !== 'ACTIVE' && !isSeller && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--embr-radius-md)', background: 'var(--embr-bg)', textAlign: 'center', color: 'var(--embr-muted-text)', fontWeight: '600' }}>
                This listing is no longer available
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--embr-surface)', border: '1px solid var(--embr-border)', borderRadius: 'var(--embr-radius-lg)' }}>
          <h2 style={{ margin: '0 0 0.875rem', fontSize: '1rem', fontWeight: '700' }}>Description</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--embr-muted-text)', whiteSpace: 'pre-wrap' }}>{listing.description}</p>
        </div>

        {/* Reviews */}
        {listing.reviews && listing.reviews.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: '700' }}>Reviews ({listing.reviews.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {listing.reviews.map((review) => (
                <div key={review.id} style={{ padding: '1rem', background: 'var(--embr-surface)', border: '1px solid var(--embr-border)', borderRadius: 'var(--embr-radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{review.reviewer?.profile?.displayName || review.reviewer?.username}</div>
                    <span style={{ color: '#f59e0b' }}>{'★'.repeat(review.rating)}</span>
                  </div>
                  {review.comment && <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--embr-muted-text)', lineHeight: 1.6 }}>{review.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Buy modal */}
      {showBuyModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="buy-modal-title" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowBuyModal(false)} aria-hidden="true" />
          <div style={{ position: 'relative', background: 'var(--embr-surface)', borderRadius: 'var(--embr-radius-lg)', padding: '1.5rem', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 id="buy-modal-title" style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: '700' }}>Confirm Purchase</h2>
            <div style={{ background: 'var(--embr-bg)', borderRadius: 'var(--embr-radius-md)', padding: '0.875rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--embr-muted-text)' }}>Item</span>
                <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{price}</span>
              </div>
              {listing.isShippable && listing.shippingCost !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--embr-muted-text)' }}>Shipping</span>
                  <span style={{ fontSize: '0.875rem' }}>{listing.shippingCost === 0 ? 'Free' : (listing.shippingCost / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--embr-border)', paddingTop: '0.375rem', marginTop: '0.375rem' }}>
                <span style={{ fontWeight: '700' }}>Platform fee (2%)</span>
                <span style={{ fontWeight: '600' }}>{(listing.price * 0.02 / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
              </div>
            </div>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: 'var(--embr-muted-text)' }}>
              Payment processing coming soon. This will create a pending order.
            </p>
            {buyError && (
              <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--embr-error)', padding: '0.625rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-error)', background: 'color-mix(in srgb, var(--embr-error) 10%, white)' }}>
                {buyError}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowBuyModal(false); setBuyError(''); }} style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              <button onClick={handleBuy} disabled={orderLoading} style={{ padding: '0.5rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '700', opacity: orderLoading ? 0.7 : 1 }}>
                {orderLoading ? 'Placing...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offer modal */}
      {showOfferModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="offer-modal-title" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => { setShowOfferModal(false); setOfferError(''); }} aria-hidden="true" />
          <div style={{ position: 'relative', background: 'var(--embr-surface)', borderRadius: 'var(--embr-radius-lg)', padding: '1.5rem', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 id="offer-modal-title" style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: '700' }}>Make an Offer</h2>
            <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--embr-muted-text)' }}>
              Listed at {price}. Your offer will be sent to the seller.
            </p>
            <div style={{ marginBottom: '0.875rem' }}>
              <label htmlFor="offer-amount" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.375rem' }}>Offer Amount (USD)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: 'var(--embr-muted-text)' }} aria-hidden="true">$</span>
                <input id="offer-amount" type="number" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} min="0.01" step="0.01" style={{ width: '100%', padding: '0.625rem 0.75rem 0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', fontSize: '0.9rem', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="offer-message" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.375rem' }}>Message (optional)</label>
              <textarea id="offer-message" value={offerMessage} onChange={(e) => setOfferMessage(e.target.value)} rows={3} placeholder="Why are you making this offer?" style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            {offerError && (
              <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--embr-error)', padding: '0.625rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-error)', background: 'color-mix(in srgb, var(--embr-error) 10%, white)' }}>
                {offerError}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowOfferModal(false); setOfferError(''); }} style={{ padding: '0.5rem 1.25rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              <button onClick={handleOffer} disabled={orderLoading || !offerAmount} style={{ padding: '0.5rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '700', opacity: (orderLoading || !offerAmount) ? 0.7 : 1 }}>
                {orderLoading ? 'Sending...' : 'Send Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedPageShell>
  );
}
