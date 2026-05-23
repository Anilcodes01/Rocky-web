import { NextResponse } from "next/server";

import { getComposio, hasComposioConfig } from "../../../../lib/composio";
import { isPlainRecord } from "../../../../lib/composio-tools";

type ExecuteRequestBody = {
  session_id?: string;
  tool_slug?: string;
  arguments?: unknown;
} | null;

export async function POST(request: Request) {
  let body: ExecuteRequestBody = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const sessionId = typeof body?.session_id === "string" ? body.session_id.trim() : "";
  const toolSlug = typeof body?.tool_slug === "string" ? body.tool_slug.trim() : "";
  const toolArguments = isPlainRecord(body?.arguments) ? body?.arguments : {};

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "missing_session_id" }, { status: 400 });
  }

  if (!toolSlug) {
    return NextResponse.json({ ok: false, error: "missing_tool_slug" }, { status: 400 });
  }

  if (!hasComposioConfig()) {
    return NextResponse.json({ ok: false, error: "broker_not_configured" }, { status: 503 });
  }

  try {
    const result = await getComposio().tools.executeSessionTool(toolSlug, {
      sessionId,
      arguments: toolArguments,
    });

    return NextResponse.json({
      ok: true,
      session_id: sessionId,
      tool_slug: toolSlug,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "tool_execution_failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
