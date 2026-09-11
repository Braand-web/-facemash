import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Null until the project credentials are provided, which keeps demo mode working offline. */
export const supabase =
  url && anonKey ? createClient(url, anonKey, { db: { schema: 'facemash' } }) : null;

export const hasBackend = supabase !== null;
