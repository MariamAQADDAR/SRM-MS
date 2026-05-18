import FaIcon from './FaIcon';
import ExportExcelButton from './ExportExcelButton';

/** Boutons Export Excel + action « Nouveau » (alignés à droite de la barre d’outils). */
export default function TableToolbarActions({
  exportColumns,
  exportRows,
  exportFilename,
  exportSheetName,
  showNew = false,
  onNew,
  newLabel = 'Nouveau',
  children = null,
}) {
  return (
    <>
      <span className="toolbar-spacer" />
      {exportColumns?.length ? (
        <ExportExcelButton
          columns={exportColumns}
          rows={exportRows}
          filename={exportFilename}
          sheetName={exportSheetName || exportFilename}
        />
      ) : null}
      {showNew && onNew ? (
        <button type="button" className="btn btn-primary" onClick={onNew}>
          <FaIcon name="plus" className="fa-inline-icon" /> {newLabel}
        </button>
      ) : null}
      {children}
    </>
  );
}
