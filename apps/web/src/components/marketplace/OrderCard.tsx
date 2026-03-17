import React from 'react';
import Link from 'next/link';
import type { MarketplaceOrder, OrderStatus } from '@embr/types';

interface OrderCardProps {
  order: MarketplaceOrder;
  role: 'buyer' | 'seller';
  onShip?: (orderId: string) => void;
  onComplete?: (orderId: string) => void;
  onReview?: (orderId: string) => void;
}

const STATUS_STEPS: OrderStatus[] = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  PAID: '#3b82f6',
  PROCESSING: '#6366f1',
  SHIPPED: '#8b5cf6',
  DELIVERED: '#22c55e',
  COMPLETED: '#16a34a',
  DISPUTED: '#ef4444',
  REFUNDED: '#6b7280',
  CANCELLED: '#6b7280',
};

export const OrderCard: React.FC<OrderCardProps> = ({ order, role, onShip, onComplete, onReview }) => {
  const total = (order.totalAmount / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const statusColor = STATUS_COLORS[order.status] || '#6b7280';
  const statusIdx = STATUS_STEPS.indexOf(order.status as OrderStatus);
  const otherParty = role === 'buyer' ? order.seller : order.buyer;

  return (
    <div style={{ background: 'var(--embr-surface)', border: '1px solid var(--embr-border)', borderRadius: 'var(--embr-radius-lg)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--embr-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', background: 'var(--embr-bg)' }}>
        <div>
          <Link href={`/marketplace/${order.listingId}`} style={{ textDecoration: 'none' }}>
            <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--embr-text)' }}>
              {order.listing?.title || `Order #${order.id.slice(-6)}`}
            </div>
          </Link>
          <div style={{ fontSize: '0.75rem', color: 'var(--embr-muted-text)', marginTop: '0.1rem' }}>
            {role === 'buyer' ? 'Seller' : 'Buyer'}: {otherParty?.profile?.displayName || otherParty?.username} · {new Date(order.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--embr-text)' }}>{total}</div>
          <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '0.15rem 0.5rem', borderRadius: '999px', background: `${statusColor}22`, color: statusColor }}>
            {order.status.charAt(0) + order.status.slice(1).toLowerCase().replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Progress bar (for active orders) */}
      {statusIdx >= 0 && (
        <div style={{ padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', gap: '2px', marginBottom: '0.375rem' }}>
            {STATUS_STEPS.map((s, i) => (
              <div key={s} style={{ flex: 1, height: '4px', borderRadius: '999px', background: i <= statusIdx ? 'var(--embr-accent)' : 'var(--embr-border)', transition: 'background 0.2s' }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {STATUS_STEPS.map((s, i) => (
              <span key={s} style={{ fontSize: '0.62rem', color: i <= statusIdx ? 'var(--embr-accent)' : 'var(--embr-muted-text)', display: i === 0 || i === STATUS_STEPS.length - 1 || i === statusIdx ? 'block' : 'none' }}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tracking */}
      {order.trackingNumber && (
        <div style={{ padding: '0.5rem 1rem', background: 'var(--embr-bg)', fontSize: '0.82rem', color: 'var(--embr-muted-text)' }}>
          📮 Tracking: <span style={{ fontWeight: '600', color: 'var(--embr-text)' }}>{order.trackingNumber}</span>
        </div>
      )}

      {/* Listing thumbnail */}
      {order.listing?.images?.[0] && (
        <div style={{ padding: '0.625rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', borderTop: '1px solid var(--embr-border)' }}>
          <img src={order.listing.images[0]} alt={order.listing?.title || 'Order item'} style={{ width: '48px', height: '48px', borderRadius: 'var(--embr-radius-md)', objectFit: 'cover' }} />
          <div style={{ fontSize: '0.8rem', color: 'var(--embr-muted-text)' }}>Qty: {order.quantity} · {total}</div>
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--embr-border)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {role === 'seller' && order.status === 'PAID' && onShip && (
          <button onClick={() => onShip(order.id)} style={{ padding: '0.375rem 0.875rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
            Mark Shipped
          </button>
        )}
        {role === 'buyer' && order.status === 'DELIVERED' && onComplete && (
          <button onClick={() => onComplete(order.id)} style={{ padding: '0.375rem 0.875rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
            Confirm Received
          </button>
        )}
        {role === 'buyer' && order.status === 'COMPLETED' && !order.review && onReview && (
          <button onClick={() => onReview(order.id)} style={{ padding: '0.375rem 0.875rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-accent)', background: 'transparent', color: 'var(--embr-accent)', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
            Leave Review
          </button>
        )}
        {order.review && (
          <span style={{ fontSize: '0.8rem', color: '#22c55e', fontWeight: '600' }}>
            ⭐ {'★'.repeat(order.review.rating)} Reviewed
          </span>
        )}
      </div>
    </div>
  );
};
