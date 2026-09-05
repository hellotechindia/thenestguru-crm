/**
 * Exports JSON data to a downloadable CSV / Excel file.
 */
export function exportToCSV(
  filename: string,
  rows: Record<string, string | number | boolean | null | undefined>[]
) {
  if (!rows || rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const val = row[header];
          if (val === null || val === undefined) return '""';
          const stringVal = String(val).replace(/"/g, '""');
          return `"${stringVal}"`;
        })
        .join(',')
    ),
  ].join('\n');

  // Create UTF-8 BOM so Excel opens Hindi/Special chars cleanly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
