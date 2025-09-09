import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/esm/index.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: { fetch: (...a) => fetch(...a) }
});

// Utility hash (demo only — replace with proper auth later)
export async function hashPin(pin) {
  const enc = new TextEncoder().encode(pin);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
