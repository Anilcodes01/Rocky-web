import { NextResponse } from "next/server";

import { deleteScheduledItem, updateScheduledItem } from "../../../../../lib/scheduled-items";

const allowedKinds = new Set(["task", "reminder", "alarm"]);
const allowedRepeatRules = new Set(["none", "daily", "weekdays", "weekly", "monthly"]);
const allowedStatuses = new Set(["pending", "completed", "dismissed", "missed", "cancelled"]);

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDeviceId(request: Request, bodyDeviceId?: unknown) {
  const headerValue = cleanString(request.headers.get("x-rocky-device-id"));
  const bodyValue = cleanString(bodyDeviceId);
  return headerValue || bodyValue;
}

function normalizeTimestamp(value: unknown) {
  if (value === null) {
    return null;
  }

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
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

  const { itemId } = await params;
  const updates: Record<string, unknown> = {};
  const title = cleanString(body?.title);
  const kind = cleanString(body?.kind);
  const scheduledFor = normalizeTimestamp(body?.scheduled_for);
  const timezone = cleanString(body?.timezone);
  const repeatRule = cleanString(body?.repeat_rule);
  const notes = body && "notes" in body ? cleanString(body.notes) || null : undefined;
  const status = cleanString(body?.status);
  const snoozedUntil = body && "snoozed_until" in body ? normalizeTimestamp(body.snoozed_until) : undefined;
  const lastDeliveredAt = body && "last_delivered_at" in body ? normalizeTimestamp(body.last_delivered_at) : undefined;
  const deliveredCount = typeof body?.delivered_count === "number" ? body.delivered_count : undefined;

  if (title) {
    updates.title = title;
  }
  if (kind) {
    if (!allowedKinds.has(kind)) {
      return NextResponse.json({ ok: false, error: "invalid_kind" }, { status: 400 });
    }
    updates.kind = kind;
  }
  if ("scheduled_for" in (body ?? {})) {
    if (!scheduledFor) {
      return NextResponse.json({ ok: false, error: "invalid_scheduled_for" }, { status: 400 });
    }
    updates.scheduledFor = scheduledFor;
  }
  if (timezone) {
    updates.timezone = timezone;
  }
  if (repeatRule) {
    if (!allowedRepeatRules.has(repeatRule)) {
      return NextResponse.json({ ok: false, error: "invalid_repeat_rule" }, { status: 400 });
    }
    updates.repeatRule = repeatRule;
  }
  if (notes !== undefined) {
    updates.notes = notes;
  }
  if (status) {
    if (!allowedStatuses.has(status)) {
      return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
    }
    updates.status = status;
  }
  if (snoozedUntil !== undefined) {
    updates.snoozedUntil = snoozedUntil;
  }
  if (lastDeliveredAt !== undefined) {
    updates.lastDeliveredAt = lastDeliveredAt;
  }
  if (deliveredCount !== undefined) {
    updates.deliveredCount = deliveredCount;
  }

  try {
    const item = await updateScheduledItem(deviceId, itemId, updates);
    if (!item) {
      return NextResponse.json({ ok: false, error: "item_not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "failed_to_update_item", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params;
  const deviceId = normalizeDeviceId(request);

  if (!deviceId) {
    return NextResponse.json({ ok: false, error: "missing_device_id" }, { status: 400 });
  }

  try {
    await deleteScheduledItem(deviceId, itemId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "failed_to_delete_item", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
