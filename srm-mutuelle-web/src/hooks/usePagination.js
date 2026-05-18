import { useEffect, useMemo, useState } from 'react';

export const PAGE_SIZE = 10;

/**
 * Découpe une liste en pages de 10 éléments. Réinitialise à la page 1 quand les deps changent.
 */
export function usePagination(items, resetKey = '') {
  const [page, setPage] = useState(1);
  const list = items ?? [];
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [list.length, resetKey]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, [list, page]);

  return { page, setPage, pageData, totalPages };
}
