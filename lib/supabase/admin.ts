import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  isSupabaseAdminConfigured,
  supabaseAdminEnv,
} from "@/lib/supabase/admin-env";

let cachedAdminClient: SupabaseClient | null | undefined;

export const getSupabaseAdminClient = (): SupabaseClient | null => {
  // Service-role client is server-only by design.
  if (cachedAdminClient !== undefined) {
    return cachedAdminClient;
  }

  if (!isSupabaseAdminConfigured) {
    cachedAdminClient = null;
    return cachedAdminClient;
  }

  cachedAdminClient = createClient(supabaseAdminEnv.url!, supabaseAdminEnv.serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdminClient;
};
