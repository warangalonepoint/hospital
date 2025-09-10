// supabase-init.js
import { SUPABASE_URL, SUPABASE_ANON } from './config.js';

// 1) Create client once and expose globally
export const sb = window.sb ?? supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
window.sb = sb;

// 2) Role → creds mapping (reuse your PIN roles)
const ROLE_CREDS = {
  doctor:     { email: 'doctor@local',     password: 'DoctorPass123!' },
  supervisor: { email: 'supervisor@local', password: 'SupervisorPass123!' },
  // add more roles/users later if needed
};

// 3) Ensure we’re authenticated (sign in silently using stored role)
export async function ensureAuth() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) return session;

    const stored = JSON.parse(localStorage.getItem('session') || 'null');
    const role = stored?.role;
    if (!role || !ROLE_CREDS[role]) return null;

    const { data, error } = await sb.auth.signInWithPassword(ROLE_CREDS[role]);
    if (error) throw error;
    return data.session ?? null;
  } catch (e) {
    console.warn('ensureAuth:', e.message || e);
    return null;
  }
}

// 4) Helper: try online, else fall back to localStorage function you pass in
export async function safeFetch(onlineFn, localFn) {
  try {
    await ensureAuth();                 // best effort; RLS will still enforce
    return await onlineFn();
  } catch (e) {
    console.warn('Using local fallback:', e.message || e);
    return localFn();
  }
}

// 5) Optional: hook your existing logout to sign out from Supabase too
export async function supabaseSignOut() {
  try { await sb.auth.signOut(); } catch {}
}

// 6) Also expose helpers on window for non-module pages
window.supakit = { ensureAuth, safeFetch, supabaseSignOut };
