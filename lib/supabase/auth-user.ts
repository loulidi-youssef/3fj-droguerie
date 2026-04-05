import type { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AuthenticatedCustomer = {
  id: string;
  email: string | null;
};

export type RequestAuthErrorCode =
  | "missing_bearer_token"
  | "supabase_not_configured"
  | "invalid_bearer_token";

export class RequestAuthError extends Error {
  code: RequestAuthErrorCode;

  constructor(code: RequestAuthErrorCode, message: string) {
    super(message);
    this.name = "RequestAuthError";
    this.code = code;
  }
}

const readBearerToken = (request: NextRequest): string | null => {
  const authorizationHeader = request.headers.get("authorization")?.trim() ?? "";
  if (!authorizationHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authorizationHeader.slice(7).trim();
  return token ? token : null;
};

export const getAuthenticatedCustomerFromRequestStrict = async (
  request: NextRequest,
): Promise<AuthenticatedCustomer> => {
  const accessToken = readBearerToken(request);
  if (!accessToken) {
    throw new RequestAuthError(
      "missing_bearer_token",
      "Missing bearer token in Authorization header.",
    );
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new RequestAuthError(
      "supabase_not_configured",
      "Supabase read client is not configured.",
    );
  }

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new RequestAuthError(
      "invalid_bearer_token",
      error?.message ?? "Invalid or expired bearer token.",
    );
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
};

export const getAuthenticatedCustomerFromRequest = async (
  request: NextRequest,
): Promise<AuthenticatedCustomer | null> => {
  try {
    return await getAuthenticatedCustomerFromRequestStrict(request);
  } catch (error) {
    if (
      error instanceof RequestAuthError &&
      error.code === "missing_bearer_token"
    ) {
      return null;
    }

    throw error;
  }
};
