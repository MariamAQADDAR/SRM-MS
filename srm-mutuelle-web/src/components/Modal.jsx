import React from 'react';
import { createPortal } from 'react-dom';
import FaIcon from './FaIcon';

export default function Modal({ title, children, onClose, variant = 'default' }) {
  if (!children) return null;
  const modalClass = variant === 'detail' ? 'modal modal--detail active' : 'modal active';
  return createPortal(
    <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) onClose(); }}>
      <div className={modalClass}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer"><FaIcon name="xmark" /></button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
