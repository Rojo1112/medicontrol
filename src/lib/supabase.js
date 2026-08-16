import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase credentials missing. Create a .env file with:\n' +
    'VITE_SUPABASE_URL=your-url\n' +
    'VITE_SUPABASE_ANON_KEY=your-key'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
