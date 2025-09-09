// Minimal Supabase client loader (v2) using ESM CDN.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

let cached;
export async function getSupabase() {
  if (cached) return cached;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  cached = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { fetch: (...a) => fetch(...a) } // use browser fetch
  });
  return cached;
}
