import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearPendingInviteCode,
  invitePath,
  inviteUrl,
  normalizeInviteCode,
  readPendingInviteCode,
  rememberInviteCode,
} from './invites.mjs';

const validCode = 'b12df8038db944e993f7ac9a30bfc98a';

test('accepts only opaque 32 character hexadecimal invite codes', () => {
  assert.equal(normalizeInviteCode(validCode.toUpperCase()), validCode);
  assert.equal(normalizeInviteCode('../profile/me'), null);
  assert.equal(normalizeInviteCode('short'), null);
  assert.equal(normalizeInviteCode(null), null);
});

test('builds a path and absolute URL without accepting an unsafe code', () => {
  assert.equal(invitePath(validCode), `/invite/${validCode}`);
  assert.equal(inviteUrl(validCode, 'https://facemash.site'), `https://facemash.site/invite/${validCode}`);
  assert.equal(inviteUrl('bad', 'https://facemash.site'), null);
});

test('persists and clears the invite for an OAuth round trip', () => {
  const store = new Map();
  const storage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };

  assert.equal(rememberInviteCode(validCode, storage), true);
  assert.equal(readPendingInviteCode(storage), validCode);
  clearPendingInviteCode(storage);
  assert.equal(readPendingInviteCode(storage), null);
});

test('does not reuse an abandoned invitation after its attribution window', () => {
  const store = new Map([["facemash.pending-invite", JSON.stringify({ code: validCode, savedAt: Date.now() - 25 * 60 * 60 * 1000 })]]);
  const storage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
  assert.equal(readPendingInviteCode(storage), null);
  assert.equal(store.has('facemash.pending-invite'), false);
});
