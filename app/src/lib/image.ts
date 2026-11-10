/**
 * Downsizes a photo before it is uploaded or stored. Phone cameras produce 4–8 MB
 * files that no feed needs; 1600 px on the long edge is plenty and loads fast.
 * GIFs, SVGs and anything already small are passed through untouched.
 */
export async function compressImage(file: File, maxEdge = 1600, quality = 0.84): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  if (file.size < 350 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

/** Center-crops a profile picture into an efficient square JPEG. */
export async function cropAvatar(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    throw new Error('Choisis une image au format courant (JPEG, PNG ou WebP).');
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const edge = Math.min(bitmap.width, bitmap.height);
  const sx = Math.round((bitmap.width - edge) / 2);
  const sy = Math.round((bitmap.height - edge) / 2);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close?.();
    throw new Error('Impossible de préparer cette image sur cet appareil.');
  }
  context.drawImage(bitmap, sx, sy, edge, edge, 0, 0, 512, 512);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  if (!blob) throw new Error('Impossible de préparer cette image sur cet appareil.');
  return new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
}

/** A small data URL, for demo-mode stories that must survive a reload. */
export function toDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
