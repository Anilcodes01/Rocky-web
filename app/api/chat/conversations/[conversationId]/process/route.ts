import { NextResponse } from "next/server";

import { processConversationForUser } from "@/lib/memory-pipeline";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const { supabase, user } = await requireAuthenticatedUser(request);
    const result = await processConversationForUser(supabase, user, conversationId);

    if (!result) {
      return NextResponse.json({ ok: false, error: "conversation_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      conversation: result.conversation,
      settings: result.settings,
      summary: result.summary,
      extracted_memory_items: result.extractedMemoryItems,
      extraction_skipped: result.extractionSkipped,
      extraction_reason: result.extractionReason,
    });
  } catch (error) {
    return buildErrorResponse(error, "conversation_process_failed");
  }
}
