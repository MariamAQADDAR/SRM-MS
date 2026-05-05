import React from 'react';
import FaIcon from './FaIcon';

export default function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-container" id="toastContainer">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-icon">
            {t.type === 'success' ? <FaIcon name="circle-check" /> : t.type === 'error' ? <FaIcon name="circle-xmark" /> : t.type === 'warning' ? <FaIcon name="triangle-exclamation" /> : <FaIcon name="circle-info" />}
          </span>
          <span className="toast-msg">{t.message}</span>
          <button type="button" className="toast-close" onClick={() => removeToast(t.id)} aria-label="Fermer"><FaIcon name="xmark" /></button>
        </div>
      ))}
    </div>
  );
}
