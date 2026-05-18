import ToolbarSearch from './ToolbarSearch';
import TableToolbarActions from './TableToolbarActions';

/**
 * Barre d’outils standard des pages liste : recherche + filtres optionnels + export + nouveau.
 */
export default function ListPageToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Rechercher…',
  searchAriaLabel = 'Rechercher',
  filters = null,
  exportColumns,
  exportRows,
  exportFilename,
  exportSheetName,
  showNew = false,
  onNew,
  newLabel = 'Nouveau',
  trailing = null,
}) {
  return (
    <div className="table-page-toolbar-row">
      <ToolbarSearch
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        ariaLabel={searchAriaLabel}
        className="list-toolbar-search"
      />
      {filters}
      <TableToolbarActions
        exportColumns={exportColumns}
        exportRows={exportRows}
        exportFilename={exportFilename}
        exportSheetName={exportSheetName}
        showNew={showNew}
        onNew={onNew}
        newLabel={newLabel}
      >
        {trailing}
      </TableToolbarActions>
    </div>
  );
}
