const readEnv = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const supabaseEnv = {
  url: readEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
  anonKey: readEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  serviceRoleKey: readEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
};

export const isSupabaseReadConfigured = Boolean(
  supabaseEnv.url && supabaseEnv.anonKey,
);

export const isSupabaseWriteConfigured = Boolean(
  supabaseEnv.url && supabaseEnv.serviceRoleKey,
);
