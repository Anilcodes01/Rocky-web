import "server-only";

import { createSupabaseServerClient, createSupabaseTokenClient } from "./server";

function getBearerToken(request?: Request) {
  const authorization = request?.headers.get("authorization")?.trim() ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authorization.slice("bearer ".length).trim();
  return token || null;
}

export async function requireAuthenticatedUser(request?: Request) {
  const bearerToken = getBearerToken(request);
  const supabase = bearerToken
    ? createSupabaseTokenClient(bearerToken)
    : await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = bearerToken ? await supabase.auth.getUser(bearerToken) : await supabase.auth.getUser();

  if (error) {
    throw new Error(`Failed to load authenticated user: ${error.message}`);
  }

  if (!user) {
    throw new Error("Authentication required.");
  }

  return { supabase, user };
}
