// ==========================================================================
// Supabase Client Configuration
// Replace these with your Supabase project credentials before deploying.
// ==========================================================================

const SUPABASE_URL = 'https://vwwqmqsheovlviczvpte.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3d3FtcXNoZW92bHZpY3p2cHRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNTczNTMsImV4cCI6MjA5MDgzMzM1M30.1Xx_0NeR2qgqcn1thUbHlkTRp8F4PMu4JAna2UCjE9g';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
