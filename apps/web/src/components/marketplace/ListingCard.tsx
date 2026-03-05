import React from 'react';
import Link from 'next/link';
import type { MarketplaceListing } from '@embr/types';
import { LISTING_CONDITION_LABELS } from '@embr/types';

interface ListingCardProps {
  listing: MarketplaceListing;
}

const TYPE_ICON: Record<string, string> = {
  PHYSICAL: '📦',
  DIGITAL: '💾',
  BUNDLE: '🎁',
};

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  const mainImage = listing.images[0];
  const price = (listing.price / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <Link href={`/marketplace/${listing.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--embr-surface)',
        border: '1px solid var(--embr-border)',
        borderRadius: 'var(--embr-radius-lg)',
        overflow: 'hidden',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: 'pointer',
      }}>
        {/* Image */}
        <div style={{
          height: '180px',
          background: mainImage ? `url(${mainImage}) center/cover no-repeat` : 'linear-gradient(135deg, var(--embr-bg) 0%, var(--embr-border) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          {!mainImage && <span style={{ fontSize: '2.5rem', opacity: 0.4 }}>{TYPE_ICON[listing.type]}</span>}
          {listing.status !== 'ACTIVE' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.875rem', textTransform: 'capitalize' }}>
                {listing.status.toLowerCase()}
              </span>
            </div>
          )}
        </div>

        <div style={{ padding: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.375rem' }}>
            <h3 style={{
              margin: 0, fontSize: '0.9rem', fontWeight: '700', color: 'var(--embr-text)',
              overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {listing.title}
            </h3>
            <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--embr-accent)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {price}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {listing.condition && (
              <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', borderRadius: '999px', background: 'var(--embr-bg)', color: 'var(--embr-muted-text)', border: '1px solid var(--embr-border)' }}>
                {LISTING_CONDITION_LABELS[listing.condition]}
              </span>
            )}
            <span style={{ fontSize: '0.72rem', color: 'var(--embr-muted-text)' }}>
              {TYPE_ICON[listing.type]} {listing.type.charAt(0) + listing.type.slice(1).toLowerCase()}
            </span>
            {listing.location && (
              <span style={{ fontSize: '0.72rem', color: 'var(--embr-muted-text)', marginLeft: 'auto' }}>
                📍 {listing.location}
              </span>
            )}
          </div>

          {/* Seller */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.625rem' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: listing.seller?.profile?.avatarUrl ? `url(${listing.seller.profile.avatarUrl}) center/cover` : 'var(--embr-warm-1)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--embr-muted-text)' }}>
              {listing.seller?.profile?.displayName || listing.seller?.username}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
