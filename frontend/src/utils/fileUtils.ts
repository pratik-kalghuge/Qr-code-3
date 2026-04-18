export const CHUNK_SIZE = 16 * 1024; // 16KB

export interface FileMetadata {
  filename: string;
  size: number;
  mimeType: string;
  totalChunks: number;
  hash: string;
}

export function chunkFile(file: File): Blob[] {
  const chunks: Blob[] = [];
  let offset = 0;
  while (offset < file.size) {
    chunks.push(file.slice(offset, offset + CHUNK_SIZE));
    offset += CHUNK_SIZE;
  }
  return chunks;
}

export function saveFile(buffer: ArrayBuffer, filename: string, mimeType: string): void {
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
