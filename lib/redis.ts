import "server-only";

import { Redis } from "@upstash/redis";

import { getServerEnv } from "./env";

let redis: Redis | null = null;

export function getRedisConfig() {
  const env = getServerEnv();
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;

  return { url, token };
}

export function hasRedisConfig() {
  const { url, token } = getRedisConfig();
  return Boolean(url && token);
}

export function getRedis() {
  const { url, token } = getRedisConfig();

  if (!url || !token) {
    throw new Error("Redis environment variables are not configured.");
  }

  if (!redis) {
    redis = new Redis({ url, token });
  }

  return redis;
}
