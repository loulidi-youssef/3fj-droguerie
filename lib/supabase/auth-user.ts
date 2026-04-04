import type { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AuthenticatedCustomer = {
  id: string;
  email: string | null;
};

const readBearerToken = (request: NextRequest): string | null => {
  const authorizationHeader = request.headers.get("authorization")?.trim() ?? "";
  if (!authorizationHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authorizationHeader.slice(7).trim();
  return token ? token : null;
};

export const getAuthenticatedCustomerFromRequest = async (
  request: NextRequest,
): Promise<AuthenticatedCustomer | null> => {
  const accessToken = readBearerToken(request);
  if (!accessToken) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
};
