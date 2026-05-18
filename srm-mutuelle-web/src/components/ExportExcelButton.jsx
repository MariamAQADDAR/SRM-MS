import { useState } from 'react';
import FaIcon from './FaIcon';
import { exportTableToExcel } from '../utils/exportExcel';

export default function ExportExcelButton({ columns, rows, filename, sheetName, disabled }) {
  const [busy, setBusy] = useState(false);
  const empty = !rows?.length;

  const handleExport = async () => {
    if (empty || busy) return;
    setBusy(true);
    try {
      await exportTableToExcel({ filename, sheetName, columns, rows });
    } catch {
      // erreur silencieuse côté UI ; le parent peut logger si besoin
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-outline"
      disabled={disabled || empty || busy}
      title={empty ? 'Aucune donnée à exporter' : 'Exporter en Excel (.xlsx)'}
      onClick={handleExport}
    >
      <FaIcon name={busy ? 'spinner' : 'file-excel'} className={`fa-inline-icon${busy ? ' fa-spin' : ''}`} />{' '}
      {busy ? 'Export…' : 'Export Excel'}
    </button>
  );
}
