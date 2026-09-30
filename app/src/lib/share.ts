/** Public URLs for things that can be shared. Works for both the path and hash routers. */
const base = (): string => {
  if (import.meta.env.VITE_HASH_ROUTER) return `${window.location.origin}${window.location.pathname}#`;
  return window.location.origin;
};

export const postUrl = (id: string): string => `${base()}/post/${id}`;
export const profileUrl = (id: string): string => `${base()}/profile/${id}`;
export const tagUrl = (tag: string): string => `${base()}/tag/${encodeURIComponent(tag.replace('#', ''))}`;

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers and non-secure origins: fall back to a hidden textarea.
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

export type ShareResult = 'shared' | 'copied' | 'failed' | 'cancelled';

/** Native share sheet when the device has one, the clipboard otherwise. */
export async function shareLink(data: { title?: string; text?: string; url: string }): Promise<ShareResult> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }
  return (await copyText(data.url)) ? 'copied' : 'failed';
}
