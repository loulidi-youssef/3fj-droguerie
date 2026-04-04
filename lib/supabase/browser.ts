"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedBrowserClient: SupabaseClient | null | undefined;

export const getSupabaseBrowserClient = (): SupabaseClient | null => {
  if (cachedBrowserClient !== undefined) {
    return cachedBrowserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    cachedBrowserClient = null;
    return cachedBrowserClient;
  }

  cachedBrowserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return cachedBrowserClient;
};
