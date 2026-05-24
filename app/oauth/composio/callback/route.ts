import { NextResponse } from "next/server";

import { errorPage, getConnectionCodeKey, getOAuthStateKey } from "../../../../lib/oauth";
import { upsertProviderConnection } from "../../../../lib/provider-connections";
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
    composio_user_id?: string;
    rocky_entity_id?: string;
    composio_tool_router_session_id?: string;
    user_id?: string;
  }>(getOAuthStateKey(state));

  const composioUserId = savedState?.composio_user_id || savedState?.user_id || savedState?.rocky_entity_id;

  if (!savedState?.provider || !savedState?.redirect_uri || !composioUserId || !savedState?.composio_tool_router_session_id) {
    return errorPage("Expired state", "Rocky could not finish this connection because the request expired.");
  }

  await redis.del(getOAuthStateKey(state));

  if (savedState.user_id) {
    try {
      await upsertProviderConnection({
        userId: savedState.user_id,
        provider: savedState.provider,
        connectedAccountId: connectedAccountId || null,
      });
    } catch (error) {
      console.error("Failed to persist provider connection", {
        provider: savedState.provider,
        userId: savedState.user_id,
        hasConnectedAccountId: Boolean(connectedAccountId),
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const connectionCode = crypto.randomUUID();
  await redis.set(
    getConnectionCodeKey(connectionCode),
    {
      provider: savedState.provider,
      composio_entity_id: composioUserId,
      composio_connected_account_id: connectedAccountId || null,
      composio_tool_router_session_id: savedState.composio_tool_router_session_id,
      user_id: savedState.user_id || null,
      created_at: new Date().toISOString(),
    },
    { ex: 600 }
  );

  const redirectUrl = new URL(savedState.redirect_uri);
  redirectUrl.searchParams.set("state", state);
  redirectUrl.searchParams.set("connection_code", connectionCode);

  return NextResponse.redirect(redirectUrl);
}
