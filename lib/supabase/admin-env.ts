import "server-only";

const readEnv = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

// Service-role secrets must stay in this server-only module.
export const supabaseAdminEnv = {
  url: readEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
  serviceRoleKey: readEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
};

export const isSupabaseAdminConfigured = Boolean(
  supabaseAdminEnv.url && supabaseAdminEnv.serviceRoleKey,
);
