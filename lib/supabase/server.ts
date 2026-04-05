import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseReadConfigured, supabaseEnv } from "@/lib/supabase/env";

let cachedClient: SupabaseClient | null | undefined;

export const getSupabaseServerClient = (): SupabaseClient | null => {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  if (!isSupabaseReadConfigured) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(supabaseEnv.url!, supabaseEnv.anonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
};
