import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Local and standalone previews may use curated demo fixtures; production never does. */
export const demoMode = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true';

/** Null until the project credentials are provided. Production must fail closed without it. */
export const supabase =
  url && anonKey ? createClient(url, anonKey, { db: { schema: 'facemash' } }) : null;

export const hasBackend = supabase !== null;
