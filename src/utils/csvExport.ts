import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function exportCsv(fileName: string, rows: string[][]) {
  const isSharingAvailable = await Sharing.isAvailableAsync();

  if (!isSharingAvailable) {
    throw new Error('Sharing is not available on this device.');
  }

  const directory = new Directory(Paths.document, 'exports');
  directory.create({ intermediates: true, idempotent: true });

  const file = new File(directory, sanitizeFileName(fileName));
  file.create({ overwrite: true });
  file.write(rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n'));

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export CSV',
    UTI: 'public.comma-separated-values-text',
  });
}

function escapeCsvCell(value: string) {
  const normalized = value.replace(/\r?\n/g, ' ');

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[<>:"/\\|?*]+/g, '_');
}
