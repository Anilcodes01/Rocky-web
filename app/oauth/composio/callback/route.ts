import { NextResponse } from "next/server";

import { errorPage, getConnectionCodeKey, getOAuthStateKey } from "../../../../lib/oauth";
import { getRedis, hasRedisConfig } from "../../../../lib/redis";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const state = requestUrl.searchParams.get("state");
  const connectedAccountId =
    requestUrl.searchParams.get("connectedAccountId") ||
    requestUrl.searchParams.get("connected_account_id");

  if (!state) {
    return errorPage("Missing state", "Rocky could not finish this connection because the state is missing.");
  }

  if (!hasRedisConfig()) {
    return errorPage("Connection unavailable", "Rocky's connection service is not configured yet.", 503);
  }

  const redis = getRedis();
  const savedState = await redis.get<{
    provider?: string;
    redirect_uri?: string;
    rocky_entity_id?: string;
  }>(getOAuthStateKey(state));

  if (!savedState?.provider || !savedState?.redirect_uri || !savedState?.rocky_entity_id) {
    return errorPage("Expired state", "Rocky could not finish this connection because the request expired.");
  }

  await redis.del(getOAuthStateKey(state));

  const connectionCode = crypto.randomUUID();
  await redis.set(
    getConnectionCodeKey(connectionCode),
    {
      provider: savedState.provider,
      composio_entity_id: savedState.rocky_entity_id,
      composio_connected_account_id: connectedAccountId || null,
      created_at: new Date().toISOString(),
    },
    { ex: 600 }
  );

  const redirectUrl = new URL(savedState.redirect_uri);
  redirectUrl.searchParams.set("state", state);
  redirectUrl.searchParams.set("connection_code", connectionCode);

  return NextResponse.redirect(redirectUrl);
}
