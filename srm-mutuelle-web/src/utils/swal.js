import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

export function showSuccess(title, text) {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    timer: 2200,
    showConfirmButton: false,
  });
}

export async function confirmAction({
  title = 'Confirmer',
  text = 'Voulez-vous continuer ?',
  confirmButtonText = 'Oui',
  cancelButtonText = 'Annuler',
  icon = 'warning',
} = {}) {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
  });
  return result.isConfirmed;
}

/** Confirmation de suppression (remplace `window.confirm`). */
export async function confirmDelete({
  itemLabel,
  text,
  confirmButtonText = 'Oui, supprimer',
  cancelButtonText = 'Annuler',
} = {}) {
  const detail =
    text ||
    (itemLabel != null
      ? `La valeur « ${itemLabel} » sera retirée de la liste. Cette action est immédiate après validation.`
      : 'Cette action est immédiate après validation.');
  return confirmAction({
    title: 'Voulez-vous supprimer ?',
    text: detail,
    confirmButtonText,
    cancelButtonText,
    icon: 'warning',
  });
}

/**
 * Saisie texte (ajout / modification). Retourne la chaîne trimée ou `null` si annulé.
 */
export async function promptText({
  title,
  text = '',
  inputLabel = '',
  placeholder = '',
  inputValue = '',
  confirmButtonText = 'Valider',
  cancelButtonText = 'Annuler',
  inputValidator,
} = {}) {
  const result = await Swal.fire({
    title,
    text: text || undefined,
    input: 'text',
    inputLabel: inputLabel || undefined,
    inputPlaceholder: placeholder || undefined,
    inputValue: inputValue ?? '',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    inputValidator:
      inputValidator ||
      ((v) => {
        if (!String(v || '').trim()) return 'Veuillez saisir une valeur.';
        return undefined;
      }),
  });
  if (result.isConfirmed && result.value != null) {
    return String(result.value).trim();
  }
  return null;
}

