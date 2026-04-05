import "server-only";

import type { NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/supabase/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AuthenticatedCustomer = {
  id: string;
  email: string | null;
};

export type AuthenticatedCustomerContext = {
  customer: AuthenticatedCustomer;
  accessToken: string;
  supabase: SupabaseClient;
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

const createSupabaseUserScopedClient = (accessToken: string): SupabaseClient => {
  return createClient(supabaseEnv.url!, supabaseEnv.anonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};

export const getAuthenticatedCustomerFromRequestStrict = async (
  request: NextRequest,
): Promise<AuthenticatedCustomer> => {
  const context = await getAuthenticatedCustomerContextFromRequestStrict(request);
  return context.customer;
};

export const getAuthenticatedCustomerContextFromRequestStrict = async (
  request: NextRequest,
): Promise<AuthenticatedCustomerContext> => {
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

  const customer: AuthenticatedCustomer = {
    id: data.user.id,
    email: data.user.email ?? null,
  };

  return {
    customer,
    accessToken,
    supabase: createSupabaseUserScopedClient(accessToken),
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

export const getAuthenticatedCustomerContextFromRequest = async (
  request: NextRequest,
): Promise<AuthenticatedCustomerContext | null> => {
  try {
    return await getAuthenticatedCustomerContextFromRequestStrict(request);
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
