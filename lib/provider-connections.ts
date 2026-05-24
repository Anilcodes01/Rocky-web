import "server-only";

import { createSupabaseServiceRoleClient } from "./supabase/server";

type ProviderConnectionRecord = {
  user_id: string;
  provider: string;
  composio_user_id: string;
  connected_account_id: string | null;
  status: string;
};

export async function upsertProviderConnection(input: {
  userId: string;
  provider: string;
  connectedAccountId: string | null;
}) {
  const supabase = createSupabaseServiceRoleClient();

  const { error } = await supabase
    .from("user_provider_connections")
    .upsert(
      {
        user_id: input.userId,
        provider: input.provider,
        composio_user_id: input.userId,
        connected_account_id: input.connectedAccountId,
        status: input.connectedAccountId ? "active" : "pending",
        connected_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
        failure_code: null,
        failure_message: null,
      },
      {
        onConflict: "user_id,provider,connected_account_id",
      }
    );

  if (error) {
    throw new Error(`Failed to save provider connection: ${error.message}`);
  }
}

export async function resolveProviderConnection(input: {
  provider: string;
  entityId?: string;
  connectedAccountId?: string | null;
}): Promise<ProviderConnectionRecord | null> {
  const supabase = createSupabaseServiceRoleClient();

  if (input.connectedAccountId) {
    const { data, error } = await supabase
      .from("user_provider_connections")
      .select("user_id, provider, composio_user_id, connected_account_id, status")
      .eq("provider", input.provider)
      .eq("connected_account_id", input.connectedAccountId)
      .maybeSingle<ProviderConnectionRecord>();

    if (error) {
      throw new Error(`Failed to resolve provider connection: ${error.message}`);
    }

    if (data) {
      return data;
    }
  }

  if (input.entityId && !input.entityId.startsWith("rocky_")) {
    const { data, error } = await supabase
      .from("user_provider_connections")
      .select("user_id, provider, composio_user_id, connected_account_id, status")
      .eq("provider", input.provider)
      .eq("composio_user_id", input.entityId)
      .eq("status", "active")
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle<ProviderConnectionRecord>();

    if (error) {
      throw new Error(`Failed to resolve provider connection: ${error.message}`);
    }

    return data;
  }

  return null;
}

export async function markProviderConnectionUsed(input: {
  provider: string;
  connectedAccountId: string;
}) {
  const supabase = createSupabaseServiceRoleClient();

  await supabase
    .from("user_provider_connections")
    .update({
      status: "active",
      last_used_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
      failure_code: null,
      failure_message: null,
    })
    .eq("provider", input.provider)
    .eq("connected_account_id", input.connectedAccountId);
}

export async function markProviderConnectionFailed(input: {
  provider: string;
  connectedAccountId?: string | null;
  failureCode: string;
  failureMessage: string;
  status?: string;
}) {
  if (!input.connectedAccountId) {
    return;
  }

  const supabase = createSupabaseServiceRoleClient();

  await supabase
    .from("user_provider_connections")
    .update({
      status: input.status ?? "error",
      failure_code: input.failureCode,
      failure_message: input.failureMessage,
      last_verified_at: new Date().toISOString(),
    })
    .eq("provider", input.provider)
    .eq("connected_account_id", input.connectedAccountId);
}
