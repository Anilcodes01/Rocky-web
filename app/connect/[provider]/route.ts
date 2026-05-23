import { NextResponse } from "next/server";

import { getComposio, hasComposioConfig } from "../../../lib/composio";
import { getSafeNextPath } from "../../../lib/auth";
import {
  errorPage,
  getComposioCallbackUrl,
  getOAuthStateKey,
  isValidDesktopRedirectUri,
  isValidState,
} from "../../../lib/oauth";
import { getRedis, hasRedisConfig } from "../../../lib/redis";
import { getRockyProviderConfig } from "../../../lib/rocky-connections";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider } = await context.params;
  const providerConfig = getRockyProviderConfig(provider);
  const requestUrl = new URL(request.url);
  const redirectUri = requestUrl.searchParams.get("redirect_uri");
  const state = requestUrl.searchParams.get("state");

  if (!providerConfig) {
    return errorPage("Unsupported provider", "Rocky cannot connect this service yet.", 404);
  }

  if (!redirectUri || !isValidDesktopRedirectUri(redirectUri)) {
    return errorPage(
      "Invalid redirect",
      "Rocky received an invalid desktop callback URL. Please update the Rocky desktop app and try again."
    );
  }

  if (!isValidState(state)) {
    return errorPage("Invalid state", "Rocky could not start this connection because its request state is invalid.");
  }

  const validatedState = state as string;

  if (!hasComposioConfig() || !hasRedisConfig() || !providerConfig.authConfigId) {
    return errorPage("Connection unavailable", "Rocky's connection service is not configured yet.", 503);
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/auth/login", requestUrl.origin);
    loginUrl.searchParams.set(
      "next",
      getSafeNextPath(`${requestUrl.pathname}${requestUrl.search}`)
    );
    return NextResponse.redirect(loginUrl);
  }

  const rockyEntityId = `rocky_${crypto.randomUUID()}`;
  const redis = getRedis();
  const callbackUrl = new URL(getComposioCallbackUrl(request.url));
  callbackUrl.searchParams.set("state", validatedState);

  await redis.set(
    getOAuthStateKey(validatedState),
    {
      provider,
      redirect_uri: redirectUri,
      rocky_entity_id: rockyEntityId,
      user_id: user.id,
      created_at: new Date().toISOString(),
    },
    { ex: 600 }
  );

  try {
    const connectionRequest = await getComposio().connectedAccounts.link(
      rockyEntityId,
      providerConfig.authConfigId,
      {
        callbackUrl: callbackUrl.toString(),
      }
    );

    if (!connectionRequest.redirectUrl) {
      throw new Error("Composio did not return a connect URL.");
    }

    return NextResponse.redirect(connectionRequest.redirectUrl);
  } catch (error) {
    console.error("Composio connectedAccounts.link failed", {
      provider,
      authConfigEnv: providerConfig.authConfigEnv,
      authConfigIdPrefix: providerConfig.authConfigId?.slice(0, 6),
      authConfigIdSuffix: providerConfig.authConfigId?.slice(-4),
      callbackUrl: callbackUrl.toString(),
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    await redis.del(getOAuthStateKey(validatedState));
    return errorPage("Connection unavailable", "Rocky could not start this service connection. Please try again.", 502);
  }
}
