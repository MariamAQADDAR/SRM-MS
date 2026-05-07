import Swal from 'sweetalert2';

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

