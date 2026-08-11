/** Escapa una celda para CSV: envuelve en comillas si contiene coma, comilla o salto de línea. */
function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/**
 * Genera un CSV y dispara su descarga en el navegador. No hay endpoint de
 * servidor: los datos ya están en memoria (vinieron de `useReport`), así que
 * construir el archivo en el cliente evita un viaje de red innecesario.
 */
export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const content = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
  // BOM UTF-8: Excel en Windows interpreta acentos mal sin él.
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
