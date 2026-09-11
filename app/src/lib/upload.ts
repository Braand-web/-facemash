import { remote } from '../data/remote';

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
export async function uploadFile(file: File, profileId: string, syncing: boolean): Promise<UploadedFile> {
  const video = file.type.startsWith('video/');
  const base = {
    video,
    label: `${file.name} · ${prettySize(file.size)}`,
    ratio: video ? '9/16' : '4/5',
  };
  if (syncing) {
    const url = await remote.uploadMedia(profileId, file);
    if (url) return { ...base, url, local: false };
  }
  return { ...base, url: URL.createObjectURL(file), local: true };
}

export const fileSize = prettySize;
