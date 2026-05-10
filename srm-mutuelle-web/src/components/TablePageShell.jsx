import FaIcon from './FaIcon';

/**
 * Gabarit liste / tableau : bandeau bleu (titre + icône), zone blanche (barre d’outils optionnelle), corps (table).
 */
export default function TablePageShell({ title, icon = 'table', toolbar, children, className = '' }) {
  const showToolbar = toolbar != null && toolbar !== false;
  return (
    <div className={`table-page-shell ${className}`.trim()}>
      <header className="table-page-head">
        <FaIcon name={icon} className="table-page-head-icon fa-inline-icon" />
        <span className="table-page-head-title">{title}</span>
      </header>
      {showToolbar && <div className="table-page-toolbar">{toolbar}</div>}
      <div className="table-page-body">{children}</div>
    </div>
  );
}
