import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

type SupabaseEnv = {
  [key: string]: string | boolean | undefined;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

type SupabaseConfig = {
  url: string;
  anonKey: string;
};

function configurationError(message: string) {
  return new Error(`Supabase configuration error: ${message}`);
}

export function getSupabaseConfig(env: SupabaseEnv): SupabaseConfig {
  const url = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url) {
    throw configurationError('VITE_SUPABASE_URL is required');
  }
  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('unsupported protocol');
    }
  } catch {
    throw configurationError('VITE_SUPABASE_URL must be a valid http or https URL');
  }
  if (!anonKey) {
    throw configurationError('VITE_SUPABASE_ANON_KEY is required');
  }

  return { url, anonKey };
}

const supabaseConfig = getSupabaseConfig(import.meta.env);

export const supabase = createClient<Database>(supabaseConfig.url, supabaseConfig.anonKey);
