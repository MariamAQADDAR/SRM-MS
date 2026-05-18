import FaIcon from './FaIcon';

export default function TablePagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const go = (p) => {
    if (p < 1 || p > totalPages || p === page) return;
    onPageChange(p);
  };

  const pages = [];
  for (let i = 1; i <= totalPages; i += 1) pages.push(i);

  return (
    <div className="pagination table-pagination-bar">
      <div className="pagination-btns" role="navigation" aria-label="Pagination">
        <button type="button" disabled={page <= 1} onClick={() => go(page - 1)} aria-label="Page précédente">
          <FaIcon name="chevron-left" />
        </button>
        {pages.map((p) => (
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
        ))}
        <button type="button" disabled={page >= totalPages} onClick={() => go(page + 1)} aria-label="Page suivante">
          <FaIcon name="chevron-right" />
        </button>
      </div>
    </div>
  );
}
