import { NextResponse } from "next/server";

import {
  isAllowedMemoryScope,
  isAllowedMemoryStatus,
  isAllowedMemoryType,
  listMemoryItemsForUser,
} from "@/lib/memory-store";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

function cleanString(value: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLimit(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const type = cleanString(requestUrl.searchParams.get("type"));
  const status = cleanString(requestUrl.searchParams.get("status"));
  const scope = cleanString(requestUrl.searchParams.get("scope"));
  const conversationId = cleanString(requestUrl.searchParams.get("conversation_id"));
  const limit = normalizeLimit(requestUrl.searchParams.get("limit"));

  if (type && !isAllowedMemoryType(type)) {
    return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 });
  }

  if (status && !isAllowedMemoryStatus(status)) {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
  }

  if (scope && !isAllowedMemoryScope(scope)) {
    return NextResponse.json({ ok: false, error: "invalid_scope" }, { status: 400 });
  }

  if (requestUrl.searchParams.has("limit") && limit === null) {
    return NextResponse.json({ ok: false, error: "invalid_limit" }, { status: 400 });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(request);
    const memoryItems = await listMemoryItemsForUser(supabase, user, {
      type: type || null,
      status: status || null,
      scope: scope || null,
      conversationId: conversationId || null,
      limit,
    });

    return NextResponse.json({ ok: true, memory_items: memoryItems });
  } catch (error) {
    return buildErrorResponse(error, "memory_items_load_failed");
  }
}
