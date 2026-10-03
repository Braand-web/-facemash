export const PENDING_INVITE_KEY: string;
export function normalizeInviteCode(value: unknown): string | null;
export function invitePath(value: string): string | null;
export function inviteUrl(value: string, origin: string): string | null;
export function rememberInviteCode(value: string, storage?: Storage): boolean;
export function readPendingInviteCode(storage?: Storage): string | null;
export function clearPendingInviteCode(storage?: Storage): void;
