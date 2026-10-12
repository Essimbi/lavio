import type { UploadToken } from '@lavio/shared';

/** Compression avant envoi (docs/09) : côté long 1600 px, JPEG qualité 0,8. */
export async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Compression impossible'))),
      'image/jpeg',
      quality,
    );
  });
}

/** Envoi direct vers Vercel Blob avec le jeton délivré par l'API (aucun fichier ne transite par l'API). */
export async function uploadToBlob(token: UploadToken, body: Blob): Promise<string> {
  if (body.size > token.maxSizeBytes) throw new Error('Photo trop volumineuse (5 Mo au maximum).');
  const { put } = await import('@vercel/blob/client');
  const result = await put(token.pathname, body, {
    access: 'public',
    token: token.clientToken,
    contentType: 'image/jpeg',
  });
  return result.url;
}
