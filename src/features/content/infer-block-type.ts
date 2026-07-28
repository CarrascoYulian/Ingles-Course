import type { BlockType } from '@/types';

/** Deriva el tipo de bloque a partir del MIME real del archivo subido. */
export function inferBlockType(contentType: string): BlockType {
  if (contentType.startsWith('video/')) return 'Video';
  if (contentType.startsWith('audio/')) return 'Audio';
  return 'PDF';
}
