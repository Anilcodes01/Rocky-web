import { NextResponse } from "next/server";

import { getComposio, hasComposioConfig } from "../../../../lib/composio";
import { ROCKY_COMPOSIO_META_TOOL_SLUGS } from "../../../../lib/composio-tools";

type ToolsRequestBody = {
  session_id?: string;
} | null;

export async function POST(request: Request) {
  let body: ToolsRequestBody = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const sessionId = typeof body?.session_id === "string" ? body.session_id.trim() : "";

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "missing_session_id" }, { status: 400 });
  }

  if (!hasComposioConfig()) {
    return NextResponse.json({ ok: false, error: "broker_not_configured" }, { status: 503 });
  }

  try {
    const rawTools = await getComposio().tools.getRawToolRouterSessionTools(sessionId);
    const tools = rawTools
      .filter((tool) => ROCKY_COMPOSIO_META_TOOL_SLUGS.has(tool.slug))
      .map((tool) => ({
        tool_slug: tool.slug,
        function_name: tool.slug,
        title: tool.name,
        description: tool.description,
        parameters: tool.inputParameters ?? { type: "object", properties: {} },
        toolkit: tool.toolkit?.slug ?? "composio",
      }));

    return NextResponse.json({
      ok: true,
      session_id: sessionId,
      tools,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "tool_discovery_failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
