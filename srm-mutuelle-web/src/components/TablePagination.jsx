import FaIcon from './FaIcon';

/**
 * Pagination compacte avec ellipsis.
 * Affiche : [◀] 1 … p-1 p p+1 … N [▶]  (max 7 boutons numérotés)
 */
export default function TablePagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const go = (p) => {
    if (p < 1 || p > totalPages || p === page) return;
    onPageChange(p);
  };

  /* Calcul des pages visibles */
  const buildPages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set([1, totalPages]);
    for (let d = -2; d <= 2; d++) {
      const p = page + d;
      if (p >= 1 && p <= totalPages) pages.add(p);
    }
    const sorted = [...pages].sort((a, b) => a - b);
    /* Insérer ellipsis là où il y a un saut > 1 */
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('…');
      result.push(sorted[i]);
    }
    return result;
  };

  const pages = buildPages();

  return (
    <div className="pagination table-pagination-bar">
      <div className="pagination-btns" role="navigation" aria-label="Pagination">
        <button type="button" disabled={page <= 1} onClick={() => go(page - 1)} aria-label="Page précédente">
          <FaIcon name="chevron-left" />
        </button>
        {pages.map((p, idx) =>
          p === '…' ? (
            <span key={`ell-${idx}`} className="pagination-ellipsis">…</span>
          ) : (
            <button
              key={p}
              type="button"
              className={p === page ? 'active' : undefined}
              onClick={() => go(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}
        <button type="button" disabled={page >= totalPages} onClick={() => go(page + 1)} aria-label="Page suivante">
          <FaIcon name="chevron-right" />
        </button>
      </div>
      <span className="pagination-info">
        Page {page} / {totalPages}
      </span>
    </div>
  );
}
