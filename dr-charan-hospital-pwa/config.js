// config.js
// Supabase configuration for browser (GitHub Pages PWA)

// Your Supabase project URL
export const SUPABASE_URL = "https://vhllftajwsmfwvkuvznpz.supabase.co";

// Your Supabase anon public key (copy from Settings → API → anon public)
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZobGZ0YWp3c21md3ZrdXZ6bnB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NjgxNzgsImV4cCI6MjA3MzA0NDE3OH0.CFwMbpjgJyLUY_l_QuQd0SU9Qp0TOfHiUOCostcRUqA
";

// Import supabase-js client directly from CDN
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Create the client and export for use in other scripts
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
