export function formatDate(d) {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : '';
  if (!s) return '—';
  const [y, m, day] = s.split('-');
  return `${day}/${m}/${y}`;
}

export function formatMoney(v) {
  if (v == null || v === '') return '—';
  return `${Number(v).toLocaleString('fr-FR')} DH`;
}

export function getStatusColor(statut) {
  if (!statut) return '#2ab4dd';
  const lower = String(statut).toLowerCase();
  if (lower.includes('validé') || lower.includes('approuvé') || lower.includes('traité') || lower.includes('clôturé') || lower === 'actif') {
    return '#22b56f';
  }
  if (lower.includes('attente')) return '#f29a4a';
  if (lower.includes('rejeté') || lower === 'inactif') return '#ef4444';
  return '#2ab4dd';
}
