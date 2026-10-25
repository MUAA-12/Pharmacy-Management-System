import React from 'react';

export default function Badge({ status, type = 'medicine' }) {
  if (!status) return null;

  let badgeClass = 'badge-in-stock';
  const s = status.toLowerCase();

  if (type === 'reservation') {
    if (s === 'pending') badgeClass = 'badge-pending';
    else if (s === 'completed') badgeClass = 'badge-completed';
    else if (s === 'cancelled') badgeClass = 'badge-cancelled';
  } else {
    // Medicine / Stock / Expiry types
    if (s === 'in stock' || s === 'optimal') badgeClass = 'badge-in-stock';
    else if (s === 'low stock' || s.includes('reorder') || s.includes('low')) badgeClass = 'badge-low-stock';
    else if (s === 'out of stock' || s.includes('out of stock')) badgeClass = 'badge-out-of-stock';
    else if (s === 'expired') badgeClass = 'badge-expired';
    else if (s === 'near expiry' || s.includes('expiring')) badgeClass = 'badge-near-expiry';
  }

  return <span className={`badge ${badgeClass}`}>{status}</span>;
}
