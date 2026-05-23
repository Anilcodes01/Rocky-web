import "server-only";

import { getComposio } from "./composio";
import { getRedis, hasRedisConfig } from "./redis";
import { ROCKY_PROVIDER_CONFIG } from "./rocky-connections";

const USER_TOOL_ROUTER_SESSION_KEY_PREFIX = "rocky_tool_router_session:user:";
const TOOL_ROUTER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type StoredToolRouterSessionRecord = {
  session_id: string;
  user_id: string;
  created_at: string;
};

function getUserToolRouterSessionKey(userId: string) {
  return `${USER_TOOL_ROUTER_SESSION_KEY_PREFIX}${userId}`;
}

function getConfiguredAuthConfigs() {
  return Object.values(ROCKY_PROVIDER_CONFIG).reduce<Record<string, string>>((accumulator, providerConfig) => {
    const authConfigId = process.env[providerConfig.authConfigEnv];

    if (authConfigId) {
      accumulator[providerConfig.toolkit] = authConfigId;
    }

    return accumulator;
  }, {});
}

function getConfiguredToolkits() {
  return Array.from(new Set(Object.values(ROCKY_PROVIDER_CONFIG).map((providerConfig) => providerConfig.toolkit)));
}

async function createToolRouterSession(userId: string) {
  const composio = getComposio();
  const authConfigs = getConfiguredAuthConfigs();
  const toolkits = getConfiguredToolkits();

  const session = await composio.toolRouter.create(userId, {
    authConfigs,
    toolkits,
  });

  if (!hasRedisConfig()) {
    return session;
  }

  const redis = getRedis();
  await redis.set(
    getUserToolRouterSessionKey(userId),
    {
      session_id: session.sessionId,
      user_id: userId,
      created_at: new Date().toISOString(),
    } satisfies StoredToolRouterSessionRecord,
    { ex: TOOL_ROUTER_SESSION_TTL_SECONDS }
  );

  return session;
}

export async function getOrCreateToolRouterSession(userId: string) {
  if (!hasRedisConfig()) {
    return createToolRouterSession(userId);
  }

  const redis = getRedis();
  const stored = await redis.get<StoredToolRouterSessionRecord>(getUserToolRouterSessionKey(userId));

  if (stored?.session_id) {
    try {
      return await getComposio().toolRouter.use(stored.session_id);
    } catch {
      await redis.del(getUserToolRouterSessionKey(userId));
    }
  }

  return createToolRouterSession(userId);
}
