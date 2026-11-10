const INVITE_CODE_PATTERN = /^[a-f0-9]{32}$/i;

export const PENDING_INVITE_KEY = 'facemash.pending-invite';
export const PENDING_GROUP_INVITE_KEY = 'facemash.pending-group-invite';
export const PENDING_CHANNEL_INVITE_KEY = 'facemash.pending-channel-invite';
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

const GROUP_INVITE_PATTERN = /^[a-f0-9]{64}$/i;

export function normalizeGroupInviteToken(value) {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  return GROUP_INVITE_PATTERN.test(token) ? token.toLowerCase() : null;
}

export function rememberGroupInviteToken(value, storage = browserStorage()) {
  const token = normalizeGroupInviteToken(value);
  if (!token || !storage) return false;
  try {
    storage.setItem(PENDING_GROUP_INVITE_KEY, JSON.stringify({ token, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function readPendingGroupInviteToken(storage = browserStorage()) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PENDING_GROUP_INVITE_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw);
    const token = normalizeGroupInviteToken(pending?.token);
    const savedAt = Number(pending?.savedAt);
    if (!token || !Number.isFinite(savedAt) || savedAt > Date.now() || Date.now() - savedAt > PENDING_INVITE_TTL_MS) {
      storage.removeItem(PENDING_GROUP_INVITE_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function clearPendingGroupInviteToken(storage = browserStorage()) {
  try {
    storage?.removeItem(PENDING_GROUP_INVITE_KEY);
  } catch {
    // Keep the token available for a retry after a transient auth/network issue.
  }
}

export function normalizeChannelInviteToken(value) {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  return GROUP_INVITE_PATTERN.test(token) ? token.toLowerCase() : null;
}

export function rememberChannelInviteToken(value, storage = browserStorage()) {
  const token = normalizeChannelInviteToken(value);
  if (!token || !storage) return false;
  try {
    storage.setItem(PENDING_CHANNEL_INVITE_KEY, JSON.stringify({ token, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function readPendingChannelInviteToken(storage = browserStorage()) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PENDING_CHANNEL_INVITE_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw);
    const token = normalizeChannelInviteToken(pending?.token);
    const savedAt = Number(pending?.savedAt);
    if (!token || !Number.isFinite(savedAt) || savedAt > Date.now() || Date.now() - savedAt > PENDING_INVITE_TTL_MS) {
      storage.removeItem(PENDING_CHANNEL_INVITE_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function clearPendingChannelInviteToken(storage = browserStorage()) {
  try {
    storage?.removeItem(PENDING_CHANNEL_INVITE_KEY);
  } catch {
    // The invite can be retried if authentication or the network is interrupted.
  }
}
