import { store } from '../mocks/store';

/** Generates the CSV for a report export and triggers a client-side download. */
export async function downloadExport(exportPath: string, fallbackName: string): Promise<void> {
  const { filename, content } = store.exportCsv(exportPath, fallbackName);
  const blobUrl = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(blobUrl);
}
