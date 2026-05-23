import { NextResponse } from "next/server";

import { getConnectionCodeKey } from "../../../../lib/oauth";
import { getRedis, hasRedisConfig } from "../../../../lib/redis";
import { isSupportedProvider } from "../../../../lib/rocky-connections";

export async function POST(request: Request) {
  let body: { provider?: string; code?: string } | null = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const provider = body?.provider;
  const code = body?.code;

  if (!provider || !isSupportedProvider(provider)) {
    return NextResponse.json({ ok: false, error: "unsupported_provider" }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ ok: false, error: "missing_code" }, { status: 400 });
  }

  if (!hasRedisConfig()) {
    return NextResponse.json({ ok: false, error: "broker_not_configured" }, { status: 503 });
  }

  const redis = getRedis();
  const stored = await redis.get<{
    provider: string;
    composio_entity_id: string;
    composio_connected_account_id?: string | null;
    composio_tool_router_session_id?: string | null;
  }>(getConnectionCodeKey(code));

  if (!stored) {
    return NextResponse.json({ ok: false, error: "invalid_or_expired_code" });
  }

  if (stored.provider !== provider) {
    return NextResponse.json({ ok: false, error: "provider_mismatch" }, { status: 400 });
  }

  await redis.del(getConnectionCodeKey(code));

  return NextResponse.json({
    ok: true,
    token: {
      connection_mode: "composio",
      provider: stored.provider,
      composio_entity_id: stored.composio_entity_id,
      composio_connected_account_id: stored.composio_connected_account_id || null,
      composio_tool_router_session_id: stored.composio_tool_router_session_id || null,
    },
  });
}
