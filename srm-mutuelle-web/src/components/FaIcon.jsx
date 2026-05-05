import React from 'react';

/** Icône Font Awesome (style solid). Prérequis : CSS @fortawesome/fontawesome-free chargé dans main.jsx */
export default function FaIcon({ name, className = '', style, title }) {
  return (
    <i
      className={`fa-solid fa-${name} ${className}`.trim()}
      style={style}
      aria-hidden={title ? undefined : true}
      title={title}
    />
  );
}
