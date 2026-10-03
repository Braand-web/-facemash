const INVITE_CODE_PATTERN = /^[a-f0-9]{32}$/i;

export const PENDING_INVITE_KEY = 'facemash.pending-invite';
const PENDING_INVITE_TTL_MS = 24 * 60 * 60 * 1000;

const browserStorage = () => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

export function normalizeInviteCode(value) {
  if (typeof value !== 'string') return null;
  const code = value.trim();
  return INVITE_CODE_PATTERN.test(code) ? code.toLowerCase() : null;
}

export function invitePath(value) {
  const code = normalizeInviteCode(value);
  return code ? `/invite/${encodeURIComponent(code)}` : null;
}

export function inviteUrl(value, origin) {
  const path = invitePath(value);
  if (!path || typeof origin !== 'string' || !origin) return null;
  try {
    return new URL(path, origin).toString();
  } catch {
    return null;
  }
}

export function rememberInviteCode(value, storage = browserStorage()) {
  const code = normalizeInviteCode(value);
  if (!code || !storage) return false;
  try {
    storage.setItem(PENDING_INVITE_KEY, JSON.stringify({ code, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function readPendingInviteCode(storage = browserStorage()) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PENDING_INVITE_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw);
    const code = normalizeInviteCode(pending?.code);
    const savedAt = Number(pending?.savedAt);
    if (!code || !Number.isFinite(savedAt) || savedAt > Date.now() || Date.now() - savedAt > PENDING_INVITE_TTL_MS) {
      storage.removeItem(PENDING_INVITE_KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

export function clearPendingInviteCode(storage = browserStorage()) {
  try {
    storage?.removeItem(PENDING_INVITE_KEY);
  } catch {
    // The code can be retried on the next authenticated app launch.
  }
}
