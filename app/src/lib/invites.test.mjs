import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearPendingChannelInviteToken,
  clearPendingGroupInviteToken,
  clearPendingInviteCode,
  invitePath,
  inviteUrl,
  normalizeChannelInviteToken,
  normalizeGroupInviteToken,
  normalizeInviteCode,
  readPendingChannelInviteToken,
  readPendingGroupInviteToken,
  readPendingInviteCode,
  rememberChannelInviteToken,
  rememberGroupInviteToken,
  rememberInviteCode,
} from './invites.mjs';

const validCode = 'b12df8038db944e993f7ac9a30bfc98a';
const validChannelToken = '8c6f0b2c49c72f7ac7d4344bf52eaf8c8c6f0b2c49c72f7ac7d4344bf52eaf8c';
const validGroupToken = '4b58a13d91ef4720b2438ac55237dcca4b58a13d91ef4720b2438ac55237dcca';

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

test('validates and persists a private-channel invitation across authentication', () => {
  const store = new Map();
  const storage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
  assert.equal(normalizeChannelInviteToken(validChannelToken.toUpperCase()), validChannelToken);
  assert.equal(normalizeChannelInviteToken('../messages'), null);
  assert.equal(rememberChannelInviteToken(validChannelToken, storage), true);
  assert.equal(readPendingChannelInviteToken(storage), validChannelToken);
  clearPendingChannelInviteToken(storage);
  assert.equal(readPendingChannelInviteToken(storage), null);
});

test('expires a channel invitation left over from an abandoned signup', () => {
  const store = new Map([['facemash.pending-channel-invite', JSON.stringify({ token: validChannelToken, savedAt: Date.now() - 25 * 60 * 60 * 1000 })]]);
  const storage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
  assert.equal(readPendingChannelInviteToken(storage), null);
  assert.equal(store.has('facemash.pending-channel-invite'), false);
});

test('validates and preserves group invitations across the sign-in round trip', () => {
  const store = new Map();
  const storage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
  assert.equal(normalizeGroupInviteToken(validGroupToken.toUpperCase()), validGroupToken);
  assert.equal(normalizeGroupInviteToken('https://facemash.site/join/group/not-a-token'), null);
  assert.equal(rememberGroupInviteToken(validGroupToken, storage), true);
  assert.equal(readPendingGroupInviteToken(storage), validGroupToken);
  clearPendingGroupInviteToken(storage);
  assert.equal(readPendingGroupInviteToken(storage), null);
});
