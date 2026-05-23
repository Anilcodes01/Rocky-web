import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  COMPOSIO_API_KEY: z.string().min(1).optional(),
  COMPOSIO_CALLBACK_URL: z.string().url().optional(),
  COMPOSIO_GMAIL_AUTH_CONFIG_ID: z.string().min(1).optional(),
  COMPOSIO_GOOGLE_SHEETS_AUTH_CONFIG_ID: z.string().min(1).optional(),
  COMPOSIO_GOOGLE_DRIVE_AUTH_CONFIG_ID: z.string().min(1).optional(),
  COMPOSIO_GITHUB_AUTH_CONFIG_ID: z.string().min(1).optional(),
  COMPOSIO_LINEAR_AUTH_CONFIG_ID: z.string().min(1).optional(),
  COMPOSIO_NOTION_AUTH_CONFIG_ID: z.string().min(1).optional(),
  COMPOSIO_SLACK_AUTH_CONFIG_ID: z.string().min(1).optional(),
  COMPOSIO_YOUTUBE_AUTH_CONFIG_ID: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().min(1).optional(),
});

let cachedEnv: z.infer<typeof serverEnvSchema> | null = null;

export function getServerEnv() {
  if (!cachedEnv) {
    cachedEnv = serverEnvSchema.parse(process.env);
  }

  return cachedEnv;
}

export function getSiteUrl(requestUrl?: string | URL) {
  const env = getServerEnv();

  if (env.NEXT_PUBLIC_SITE_URL) {
    return env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }

  if (requestUrl) {
    const url = new URL(requestUrl);
    return url.origin;
  }

  return "http://localhost:3000";
}
