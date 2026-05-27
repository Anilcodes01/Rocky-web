import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getServerEnv } from "../env";
import type { Database } from "./database.types";

let supabaseServiceRoleClient: ReturnType<typeof createClient<Database>> | null = null;
const tokenClientCache = new Map<string, ReturnType<typeof createClient<Database>>>();

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const env = getServerEnv();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components may not be able to mutate cookies directly.
          }
        },
      },
    }
  );
}

export function createSupabaseServiceRoleClient() {
  const env = getServerEnv();

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  if (!supabaseServiceRoleClient) {
    supabaseServiceRoleClient = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return supabaseServiceRoleClient;
}

export function createSupabaseTokenClient(accessToken: string) {
  const env = getServerEnv();
  const trimmedToken = accessToken.trim();

  if (!trimmedToken) {
    throw new Error("Access token is required.");
  }

  const cachedClient = tokenClientCache.get(trimmedToken);
  if (cachedClient) {
    return cachedClient;
  }

  const client = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${trimmedToken}`,
        },
      },
    }
  );

  tokenClientCache.set(trimmedToken, client);
  return client;
}
