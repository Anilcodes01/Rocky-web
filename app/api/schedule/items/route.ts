import { NextResponse } from "next/server";

import { createScheduledItem, listScheduledItems } from "../../../../lib/scheduled-items";

const allowedKinds = new Set(["task", "reminder", "alarm"]);
const allowedRepeatRules = new Set(["none", "daily", "weekdays", "weekly", "monthly"]);

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDeviceId(request: Request, bodyDeviceId?: unknown) {
  const headerValue = cleanString(request.headers.get("x-rocky-device-id"));
  const bodyValue = cleanString(bodyDeviceId);
  return headerValue || bodyValue;
}

function normalizeScheduledFor(value: unknown) {
  const raw = cleanString(value);
  if (!raw) {
    return null;
  }

  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString();
}

export async function GET(request: Request) {
  const deviceId = normalizeDeviceId(request);
  if (!deviceId) {
    return NextResponse.json({ ok: false, error: "missing_device_id" }, { status: 400 });
  }

  try {
    const items = await listScheduledItems(deviceId);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "failed_to_load_items", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown> | null = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const deviceId = normalizeDeviceId(request, body?.device_id);
  if (!deviceId) {
    return NextResponse.json({ ok: false, error: "missing_device_id" }, { status: 400 });
  }

  const title = cleanString(body?.title);
  const kind = cleanString(body?.kind);
  const scheduledFor = normalizeScheduledFor(body?.scheduled_for);
  const timezone = cleanString(body?.timezone) || "UTC";
  const repeatRule = cleanString(body?.repeat_rule) || "none";
  const notes = cleanString(body?.notes) || null;

  if (!title) {
    return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
  }

  if (!allowedKinds.has(kind)) {
    return NextResponse.json({ ok: false, error: "invalid_kind" }, { status: 400 });
  }

  if (!scheduledFor) {
    return NextResponse.json({ ok: false, error: "invalid_scheduled_for" }, { status: 400 });
  }

  if (!allowedRepeatRules.has(repeatRule)) {
    return NextResponse.json({ ok: false, error: "invalid_repeat_rule" }, { status: 400 });
  }

  try {
    const item = await createScheduledItem({
      deviceId,
      title,
      kind: kind as "task" | "reminder" | "alarm",
      scheduledFor,
      timezone,
      repeatRule: repeatRule as "none" | "daily" | "weekdays" | "weekly" | "monthly",
      notes,
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "failed_to_create_item", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
