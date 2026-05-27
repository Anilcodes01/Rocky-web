import { NextResponse } from "next/server";

import { appendMessageToConversation, listMessagesForConversation } from "@/lib/memory-store";
import { processConversationForUser } from "@/lib/memory-pipeline";
import type { Json } from "@/lib/supabase/database.types";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

type MessageRequestBody = {
  role?: unknown;
  content?: unknown;
  content_json?: unknown;
  source?: unknown;
  client_message_id?: unknown;
  token_count?: unknown;
  process_after_write?: unknown;
} | null;

const allowedRoles = new Set(["system", "user", "assistant", "tool"]);
const allowedSources = new Set(["chat", "memory_summary", "tool_result", "codex_handoff"]);

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isJsonValue(value: unknown): value is Json {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => isJsonValue(item));
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every((item) => isJsonValue(item));
  }

  return false;
}

function normalizeTokenCount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }

  return null;
}

function normalizeProcessAfterWrite(value: unknown, role: string) {
  if (typeof value === "boolean") {
    return value;
  }

  return role === "user";
}

function buildErrorResponse(error: unknown, fallbackError: string) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const status = message === "Authentication required." ? 401 : 500;

  return NextResponse.json(
    {
      ok: false,
      error: status === 401 ? "unauthorized" : fallbackError,
      message,
    },
    { status }
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const { supabase, user } = await requireAuthenticatedUser(request);
    const messages = await listMessagesForConversation(supabase, user, conversationId);

    return NextResponse.json({ ok: true, messages });
  } catch (error) {
    return buildErrorResponse(error, "message_list_failed");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  let body: MessageRequestBody = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const role = cleanString(body?.role);
  if (!allowedRoles.has(role)) {
    return NextResponse.json({ ok: false, error: "invalid_role" }, { status: 400 });
  }

  const content = cleanString(body?.content);
  if (!content) {
    return NextResponse.json({ ok: false, error: "missing_content" }, { status: 400 });
  }

  const source = cleanString(body?.source) || "chat";
  if (!allowedSources.has(source)) {
    return NextResponse.json({ ok: false, error: "invalid_source" }, { status: 400 });
  }

  if (body?.content_json !== undefined && !isJsonValue(body.content_json)) {
    return NextResponse.json({ ok: false, error: "invalid_content_json" }, { status: 400 });
  }

  const processAfterWrite = normalizeProcessAfterWrite(body?.process_after_write, role);

  try {
    const { conversationId } = await params;
    const { supabase, user } = await requireAuthenticatedUser(request);
    const message = await appendMessageToConversation(supabase, user, conversationId, {
      role,
      content,
      contentJson: body?.content_json as Json | undefined,
      source,
      clientMessageId: cleanString(body?.client_message_id) || null,
      tokenCount: normalizeTokenCount(body?.token_count),
    });

    const processingResult = processAfterWrite
      ? await processConversationForUser(supabase, user, conversationId)
      : null;

    return NextResponse.json(
      {
        ok: true,
        message,
        processing: processingResult
          ? {
              conversation: processingResult.conversation,
              settings: processingResult.settings,
              summary: processingResult.summary,
              extracted_memory_items: processingResult.extractedMemoryItems,
              extraction_skipped: processingResult.extractionSkipped,
              extraction_reason: processingResult.extractionReason,
            }
          : null,
      },
      { status: 201 }
    );
  } catch (error) {
    return buildErrorResponse(error, "message_create_failed");
  }
}
