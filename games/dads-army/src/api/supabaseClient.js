// ==========================================================================
// Supabase Client Configuration
// Replace these with your Supabase project credentials before deploying.
// ==========================================================================

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
  console.warn(
    '[Dad\'s Army] Supabase credentials not configured. ' +
    'Edit src/api/supabaseClient.js with your project URL and anon key.'
  );
}

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
