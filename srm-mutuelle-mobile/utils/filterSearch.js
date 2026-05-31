export function matchesSearch(query, ...fields) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return true;
  return fields.some((f) => {
    if (f == null) return false;
    return String(f).toLowerCase().includes(q);
  });
}
