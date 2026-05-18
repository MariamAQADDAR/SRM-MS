import FaIcon from './FaIcon';

export default function AdminDeleteButton({ onClick, title = 'Supprimer', disabled }) {
  return (
    <button
      type="button"
      className="btn btn-icon btn-delete"
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      <FaIcon name="trash" />
    </button>
  );
}
