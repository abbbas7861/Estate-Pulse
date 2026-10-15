import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Supabase's createClient() VALIDATES the URL and will throw
// "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL" if you pass a
// relative path like "/supabase-api". You MUST use the full https:// URL.
// The proxy in vite.config.ts is irrelevant here — createClient runs in
// the browser, not through the proxy.

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
  'https://gsyhniaoesaskmestrqt.supabase.co';

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

if (!supabaseAnonKey) {
  console.error(
    '[EstatePulse] VITE_SUPABASE_ANON_KEY is missing! ' +
    'Make sure .env.local is at the PROJECT ROOT (not inside src/). ' +
    'Run: Get-Content .env.local to verify.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);