import "server-only";

import type { User } from "@supabase/supabase-js";

import {
  getConversationForUser,
  getOrCreateMemorySettings,
  listMessagesForConversation,
  type RockyConversationRow,
  type RockyMemoryItemRow,
  type RockyMemorySettingsRow,
  type RockyMessageRow,
} from "./memory-store";
import type { Database, Json } from "./supabase/database.types";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "./supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type MemoryCandidate = {
  type: RockyMemoryItemRow["type"];
  scope: RockyMemoryItemRow["scope"];
  content: string;
  normalizedContent: string;
  confidence: number;
  sourceMessageId: string;
};

type ConversationSummaryRow = Database["public"]["Tables"]["rocky_conversation_summaries"]["Row"];

export type ProcessConversationResult = {
  conversation: RockyConversationRow;
  settings: RockyMemorySettingsRow;
  summary: ConversationSummaryRow;
  extractedMemoryItems: RockyMemoryItemRow[];
  extractionSkipped: boolean;
  extractionReason: string | null;
};

const summarySelect = [
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

const preferenceKeywords = ["prefer", "like", "love", "want", "favorite", "usually use", "tend to use"];
const toolingKeywords = [
  "next.js",
  "nextjs",
  "react",
  "typescript",
  "supabase",
  "vercel",
  "tailwind",
  "postgres",
  "node",
  "python",
];

function normalizeMemoryContent(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function clampText(value: string, limit: number) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= limit) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function buildRollingSummary(messages: RockyMessageRow[]) {
  const recentMessages = messages.slice(-8);
  const recentUserMessages = messages.filter((message) => message.role === "user").slice(-3);
  const focus = recentUserMessages
    .map((message) => clampText(message.content, 160))
    .filter(Boolean)
    .join(" | ");

  const transcript = recentMessages
    .map((message) => `${message.role.toUpperCase()}: ${clampText(message.content, 180)}`)
    .join("\n");

  return [
    focus ? `Current focus: ${focus}` : "Current focus: no recent user requests captured yet.",
    "Recent exchange:",
    transcript || "No recent messages yet.",
  ].join("\n");
}

function classifyRememberedContent(content: string): Pick<MemoryCandidate, "type" | "scope" | "confidence"> {
  const normalized = normalizeMemoryContent(content);

  if (toolingKeywords.some((keyword) => normalized.includes(keyword))) {
    return { type: "tooling", scope: "user", confidence: 0.9 };
  }

  if (normalized.includes("project") || normalized.includes("build") || normalized.includes("app")) {
    return { type: "project", scope: "project", confidence: 0.82 };
  }

  return { type: "fact", scope: "user", confidence: 0.88 };
}

function extractMemoryCandidates(messages: RockyMessageRow[]) {
  const candidates: MemoryCandidate[] = [];

  for (const message of messages) {
    if (message.role !== "user") {
      continue;
    }

    const content = message.content.trim();
    if (!content) {
      continue;
    }

    const rememberMatch = content.match(/^remember(?:\s+that)?\s+(.+)$/i);
    if (rememberMatch) {
      const rememberedContent = clampText(rememberMatch[1], 280);
      const classification = classifyRememberedContent(rememberedContent);
      candidates.push({
        type: classification.type,
        scope: classification.scope,
        content: rememberedContent,
        normalizedContent: normalizeMemoryContent(rememberedContent),
        confidence: classification.confidence,
        sourceMessageId: message.id,
      });
    }

    const preferenceMatch = content.match(/^i\s+(?:prefer|like|love|want|usually use|tend to use)\s+(.+)$/i);
    if (preferenceMatch) {
      const preference = clampText(preferenceMatch[1], 280);
      const normalizedPreference = normalizeMemoryContent(preference);
      candidates.push({
        type: toolingKeywords.some((keyword) => normalizedPreference.includes(keyword)) ? "tooling" : "preference",
        scope: "user",
        content: preference,
        normalizedContent: normalizedPreference,
        confidence: 0.8,
        sourceMessageId: message.id,
      });
    }

    const nameMatch = content.match(/^my name is\s+(.+)$/i);
    if (nameMatch) {
      const name = clampText(nameMatch[1], 120);
      candidates.push({
        type: "identity",
        scope: "user",
        content: `User's name is ${name}`,
        normalizedContent: normalizeMemoryContent(`user name ${name}`),
        confidence: 0.96,
        sourceMessageId: message.id,
      });
    }

    const projectMatch = content.match(/^(?:i(?:'m| am) working on|this project is)\s+(.+)$/i);
    if (projectMatch) {
      const projectDetail = clampText(projectMatch[1], 280);
      candidates.push({
        type: "project",
        scope: "project",
        content: projectDetail,
        normalizedContent: normalizeMemoryContent(projectDetail),
        confidence: 0.78,
        sourceMessageId: message.id,
      });
    }

    if (preferenceKeywords.some((keyword) => normalizeMemoryContent(content).includes(keyword)) && /don't|do not|never/i.test(content)) {
      const avoidance = clampText(content, 280);
      candidates.push({
        type: "avoidance",
        scope: "user",
        content: avoidance,
        normalizedContent: normalizeMemoryContent(avoidance),
        confidence: 0.74,
        sourceMessageId: message.id,
      });
    }
  }

  const deduped = new Map<string, MemoryCandidate>();

  for (const candidate of candidates) {
    const key = `${candidate.type}:${candidate.scope}:${candidate.normalizedContent}`;
    if (!deduped.has(key)) {
      deduped.set(key, candidate);
    }
  }

  return [...deduped.values()];
}

async function upsertRollingSummary(input: {
  userId: string;
  conversationId: string;
  messages: RockyMessageRow[];
}) {
  const serviceSupabase = createSupabaseServiceRoleClient();
  const latestMessageId = input.messages.length ? input.messages[input.messages.length - 1]?.id ?? null : null;
  const summaryText = buildRollingSummary(input.messages);

  const { data: existingRows, error: existingError } = await serviceSupabase
    .from("rocky_conversation_summaries")
    .select(summarySelect)
    .eq("user_id", input.userId)
    .eq("conversation_id", input.conversationId)
    .eq("kind", "rolling")
    .order("updated_at", { ascending: false })
    .limit(1)
    .returns<ConversationSummaryRow[]>();

  if (existingError) {
    throw new Error(`Failed to load conversation summary: ${existingError.message}`);
  }

  const existing = existingRows?.[0] ?? null;

  if (existing) {
    if (
      existing.summary_text === summaryText &&
      existing.covered_until_message_id === latestMessageId
    ) {
      return existing;
    }

    const { data, error } = await serviceSupabase
      .from("rocky_conversation_summaries")
      .update({
        summary_text: summaryText,
        covered_until_message_id: latestMessageId,
        summary_version: existing.summary_version + 1,
      })
      .eq("id", existing.id)
      .select(summarySelect)
      .single<ConversationSummaryRow>();

    if (error) {
      throw new Error(`Failed to update conversation summary: ${error.message}`);
    }

    return data;
  }

  const { data, error } = await serviceSupabase
    .from("rocky_conversation_summaries")
    .insert({
      user_id: input.userId,
      conversation_id: input.conversationId,
      summary_text: summaryText,
      covered_until_message_id: latestMessageId,
      kind: "rolling",
      created_by: "system",
      summary_version: 1,
    })
    .select(summarySelect)
    .single<ConversationSummaryRow>();

  if (error) {
    throw new Error(`Failed to create conversation summary: ${error.message}`);
  }

  return data;
}

async function writeMemoryAuditLog(input: {
  memoryItemId: string;
  userId: string;
  action: Database["public"]["Tables"]["rocky_memory_audit_logs"]["Insert"]["action"];
  reason?: string | null;
  beforeValue?: Json | null;
  afterValue?: Json | null;
}) {
  const serviceSupabase = createSupabaseServiceRoleClient();
  const { error } = await serviceSupabase.from("rocky_memory_audit_logs").insert({
    memory_item_id: input.memoryItemId,
    user_id: input.userId,
    action: input.action,
    actor_type: "job",
    actor_id: "memory-pipeline",
    reason: input.reason ?? null,
    before_value: input.beforeValue ?? null,
    after_value: input.afterValue ?? null,
  });

  if (error) {
    throw new Error(`Failed to write memory audit log: ${error.message}`);
  }
}

async function storeMemoryCandidates(input: {
  userId: string;
  conversationId: string;
  candidates: MemoryCandidate[];
}) {
  const serviceSupabase = createSupabaseServiceRoleClient();
  const storedItems: RockyMemoryItemRow[] = [];

  for (const candidate of input.candidates) {
    const { data: existingRows, error: existingError } = await serviceSupabase
      .from("rocky_memory_items")
      .select(memoryItemSelect)
      .eq("user_id", input.userId)
      .eq("type", candidate.type)
      .eq("scope", candidate.scope)
      .eq("normalized_content", candidate.normalizedContent)
      .order("updated_at", { ascending: false })
      .limit(1)
      .returns<RockyMemoryItemRow[]>();

    if (existingError) {
      throw new Error(`Failed to load existing memory items: ${existingError.message}`);
    }

    const existing = existingRows?.[0] ?? null;

    if (existing) {
      const { data, error } = await serviceSupabase
        .from("rocky_memory_items")
        .update({
          conversation_id: input.conversationId,
          source_message_id: candidate.sourceMessageId,
          content: candidate.content,
          normalized_content: candidate.normalizedContent,
          confidence: Math.max(existing.confidence, candidate.confidence),
          status: "active",
        })
        .eq("id", existing.id)
        .select(memoryItemSelect)
        .single<RockyMemoryItemRow>();

      if (error) {
        throw new Error(`Failed to update memory item: ${error.message}`);
      }

      await writeMemoryAuditLog({
        memoryItemId: existing.id,
        userId: input.userId,
        action: "updated",
        reason: "heuristic_memory_refresh",
        beforeValue: existing,
        afterValue: data,
      });

      storedItems.push(data);
      continue;
    }

    const { data, error } = await serviceSupabase
      .from("rocky_memory_items")
      .insert({
        user_id: input.userId,
        conversation_id: input.conversationId,
        source_message_id: candidate.sourceMessageId,
        type: candidate.type,
        scope: candidate.scope,
        status: "active",
        confidence: candidate.confidence,
        content: candidate.content,
        normalized_content: candidate.normalizedContent,
      })
      .select(memoryItemSelect)
      .single<RockyMemoryItemRow>();

    if (error) {
      throw new Error(`Failed to create memory item: ${error.message}`);
    }

    await writeMemoryAuditLog({
      memoryItemId: data.id,
      userId: input.userId,
      action: "created",
      reason: "heuristic_memory_extraction",
      afterValue: data,
    });

    storedItems.push(data);
  }

  return storedItems;
}

export async function processConversationForUser(
  supabase: SupabaseServerClient,
  user: User,
  conversationId: string
): Promise<ProcessConversationResult | null> {
  const conversation = await getConversationForUser(supabase, user, conversationId);
  if (!conversation) {
    return null;
  }

  const [settings, messages] = await Promise.all([
    getOrCreateMemorySettings(supabase, user),
    listMessagesForConversation(supabase, user, conversationId),
  ]);

  const summary = await upsertRollingSummary({
    userId: user.id,
    conversationId,
    messages,
  });

  if (!settings.memory_enabled) {
    return {
      conversation,
      settings,
      summary,
      extractedMemoryItems: [],
      extractionSkipped: true,
      extractionReason: "memory_disabled",
    };
  }

  if (!settings.auto_extract_enabled) {
    return {
      conversation,
      settings,
      summary,
      extractedMemoryItems: [],
      extractionSkipped: true,
      extractionReason: "auto_extract_disabled",
    };
  }

  const candidates = extractMemoryCandidates(messages);
  if (!candidates.length) {
    return {
      conversation,
      settings,
      summary,
      extractedMemoryItems: [],
      extractionSkipped: true,
      extractionReason: "no_memory_candidates",
    };
  }

  const extractedMemoryItems = await storeMemoryCandidates({
    userId: user.id,
    conversationId,
    candidates,
  });

  return {
    conversation,
    settings,
    summary,
    extractedMemoryItems,
    extractionSkipped: false,
    extractionReason: null,
  };
}
