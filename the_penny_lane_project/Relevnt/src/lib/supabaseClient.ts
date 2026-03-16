import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const meta = import.meta as any;
const supabaseUrl: string = meta.env?.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey: string = meta.env?.VITE_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
