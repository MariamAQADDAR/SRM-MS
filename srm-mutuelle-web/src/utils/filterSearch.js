/** Filtre texte insensible à la casse sur une ou plusieurs valeurs. */
export function matchesSearch(query, ...values) {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return true;
  return values.some((v) => String(v ?? '').toLowerCase().includes(q));
}
