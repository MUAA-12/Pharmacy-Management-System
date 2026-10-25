import React from 'react';
import { IconCheckCircle, IconXCircle, IconAlertTriangle } from './Icons';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type || 'info'}`} onClick={() => onDismiss(toast.id)}>
          {toast.type === 'success' && <IconCheckCircle size={20} />}
          {toast.type === 'error' && <IconXCircle size={20} />}
          {toast.type === 'warning' && <IconAlertTriangle size={20} />}
          <div style={{ flex: 1 }}>{toast.message}</div>
          <button 
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(toast.id);
            }}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
