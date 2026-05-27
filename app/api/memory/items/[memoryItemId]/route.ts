import { NextResponse } from "next/server";

import type { MemoryItemAction } from "@/lib/memory-store";
import { applyMemoryItemAction, getMemoryItemForUser } from "@/lib/memory-store";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

type MemoryItemActionBody = {
  action?: unknown;
  reason?: unknown;
} | null;

const allowedActions = new Set(["confirm", "forget", "reject"]);

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
  { params }: { params: Promise<{ memoryItemId: string }> }
) {
  try {
    const { memoryItemId } = await params;
    const { supabase, user } = await requireAuthenticatedUser(request);
    const memoryItem = await getMemoryItemForUser(supabase, user, memoryItemId);

    if (!memoryItem) {
      return NextResponse.json({ ok: false, error: "memory_item_not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, memory_item: memoryItem });
  } catch (error) {
    return buildErrorResponse(error, "memory_item_load_failed");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memoryItemId: string }> }
) {
  let body: MemoryItemActionBody = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const actionValue = cleanString(body?.action);
  if (!allowedActions.has(actionValue)) {
    return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
  }

  const action = actionValue as MemoryItemAction;

  try {
    const { memoryItemId } = await params;
    const { supabase, user } = await requireAuthenticatedUser(request);
    const memoryItem = await applyMemoryItemAction(supabase, user, memoryItemId, {
      action,
      reason: cleanString(body?.reason) || null,
    });

    if (!memoryItem) {
      return NextResponse.json({ ok: false, error: "memory_item_not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, memory_item: memoryItem });
  } catch (error) {
    return buildErrorResponse(error, "memory_item_update_failed");
  }
}
