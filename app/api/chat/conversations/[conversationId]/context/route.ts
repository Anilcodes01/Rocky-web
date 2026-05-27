import { NextResponse } from "next/server";

import { buildConversationContextForUser } from "@/lib/memory-context";
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const { supabase, user } = await requireAuthenticatedUser(request);
    const context = await buildConversationContextForUser(supabase, user, conversationId);

    if (!context) {
      return NextResponse.json({ ok: false, error: "conversation_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      conversation: context.conversation,
      summary: context.summary,
      recent_messages: context.recentMessages,
      relevant_memory_items: context.relevantMemoryItems,
      prompt_context: {
        summary_text: context.promptContext.summaryText,
        recent_transcript: context.promptContext.recentTranscript,
        memory_lines: context.promptContext.memoryLines,
      },
    });
  } catch (error) {
    return buildErrorResponse(error, "conversation_context_failed");
  }
}
