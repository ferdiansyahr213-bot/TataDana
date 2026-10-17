// In-memory cache for generated report files (PDF/Excel)
// Shared between export generation and download route

interface CachedReportFile {
  buffer: Uint8Array;
  mime: string;
  fileName: string;
}

const generatedFileCache = new Map<string, CachedReportFile>();

export function setCachedFile(id: string, file: CachedReportFile) {
  generatedFileCache.set(id, file);
}

export function getCachedFile(id: string): CachedReportFile | undefined {
  return generatedFileCache.get(id);
}
