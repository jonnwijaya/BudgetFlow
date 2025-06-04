
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Trim potential whitespace, though `new URL` should handle some.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

// For debugging, you can uncomment these lines in your local environment
// and check the terminal where your Next.js server is running:
// console.log('--- DEBUG: SUPABASE CLIENT INIT ---');
// console.log('Raw NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
// console.log('Trimmed supabaseUrl for Supabase client:', supabaseUrl);
// console.log('Raw NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
// console.log('Trimmed supabaseAnonKey for Supabase client:', supabaseAnonKey);
// console.log('--- END DEBUG ---');

if (!supabaseUrl) {
  throw new Error(
    "CRITICAL: Supabase URL is missing. " +
    "Please ensure 'NEXT_PUBLIC_SUPABASE_URL' is set correctly in your .env (or .env.local) file in the project root " +
    "AND that you have RESTARTED your Next.js development server. The value should be a complete URL (e.g., 'https://your-project-id.supabase.co')."
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    "CRITICAL: Supabase Anon Key is missing. " +
    "Please ensure 'NEXT_PUBLIC_SUPABASE_ANON_KEY' is set correctly in your .env (or .env.local) file in the project root " +
    "AND that you have RESTARTED your Next.js development server."
  );
}

// Attempt to create a URL object to validate `supabaseUrl` before passing to `createClient`.
// This provides a more specific error if the URL is present but malformed.
try {
  new URL(supabaseUrl);
} catch (e: unknown) {
  let errorMessage = (e instanceof Error) ? e.message : String(e);
  throw new Error(
    `CRITICAL: The Supabase URL provided ('${supabaseUrl}') is not a valid URL. ` +
    "Please ensure 'NEXT_PUBLIC_SUPABASE_URL' in your .env (or .env.local) file is a complete and correct URL (e.g., 'https://your-project-id.supabase.co') " +
    "AND RESTART your Next.js development server. Original error: " + errorMessage
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
