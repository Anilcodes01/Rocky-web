import "server-only";

import type { User } from "@supabase/supabase-js";

import type { Database, Json } from "./supabase/database.types";
import { createSupabaseServiceRoleClient } from "./supabase/server";
import { createSupabaseServerClient } from "./supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type RockyConversationRow = Database["public"]["Tables"]["rocky_conversations"]["Row"];
export type RockyMessageRow = Database["public"]["Tables"]["rocky_messages"]["Row"];
export type RockyMemorySettingsRow = Database["public"]["Tables"]["rocky_memory_settings"]["Row"];
export type RockyMemoryItemRow = Database["public"]["Tables"]["rocky_memory_items"]["Row"];
export type RockyConversationSummaryRow =
  Database["public"]["Tables"]["rocky_conversation_summaries"]["Row"];

export type MemoryItemAction = "confirm" | "forget" | "reject";

export type CreateConversationInput = {
  title?: string | null;
  devicePublicId?: string | null;
};

export type CreateMessageInput = {
  role: RockyMessageRow["role"];
  content: string;
  contentJson?: Json | null;
  source?: RockyMessageRow["source"];
  clientMessageId?: string | null;
  tokenCount?: number | null;
};

export type UpdateMemorySettingsInput = Partial<
  Pick<
    RockyMemorySettingsRow,
    | "memory_enabled"
    | "profile_memory_enabled"
    | "project_memory_enabled"
    | "preference_memory_enabled"
    | "sensitive_memory_enabled"
    | "auto_extract_enabled"
    | "retention_days"
  >
>;

export type ListMemoryItemsInput = {
  type?: string | null;
  status?: string | null;
  scope?: string | null;
  conversationId?: string | null;
  limit?: number | null;
};

export type ApplyMemoryItemActionInput = {
  action: MemoryItemAction;
  reason?: string | null;
};

const conversationSelect = [
  "id",
  "user_id",
  "device_id",
  "title",
  "status",
  "started_at",
  "last_message_at",
  "archived_at",
  "created_at",
  "updated_at",
].join(",");

const messageSelect = [
  "id",
  "conversation_id",
  "user_id",
  "role",
  "content",
  "content_json",
  "source",
  "client_message_id",
  "token_count",
  "created_at",
].join(",");

const memorySettingsSelect = [
  "user_id",
  "memory_enabled",
  "profile_memory_enabled",
  "project_memory_enabled",
  "preference_memory_enabled",
  "sensitive_memory_enabled",
  "auto_extract_enabled",
  "retention_days",
  "created_at",
  "updated_at",
].join(",");

const memoryItemSelect = [
  "id",
  "user_id",
  "conversation_id",
  "source_message_id",
  "type",
  "scope",
  "status",
  "confidence",
  "content",
  "normalized_content",
  "json_value",
  "valid_from",
  "valid_until",
  "last_confirmed_at",
  "superseded_by",
  "created_at",
  "updated_at",
].join(",");

