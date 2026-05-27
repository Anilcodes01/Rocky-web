import { NextResponse } from "next/server";

import { getOrCreateMemorySettings, updateMemorySettings } from "@/lib/memory-store";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

type MemorySettingsRequestBody = {
  memory_enabled?: unknown;
  profile_memory_enabled?: unknown;
  project_memory_enabled?: unknown;
  preference_memory_enabled?: unknown;
  sensitive_memory_enabled?: unknown;
  auto_extract_enabled?: unknown;
  retention_days?: unknown;
} | null;

function normalizeBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeRetentionDays(value: unknown) {
  if (value === null) {
    return null;
  }

  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  return Number.NaN;
}

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

export async function GET(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedUser(request);
    const settings = await getOrCreateMemorySettings(supabase, user);

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return buildErrorResponse(error, "memory_settings_load_failed");
  }
}

export async function PUT(request: Request) {
  let body: MemorySettingsRequestBody = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const retentionDays = normalizeRetentionDays(body?.retention_days);
  if (Number.isNaN(retentionDays)) {
    return NextResponse.json({ ok: false, error: "invalid_retention_days" }, { status: 400 });
  }

  try {
    const { supabase, user } = await requireAuthenticatedUser(request);
    const settings = await updateMemorySettings(supabase, user, {
      memory_enabled: normalizeBoolean(body?.memory_enabled),
      profile_memory_enabled: normalizeBoolean(body?.profile_memory_enabled),
      project_memory_enabled: normalizeBoolean(body?.project_memory_enabled),
      preference_memory_enabled: normalizeBoolean(body?.preference_memory_enabled),
      sensitive_memory_enabled: normalizeBoolean(body?.sensitive_memory_enabled),
      auto_extract_enabled: normalizeBoolean(body?.auto_extract_enabled),
      retention_days: retentionDays,
    });

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return buildErrorResponse(error, "memory_settings_update_failed");
  }
}
