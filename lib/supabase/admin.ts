import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseWriteConfigured, supabaseEnv } from "@/lib/supabase/env";

let cachedAdminClient: SupabaseClient | null | undefined;

export const getSupabaseAdminClient = (): SupabaseClient | null => {
  if (cachedAdminClient !== undefined) {
    return cachedAdminClient;
  }

  if (!isSupabaseWriteConfigured) {
    cachedAdminClient = null;
    return cachedAdminClient;
  }

  cachedAdminClient = createClient(supabaseEnv.url!, supabaseEnv.serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdminClient;
};
