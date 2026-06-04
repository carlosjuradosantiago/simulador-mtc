import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function getSupabaseClient() {
  const supabaseUrl = getRequiredEnv('SUPABASE_URL');
  const supabaseServiceKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(supabaseUrl, supabaseServiceKey);
}
export function getSupabaseClientWithAuth(authHeader) {
  const supabaseUrl = getRequiredEnv('SUPABASE_URL');
  const supabaseAnonKey = getRequiredEnv('SUPABASE_ANON_KEY');
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });
}
