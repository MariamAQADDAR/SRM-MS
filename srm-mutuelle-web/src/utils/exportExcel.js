import ExcelJS from 'exceljs';

const BLACK = { argb: 'FF000000' };
const HEADER_FILL = { argb: 'FF0F6FB8' };
const HEADER_FONT = { argb: 'FFFFFFFF' };
const ALT_ROW_FILL = { argb: 'FFF0F7FC' };

const CELL_BORDER = {
  top: { style: 'thin', color: BLACK },
  left: { style: 'thin', color: BLACK },
  bottom: { style: 'thin', color: BLACK },
  right: { style: 'thin', color: BLACK },
};

function cellValue(row, col) {
  if (typeof col.value === 'function') return col.value(row);
  const v = row[col.key];
  if (v == null) return '';
  if (typeof v === 'object') return String(v);
  return v;
}

function displayValue(raw) {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'boolean') return raw ? 'Oui' : 'Non';
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return String(raw);
}

function sanitizeSheetName(name) {
  const s = String(name || 'Données')
    .replace(/[\\/*?:[\]]/g, ' ')
    .trim()
    .slice(0, 31);
  return s || 'Données';
}

function applyBorder(cell) {
  cell.border = CELL_BORDER;
}

/**
 * Export .xlsx : en-têtes bleus (texte blanc), toutes les cellules encadrées en noir.
 */
export async function exportTableToExcel({
  filename = 'export',
  sheetName = 'Données',
  columns,
  rows,
}) {
  if (!columns?.length) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SRM-MS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sanitizeSheetName(sheetName));
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const headerRow = sheet.addRow(columns.map((c) => c.label));
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: HEADER_FILL };
    cell.font = { bold: true, color: HEADER_FONT, size: 11, name: 'Calibri' };
    applyBorder(cell);
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  (rows || []).forEach((row, rowIndex) => {
    const values = columns.map((col) => displayValue(cellValue(row, col)));
    const dataRow = sheet.addRow(values);
    dataRow.height = 18;
    const isAlt = rowIndex % 2 === 1;
    for (let c = 1; c <= columns.length; c += 1) {
      const cell = dataRow.getCell(c);
      applyBorder(cell);
      cell.font = { size: 10, name: 'Calibri' };
      cell.alignment = { vertical: 'middle', wrapText: true };
      if (isAlt) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: ALT_ROW_FILL };
      }
    }
  });

  columns.forEach((col, index) => {
    const colIndex = index + 1;
    let maxLen = String(col.label).length;
    (rows || []).forEach((row) => {
      maxLen = Math.max(maxLen, displayValue(cellValue(row, col)).length);
    });
    sheet.getColumn(colIndex).width = Math.min(Math.max(maxLen + 3, 12), 48);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const base = String(filename).replace(/\.(xlsx|xls|csv)$/i, '');
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${base}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
