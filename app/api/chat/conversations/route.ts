import { NextResponse } from "next/server";

import { createConversationForUser, listConversationsForUser } from "@/lib/memory-store";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

type CreateConversationRequestBody = {
  title?: unknown;
  device_public_id?: unknown;
} | null;

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildErrorResponse(error: unknown, fallbackError: string) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const status =
    message === "Authentication required."
      ? 401
      : message === "Device not found for the authenticated user."
        ? 404
        : 500;

  return NextResponse.json(
    {
      ok: false,
      error:
        status === 401
          ? "unauthorized"
          : status === 404
            ? "device_not_found"
            : fallbackError,
      message,
    },
    { status }
  );
}

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(request);
    const conversations = await listConversationsForUser(supabase, user);

    return NextResponse.json({ ok: true, conversations });
  } catch (error) {
    return buildErrorResponse(error, "conversation_list_failed");
  }
}

export async function POST(request: Request) {
  let body: CreateConversationRequestBody = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(request);
    const conversation = await createConversationForUser(supabase, user, {
      title: cleanString(body?.title) || null,
      devicePublicId: cleanString(body?.device_public_id) || null,
    });

    return NextResponse.json({ ok: true, conversation }, { status: 201 });
  } catch (error) {
    return buildErrorResponse(error, "conversation_create_failed");
  }
}
