import React from 'react';

export default function StatCard({ label, value, meta, icon, color = 'teal', onClick }) {
  return (
    <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {meta && <div className="stat-meta">{meta}</div>}
      </div>
      <div className={`stat-icon ${color}`}>
        {icon}
      </div>
    </div>
  );
}
