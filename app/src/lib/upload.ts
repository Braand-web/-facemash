import { remote } from '../data/remote';
import { compressImage } from './image';

export interface UploadedFile {
  url: string;
  video: boolean;
  label: string;
  ratio: string;
  /** True when the URL only lives for this page session (demo mode). */
  local: boolean;
}

const prettySize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`;

/**
 * Sends a picked file to Supabase Storage when the backend is configured. Without it,
 * the file is previewed from a blob URL that lasts as long as the page does.
 */
const ratioOf = async (file: File): Promise<string> => {
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = `${bitmap.width}/${bitmap.height}`;
    bitmap.close?.();
    return ratio;
  } catch {
    return '4/5';
  }
};

export async function uploadFile(source: File, profileId: string, syncing: boolean): Promise<UploadedFile> {
  const video = source.type.startsWith('video/');
  const file = video ? source : await compressImage(source);
  const base = {
    video,
    label: `${file.name} · ${prettySize(file.size)}`,
    ratio: video ? '9/16' : await ratioOf(file),
  };
  if (syncing) {
    const url = await remote.uploadMedia(profileId, file);
    if (url) return { ...base, url, local: false };
  }
  return { ...base, url: URL.createObjectURL(file), local: true };
}

export const fileSize = prettySize;
