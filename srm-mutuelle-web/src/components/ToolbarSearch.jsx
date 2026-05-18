import FaIcon from './FaIcon';

/** Barre de recherche standard (icône bleue + champ), hauteur alignée avec les selects toolbar. */
export default function ToolbarSearch({
  value,
  onChange,
  placeholder = 'Rechercher…',
  ariaLabel = 'Rechercher',
  className = '',
  style,
}) {
  return (
    <div className={`table-search-wrap${className ? ` ${className}` : ''}`} style={style}>
      <span className="table-search-icon-btn" aria-hidden>
        <FaIcon name="magnifying-glass" />
      </span>
      <input
        type="search"
        className="form-control table-search-input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete="off"
        aria-label={ariaLabel}
      />
    </div>
  );
}