const conversationSummarySelect = [
  "id",
  "conversation_id",
  "user_id",
  "summary_text",
  "summary_version",
  "covered_until_message_id",
  "kind",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const allowedMemoryTypes = new Set([
  "preference",
  "identity",
  "project",
  "workflow",
  "goal",
  "tooling",
  "schedule",
  "fact",
  "avoidance",
]);

const allowedMemoryScopes = new Set(["user", "project", "conversation"]);
const allowedMemoryStatuses = new Set(["active", "forgotten", "superseded", "rejected"]);

function cleanNullableString(value?: string | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizePositiveLimit(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 50;
  }

  return Math.min(Math.max(Math.floor(value), 1), 100);
}

export async function resolveOwnedDeviceId(
  supabase: SupabaseServerClient,
  user: User,
  devicePublicId?: string | null
) {
  const cleanedDeviceId = cleanNullableString(devicePublicId);
  if (!cleanedDeviceId) {
    return null;
  }

  const { data, error } = await supabase
    .from("rocky_devices")
    .select("id")
    .eq("user_id", user.id)
    .eq("device_public_id", cleanedDeviceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve device: ${error.message}`);
  }

  if (!data) {
    throw new Error("Device not found for the authenticated user.");
  }

  return data.id;
}

export async function listConversationsForUser(supabase: SupabaseServerClient, user: User) {
  const { data, error } = await supabase
    .from("rocky_conversations")
    .select(conversationSelect)
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false })
    .returns<RockyConversationRow[]>();

  if (error) {
    throw new Error(`Failed to load conversations: ${error.message}`);
  }

  return data ?? [];
}

export async function getConversationForUser(
  supabase: SupabaseServerClient,
  user: User,
  conversationId: string
) {
  const { data, error } = await supabase
    .from("rocky_conversations")
    .select(conversationSelect)
    .eq("user_id", user.id)
    .eq("id", conversationId)
    .maybeSingle<RockyConversationRow>();

  if (error) {
    throw new Error(`Failed to load conversation: ${error.message}`);
  }

  return data;
}

export async function createConversationForUser(
  supabase: SupabaseServerClient,
  user: User,
  input: CreateConversationInput
) {
  const deviceId = await resolveOwnedDeviceId(supabase, user, input.devicePublicId);

  const { data, error } = await supabase
    .from("rocky_conversations")
    .insert({
      user_id: user.id,
      device_id: deviceId,
      title: cleanNullableString(input.title),
    })
    .select(conversationSelect)
    .single<RockyConversationRow>();

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return data;
}

export async function listMessagesForConversation(
  supabase: SupabaseServerClient,
  user: User,
  conversationId: string
) {
  const { data, error } = await supabase
    .from("rocky_messages")
    .select(messageSelect)
    .eq("user_id", user.id)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .returns<RockyMessageRow[]>();

  if (error) {
    throw new Error(`Failed to load messages: ${error.message}`);
  }

  return data ?? [];
}

export async function appendMessageToConversation(
  supabase: SupabaseServerClient,
  user: User,
  conversationId: string,
  input: CreateMessageInput
) {
  const { data, error } = await supabase
    .from("rocky_messages")
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: input.role,
      content: input.content,
      content_json: input.contentJson ?? null,
      source: input.source ?? "chat",
      client_message_id: cleanNullableString(input.clientMessageId),
      token_count: typeof input.tokenCount === "number" ? input.tokenCount : null,
    })
    .select(messageSelect)
    .single<RockyMessageRow>();

  if (error) {
    throw new Error(`Failed to append message: ${error.message}`);
  }

  return data;
}

export async function getOrCreateMemorySettings(supabase: SupabaseServerClient, user: User) {
  const { data, error } = await supabase
    .from("rocky_memory_settings")
    .upsert(
      {
        user_id: user.id,
      },
      {
        onConflict: "user_id",
        ignoreDuplicates: false,
      }
    )
    .select(memorySettingsSelect)
    .single<RockyMemorySettingsRow>();

  if (error) {
    throw new Error(`Failed to load memory settings: ${error.message}`);
  }

  return data;
}

export async function updateMemorySettings(
  supabase: SupabaseServerClient,
  user: User,
  updates: UpdateMemorySettingsInput
) {
  await getOrCreateMemorySettings(supabase, user);

  const payload: Database["public"]["Tables"]["rocky_memory_settings"]["Update"] = {};

  if (typeof updates.memory_enabled === "boolean") {
    payload.memory_enabled = updates.memory_enabled;
  }
  if (typeof updates.profile_memory_enabled === "boolean") {
    payload.profile_memory_enabled = updates.profile_memory_enabled;
  }
  if (typeof updates.project_memory_enabled === "boolean") {
    payload.project_memory_enabled = updates.project_memory_enabled;
  }
  if (typeof updates.preference_memory_enabled === "boolean") {
    payload.preference_memory_enabled = updates.preference_memory_enabled;
  }
  if (typeof updates.sensitive_memory_enabled === "boolean") {
    payload.sensitive_memory_enabled = updates.sensitive_memory_enabled;
  }
  if (typeof updates.auto_extract_enabled === "boolean") {
    payload.auto_extract_enabled = updates.auto_extract_enabled;
  }
  if (updates.retention_days === null) {
    payload.retention_days = null;
  } else if (typeof updates.retention_days === "number") {
    payload.retention_days = updates.retention_days;
  }

  const { data, error } = await supabase
    .from("rocky_memory_settings")
    .update(payload)
    .eq("user_id", user.id)
    .select(memorySettingsSelect)
    .single<RockyMemorySettingsRow>();

  if (error) {
    throw new Error(`Failed to update memory settings: ${error.message}`);
  }

  return data;
}

export async function listMemoryItemsForUser(
  supabase: SupabaseServerClient,
  user: User,
  filters: ListMemoryItemsInput
) {
  let query = supabase
    .from("rocky_memory_items")
    .select(memoryItemSelect)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(normalizePositiveLimit(filters.limit));

  if (filters.type) {
    query = query.eq("type", filters.type);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.scope) {
    query = query.eq("scope", filters.scope);
  }
  if (filters.conversationId) {
    query = query.eq("conversation_id", filters.conversationId);
  }

  const { data, error } = await query.returns<RockyMemoryItemRow[]>();

  if (error) {
    throw new Error(`Failed to load memory items: ${error.message}`);
  }

  return data ?? [];
}

export async function getMemoryItemForUser(
  supabase: SupabaseServerClient,
  user: User,
  memoryItemId: string
) {
  const { data, error } = await supabase
    .from("rocky_memory_items")
    .select(memoryItemSelect)
    .eq("user_id", user.id)
    .eq("id", memoryItemId)
    .maybeSingle<RockyMemoryItemRow>();

  if (error) {
    throw new Error(`Failed to load memory item: ${error.message}`);
  }

  return data;
}

export async function getLatestConversationSummaryForUser(
  supabase: SupabaseServerClient,
  user: User,
  conversationId: string
) {
  const { data, error } = await supabase
    .from("rocky_conversation_summaries")
    .select(conversationSummarySelect)
    .eq("user_id", user.id)
    .eq("conversation_id", conversationId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .returns<RockyConversationSummaryRow[]>();

  if (error) {
    throw new Error(`Failed to load conversation summary: ${error.message}`);
  }

  return data?.[0] ?? null;
}

export async function applyMemoryItemAction(
  supabase: SupabaseServerClient,
  user: User,
  memoryItemId: string,
  input: ApplyMemoryItemActionInput
) {
  const current = await getMemoryItemForUser(supabase, user, memoryItemId);
  if (!current) {
    return null;
  }

  const now = new Date().toISOString();
  const payload: Database["public"]["Tables"]["rocky_memory_items"]["Update"] = {};

  if (input.action === "confirm") {
    payload.status = "active";
    payload.last_confirmed_at = now;
  } else if (input.action === "forget") {
    payload.status = "forgotten";
  } else if (input.action === "reject") {
    payload.status = "rejected";
  }

  const { data, error } = await supabase
    .from("rocky_memory_items")
    .update(payload)
    .eq("user_id", user.id)
    .eq("id", memoryItemId)
    .select(memoryItemSelect)
    .single<RockyMemoryItemRow>();

  if (error) {
    throw new Error(`Failed to update memory item: ${error.message}`);
  }

  await insertMemoryAuditLog({
    memoryItemId: current.id,
    userId: user.id,
    action: input.action === "confirm" ? "confirmed" : input.action === "forget" ? "forgotten" : "rejected",
    actorType: "user",
    actorId: user.id,
    reason: cleanNullableString(input.reason),
    beforeValue: current,
    afterValue: data,
  });

  return data;
}

export function isAllowedMemoryType(value: string) {
  return allowedMemoryTypes.has(value);
}

export function isAllowedMemoryScope(value: string) {
  return allowedMemoryScopes.has(value);
}

export function isAllowedMemoryStatus(value: string) {
  return allowedMemoryStatuses.has(value);
}

async function insertMemoryAuditLog(input: {
  memoryItemId: string;
  userId: string;
  action: Database["public"]["Tables"]["rocky_memory_audit_logs"]["Insert"]["action"];
  actorType: Database["public"]["Tables"]["rocky_memory_audit_logs"]["Insert"]["actor_type"];
  actorId?: string | null;
  reason?: string | null;
  beforeValue?: Json | null;
  afterValue?: Json | null;
}) {
  const serviceSupabase = createSupabaseServiceRoleClient();
  const { error } = await serviceSupabase.from("rocky_memory_audit_logs").insert({
    memory_item_id: input.memoryItemId,
    user_id: input.userId,
    action: input.action,
    actor_type: input.actorType,
    actor_id: cleanNullableString(input.actorId),
    reason: cleanNullableString(input.reason),
    before_value: input.beforeValue ?? null,
    after_value: input.afterValue ?? null,
  });

  if (error) {
    throw new Error(`Failed to write memory audit log: ${error.message}`);
  }
}
