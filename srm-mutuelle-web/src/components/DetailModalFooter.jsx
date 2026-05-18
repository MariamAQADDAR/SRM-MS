import FaIcon from './FaIcon';

/** Pied de modal détail : Fermer + Modifier optionnel. */
export default function DetailModalFooter({ onClose, onEdit, canEdit }) {
  return (
    <div className="modal-footer detail-modal-footer">
      <button type="button" className="btn btn-outline" onClick={onClose}>
        Fermer
      </button>
      {canEdit && onEdit ? (
        <button type="button" className="btn btn-primary" onClick={onEdit}>
          <FaIcon name="pen-to-square" className="fa-inline-icon" /> Modifier
        </button>
      ) : null}
    </div>
  );
}
