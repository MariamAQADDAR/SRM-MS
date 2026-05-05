import React from 'react';
import FaIcon from './FaIcon';

export default function Modal({ title, children, onClose }) {
  if (!children) return null;
  return (
    <div className="modal-overlay active" onClick={(e) => { if (e.target.classList.contains('modal-overlay')) onClose(); }}>
      <div className="modal active">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer"><FaIcon name="xmark" /></button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
