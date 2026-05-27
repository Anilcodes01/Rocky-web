import "server-only";

import type { User } from "@supabase/supabase-js";

import {
  getConversationForUser,
  getLatestConversationSummaryForUser,
  listMemoryItemsForUser,
  listMessagesForConversation,
  type RockyConversationRow,
  type RockyConversationSummaryRow,
  type RockyMemoryItemRow,
  type RockyMessageRow,
} from "./memory-store";
import { createSupabaseServerClient } from "./supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type ConversationContextPacket = {
  conversation: RockyConversationRow;
  summary: RockyConversationSummaryRow | null;
  recentMessages: RockyMessageRow[];
  relevantMemoryItems: RockyMemoryItemRow[];
  promptContext: {
    summaryText: string | null;
    recentTranscript: string;
    memoryLines: string[];
  };
};

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "has",
  "have",
  "i",
  "if",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "use",
  "we",
  "with",
  "you",
]);

function clampText(value: string, limit: number) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= limit) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function extractKeywords(value: string) {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .map((part) => part.trim())
      .filter((part) => part.length >= 3 && !stopWords.has(part))
  );
}

function scoreMemoryItem(memoryItem: RockyMemoryItemRow, recentMessages: RockyMessageRow[]) {
  let score = memoryItem.confidence * 10;

  if (memoryItem.scope === "project") {
    score += 3;
  }

  if (memoryItem.conversation_id && recentMessages.some((message) => message.conversation_id === memoryItem.conversation_id)) {
    score += 2;
  }

  const memoryKeywords = extractKeywords(
    [memoryItem.content, memoryItem.normalized_content ?? ""].join(" ")
  );

  for (const message of recentMessages) {
    const messageKeywords = extractKeywords(message.content);
    let overlap = 0;

    for (const keyword of messageKeywords) {
      if (memoryKeywords.has(keyword)) {
        overlap += 1;
      }
    }

    score += overlap * 1.5;
  }

  const updatedAt = Date.parse(memoryItem.updated_at);
  if (!Number.isNaN(updatedAt)) {
    const ageDays = Math.max(0, (Date.now() - updatedAt) / (1000 * 60 * 60 * 24));
    score -= Math.min(ageDays / 30, 2);
  }

  return score;
}

function formatTranscript(messages: RockyMessageRow[]) {
  return messages
    .map((message) => `${message.role.toUpperCase()}: ${clampText(message.content, 220)}`)
    .join("\n");
}

function formatMemoryLine(memoryItem: RockyMemoryItemRow) {
  return `[${memoryItem.type}] ${clampText(memoryItem.content, 220)}`;
}

export async function buildConversationContextForUser(
  supabase: SupabaseServerClient,
  user: User,
  conversationId: string
): Promise<ConversationContextPacket | null> {
  const conversation = await getConversationForUser(supabase, user, conversationId);
  if (!conversation) {
    return null;
  }

  const [summary, messages, memoryItems] = await Promise.all([
    getLatestConversationSummaryForUser(supabase, user, conversationId),
    listMessagesForConversation(supabase, user, conversationId),
    listMemoryItemsForUser(supabase, user, {
      status: "active",
      limit: 100,
    }),
  ]);

  const recentMessages = messages.slice(-12);
  const relevantMemoryItems = [...memoryItems]
    .map((memoryItem) => ({
      memoryItem,
      score: scoreMemoryItem(memoryItem, recentMessages),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map((entry) => entry.memoryItem);

  return {
    conversation,
    summary,
    recentMessages,
    relevantMemoryItems,
    promptContext: {
      summaryText: summary?.summary_text ?? null,
      recentTranscript: formatTranscript(recentMessages),
      memoryLines: relevantMemoryItems.map((memoryItem) => formatMemoryLine(memoryItem)),
    },
  };
}
