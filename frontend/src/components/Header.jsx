import React from 'react';
import { IconRefresh } from './Icons';

export default function Header({ pageTitle, pageSubtitle, onRefresh, isRefreshing, onToggleMobile }) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {onToggleMobile && (
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={onToggleMobile}
            style={{ display: 'inline-flex' }}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        )}
        <div className="header-title-group">
          <h1>{pageTitle}</h1>
          {pageSubtitle && <p>{pageSubtitle}</p>}
        </div>
      </div>

      <div className="header-actions">
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          {currentDate}
        </span>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh live data from PostgreSQL"
        >
          <span style={{ display: 'inline-block', transform: isRefreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s ease' }}>
            <IconRefresh size={16} />
          </span>
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>
    </header>
  );
}
