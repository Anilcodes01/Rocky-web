import "server-only";

import { createSupabaseServiceRoleClient } from "./supabase/server";
import type { Database } from "./supabase/database.types";

type ScheduledItemRow = {
  id: string;
  device_id: string;
  title: string;
  kind: string;
  scheduled_for: string;
  timezone: string;
  repeat_rule: string;
  interval_minutes: number | null;
  window_start_time: string | null;
  window_end_time: string | null;
  notes: string | null;
  status: string;
  snoozed_until: string | null;
  last_delivered_at: string | null;
  delivered_count: number;
  created_at: string;
  updated_at: string;
};

export type ScheduledItemInput = {
  deviceId: string;
  title: string;
  kind: "task" | "reminder" | "alarm";
  scheduledFor: string;
  timezone: string;
  repeatRule: "none" | "daily" | "weekdays" | "weekly" | "monthly";
  intervalMinutes?: number | null;
  windowStartTime?: string | null;
  windowEndTime?: string | null;
  notes?: string | null;
};

export type ScheduledItemUpdateInput = {
  title?: string;
  kind?: "task" | "reminder" | "alarm";
  scheduledFor?: string;
  timezone?: string;
  repeatRule?: "none" | "daily" | "weekdays" | "weekly" | "monthly";
  intervalMinutes?: number | null;
  windowStartTime?: string | null;
  windowEndTime?: string | null;
  notes?: string | null;
  status?: "pending" | "completed" | "dismissed" | "missed" | "cancelled";
  snoozedUntil?: string | null;
  lastDeliveredAt?: string | null;
  deliveredCount?: number;
};

function baseSelect() {
  return [
    "id",
    "device_id",
    "title",
    "kind",
    "scheduled_for",
    "timezone",
    "repeat_rule",
    "interval_minutes",
    "window_start_time",
    "window_end_time",
    "notes",
    "status",
    "snoozed_until",
    "last_delivered_at",
    "delivered_count",
    "created_at",
    "updated_at",
  ].join(",");
}

export async function listScheduledItems(deviceId: string) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("rocky_scheduled_items")
    .select(baseSelect())
    .eq("device_id", deviceId)
    .order("scheduled_for", { ascending: true })
    .returns<ScheduledItemRow[]>();

  if (error) {
    throw new Error(`Failed to load scheduled items: ${error.message}`);
  }

  return data ?? [];
}

export async function createScheduledItem(input: ScheduledItemInput) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("rocky_scheduled_items")
    .insert({
      device_id: input.deviceId,
      title: input.title,
      kind: input.kind,
      scheduled_for: input.scheduledFor,
      timezone: input.timezone,
      repeat_rule: input.repeatRule,
      interval_minutes: input.intervalMinutes ?? null,
      window_start_time: input.windowStartTime ?? null,
      window_end_time: input.windowEndTime ?? null,
      notes: input.notes ?? null,
      status: "pending",
    })
    .select(baseSelect())
    .single<ScheduledItemRow>();

  if (error) {
    throw new Error(`Failed to create scheduled item: ${error.message}`);
  }

  return data;
}

export async function updateScheduledItem(
  deviceId: string,
  itemId: string,
  updates: ScheduledItemUpdateInput
) {
  const supabase = createSupabaseServiceRoleClient();
  const payload: Database["public"]["Tables"]["rocky_scheduled_items"]["Update"] = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) {
    payload.title = updates.title;
  }
  if (updates.kind !== undefined) {
    payload.kind = updates.kind;
  }
  if (updates.scheduledFor !== undefined) {
    payload.scheduled_for = updates.scheduledFor;
  }
  if (updates.timezone !== undefined) {
    payload.timezone = updates.timezone;
  }
  if (updates.repeatRule !== undefined) {
    payload.repeat_rule = updates.repeatRule;
  }
  if (updates.intervalMinutes !== undefined) {
    payload.interval_minutes = updates.intervalMinutes;
  }
  if (updates.windowStartTime !== undefined) {
    payload.window_start_time = updates.windowStartTime;
  }
  if (updates.windowEndTime !== undefined) {
    payload.window_end_time = updates.windowEndTime;
  }
  if (updates.notes !== undefined) {
    payload.notes = updates.notes;
  }
  if (updates.status !== undefined) {
    payload.status = updates.status;
  }
  if (updates.snoozedUntil !== undefined) {
    payload.snoozed_until = updates.snoozedUntil;
  }
  if (updates.lastDeliveredAt !== undefined) {
    payload.last_delivered_at = updates.lastDeliveredAt;
  }
  if (updates.deliveredCount !== undefined) {
    payload.delivered_count = updates.deliveredCount;
  }

  const { data, error } = await supabase
    .from("rocky_scheduled_items")
    .update(payload)
    .eq("id", itemId)
    .eq("device_id", deviceId)
    .select(baseSelect())
    .maybeSingle<ScheduledItemRow>();

  if (error) {
    throw new Error(`Failed to update scheduled item: ${error.message}`);
  }

  return data;
}

export async function deleteScheduledItem(deviceId: string, itemId: string) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("rocky_scheduled_items")
    .delete()
    .eq("id", itemId)
    .eq("device_id", deviceId);

  if (error) {
    throw new Error(`Failed to delete scheduled item: ${error.message}`);
  }
}
