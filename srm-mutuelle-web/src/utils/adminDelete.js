import { apiFetch, parseJsonOrThrow } from '../api/client';
import { confirmDelete } from './swal';

export async function adminDeleteRecord({ url, label, addToast, onSuccess }) {
  const ok = await confirmDelete({
    itemLabel: label,
    text: label ? `« ${label} » sera définitivement supprimé.` : undefined,
  });
  if (!ok) return false;
  try {
    await parseJsonOrThrow(await apiFetch(url, { method: 'DELETE' }));
    addToast('success', 'Suppression effectuée');
    onSuccess?.();
    return true;
  } catch (e) {
    addToast('error', e.message || 'Suppression impossible');
    return false;
  }
}
