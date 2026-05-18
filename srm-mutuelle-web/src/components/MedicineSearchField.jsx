import React, { useEffect, useState } from 'react';
import { apiFetch, parseJsonOrThrow } from '../api/client';

export default function MedicineSearchField({ value, onChange, required }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (!query || query.length < 2) {
        setResults([]);
        return;
      }
      try {
        const list = await parseJsonOrThrow(await apiFetch(`/api/medicines?q=${encodeURIComponent(query)}`));
        if (!cancelled) setResults(list.slice(0, 12));
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const pick = (m) => {
    onChange(m.name);
    setQuery(m.name);
    setOpen(false);
  };

  return (
    <div className="form-group medicine-search-field">
      <label>Médicament {required ? '*' : ''}</label>
      <input
        type="text"
        className="form-control"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Rechercher dans la liste remboursable…"
        required={required}
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <ul className="medicine-search-dropdown">
          {results.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => pick(m)}>
                {m.name}
                <span className={m.reimbursed ? 'badge badge-success' : 'badge badge-neutral'}>
                  {m.reimbursed ? 'Remboursé' : 'Non remboursé'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
