import { NextResponse } from "next/server";

import { getComposio, hasComposioConfig } from "../../../../lib/composio";
import {
  markProviderConnectionFailed,
  markProviderConnectionUsed,
  resolveProviderConnection,
} from "../../../../lib/provider-connections";
import { getRockyProviderConfig } from "../../../../lib/rocky-connections";

const GMAIL_FETCH_EMAILS_TOOL = "GMAIL_FETCH_EMAILS";
const GMAIL_SEND_EMAIL_TOOL = "GMAIL_SEND_EMAIL";
const GOOGLESHEETS_CREATE_SPREADSHEET_TOOL = "GOOGLESHEETS_CREATE_GOOGLE_SHEET1";
const GOOGLESHEETS_APPEND_VALUES_TOOL = "GOOGLESHEETS_SPREADSHEETS_VALUES_APPEND";
const GOOGLEDRIVE_FIND_FILE_TOOL = "GOOGLEDRIVE_FIND_FILE";
const NOTION_SEARCH_PAGES_TOOL = "NOTION_SEARCH_NOTION_PAGE";
const NOTION_CREATE_PAGE_TOOL = "NOTION_CREATE_NOTION_PAGE";
const NOTION_APPEND_TEXT_BLOCKS_TOOL = "NOTION_APPEND_TEXT_BLOCKS";
const GITHUB_LIST_REPOS_TOOL = "GITHUB_GET_REPOS";
const GITHUB_CREATE_ISSUE_TOOL = "GITHUB_CREATE_AN_ISSUE";
const LINEAR_LIST_ISSUES_TOOL = "LINEAR_LIST_LINEAR_ISSUES";
const LINEAR_SEARCH_ISSUES_TOOL = "LINEAR_SEARCH_ISSUES";
const LINEAR_LIST_TEAMS_TOOL = "LINEAR_LIST_LINEAR_TEAMS";
const LINEAR_CREATE_ISSUE_TOOL = "LINEAR_CREATE_LINEAR_ISSUE";
const SLACK_LIST_CHANNELS_TOOL = "SLACK_LIST_CHANNELS";
const SLACK_SEND_MESSAGE_TOOL = "SLACK_SEND_MESSAGE";

const GMAIL_SUMMARY_LIMIT = 10;
const DEFAULT_COLLECTION_LIMIT = 8;
const MAX_RESPONSE_BYTES = 256000;

type ProviderOperation =
  | {
      type?: string;
      max_results?: number;
      unread_only?: boolean;
      query?: string;
      title?: string;
      channel?: string;
      text?: string;
      recipient?: string;
      cc?: string[];
      bcc?: string[];
      rows?: unknown[][];
      headers?: string[];
      range?: string;
      parent_id?: string;
      markdown?: string;
      block_id?: string;
      paragraphs?: string[];
      owner?: string;
      repo?: string;
      body?: string;
      team_id?: string;
      priority?: number;
    }
  | null
  | undefined;

function cappedJson(payload: unknown, status = 200) {
  const json = JSON.stringify(payload);

  if (Buffer.byteLength(json, "utf8") > MAX_RESPONSE_BYTES) {
    return NextResponse.json({ ok: false, error: "response_too_large" }, { status: 502 });
  }

  return new Response(json, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function cleanString(value: unknown, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function cleanBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    return new Date(milliseconds).toISOString();
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Unknown time";
    }

    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (Number.isFinite(numeric)) {
        const milliseconds = numeric > 10_000_000_000 ? numeric : numeric * 1000;
        return new Date(milliseconds).toISOString();
      }
    }

    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }

    return trimmed;
  }

  return "Unknown time";
}

function collectRecords(
  value: unknown,
  candidates: Record<string, unknown>[] = [],
  seen = new WeakSet<object>()
) {
  if (!value || typeof value !== "object") {
    return candidates;
  }

  if (seen.has(value)) {
    return candidates;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      collectRecords(item, candidates, seen);
    }
    return candidates;
  }

  const record = value as Record<string, unknown>;
  candidates.push(record);

  for (const nested of Object.values(record)) {
    collectRecords(nested, candidates, seen);
  }

  return candidates;
}

function dedupeRecords(records: Record<string, unknown>[], keyBuilder: (record: Record<string, unknown>) => string) {
  const seen = new Set<string>();
  const unique: Record<string, unknown>[] = [];

  for (const record of records) {
    const key = keyBuilder(record);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(record);
  }

  return unique;
}

function normalizeGmailMessages(result: unknown, fallbackLimit: number) {
  const rawCandidates = dedupeRecords(collectRecords(result), (record) =>
    [
      cleanString(record.id || record.messageId || record.message_id || record.gmailMessageId, ""),
      cleanString(record.subject || record.title || record.snippet, ""),
      cleanString(record.sender || record.from || record.from_email || record.sender_email, ""),
    ]
      .filter(Boolean)
      .join("::")
  ).filter(
    (record) =>
      "subject" in record ||
      "snippet" in record ||
      "from" in record ||
      "sender" in record ||
      "messageId" in record ||
      "message_id" in record ||
      "id" in record
  );

  return rawCandidates.slice(0, fallbackLimit).map((message, index) => ({
    id: cleanString(
      message.id || message.messageId || message.message_id || message.gmailMessageId,
      `message_${index + 1}`
    ),
    sender: cleanString(
      message.sender ||
        message.from ||
        message.from_email ||
        message.sender_email ||
        message.email_from,
      "Unknown sender"
    ),
    subject: cleanString(message.subject || message.title, "(No subject)"),
    timestamp: normalizeTimestamp(
      message.timestamp ||
        message.internalDate ||
        message.internal_date ||
        message.receivedAt ||
        message.date ||
        message.created_at
    ),
    snippet: cleanString(
      message.snippet ||
        message.preview ||
        message.bodyPreview ||
        message.body_preview ||
        message.summary ||
        message.textPlain ||
        message.text,
      ""
    ),
    body: cleanString(
      message.body ||
        message.bodyText ||
        message.body_text ||
        message.textPlain ||
        message.text_plain ||
        message.text ||
        message.htmlToText ||
        message.messageText,
      ""
    ),
  }));
}

function normalizeGoogleDriveFiles(result: unknown, fallbackLimit: number) {
  const rawCandidates = dedupeRecords(collectRecords(result), (record) =>
    [
      cleanString(record.id || record.fileId, ""),
      cleanString(record.name || record.title, ""),
      cleanString(record.url || record.webViewLink || record.link, ""),
    ]
      .filter(Boolean)
      .join("::")
  ).filter(
    (record) =>
      "mimeType" in record ||
      "webViewLink" in record ||
      "owners" in record ||
      "driveId" in record ||
      "fileExtension" in record
  );

  return rawCandidates.slice(0, fallbackLimit).map((file, index) => ({
    id: cleanString(file.id || file.fileId, `drive_file_${index + 1}`),
    name: cleanString(file.name || file.title, "Untitled file"),
    mime_type: cleanString(file.mimeType || file.type, "Unknown type"),
    url: cleanString(file.webViewLink || file.url || file.link, ""),
  }));
}

function normalizeNotionPages(result: unknown, fallbackLimit: number) {
  const rawCandidates = dedupeRecords(collectRecords(result), (record) =>
    [
      cleanString(record.id || record.page_id, ""),
      cleanString(record.url || record.public_url, ""),
      cleanString(record.title || record.name, ""),
    ]
      .filter(Boolean)
      .join("::")
  ).filter(
    (record) =>
      "properties" in record ||
      "archived" in record ||
      "created_time" in record ||
      "last_edited_time" in record ||
      "public_url" in record
  );

  return rawCandidates.slice(0, fallbackLimit).map((page, index) => ({
    id: cleanString(page.id || page.page_id, `notion_page_${index + 1}`),
    title: cleanString(
      page.title ||
        page.name ||
        (Array.isArray(page.results) ? undefined : undefined),
      "Untitled page"
    ),
    url: cleanString(page.url || page.public_url, ""),
  }));
}

function normalizeGitHubRepositories(result: unknown, fallbackLimit: number) {
  const rawCandidates = dedupeRecords(collectRecords(result), (record) =>
    [
      cleanString(record.id || record.node_id, ""),
      cleanString(record.full_name || record.name, ""),
      cleanString(record.html_url || record.url, ""),
    ]
      .filter(Boolean)
      .join("::")
  ).filter(
    (record) =>
      "full_name" in record ||
      "default_branch" in record ||
      "fork" in record ||
      "private" in record ||
      "html_url" in record
  );

  return rawCandidates.slice(0, fallbackLimit).map((repo, index) => ({
    id: cleanString(repo.id || repo.node_id, `repo_${index + 1}`),
    name: cleanString(repo.name, "Unknown repo"),
    full_name: cleanString(repo.full_name || repo.name, "Unknown repo"),
    url: cleanString(repo.html_url || repo.url, ""),
    description: cleanString(repo.description, ""),
    private: cleanBoolean(repo.private, false),
  }));
}

function normalizeLinearIssues(result: unknown, fallbackLimit: number) {
  const rawCandidates = dedupeRecords(collectRecords(result), (record) =>
    [
      cleanString(record.id || record.identifier, ""),
      cleanString(record.title || record.name, ""),
      cleanString(record.url, ""),
    ]
      .filter(Boolean)
      .join("::")
  ).filter(
    (record) =>
      "identifier" in record ||
      "priority" in record ||
      "branchName" in record ||
      "estimate" in record ||
      "state" in record
  );

  return rawCandidates.slice(0, fallbackLimit).map((issue, index) => ({
    id: cleanString(issue.id || issue.identifier, `issue_${index + 1}`),
    identifier: cleanString(issue.identifier, ""),
    title: cleanString(issue.title || issue.name, "Untitled issue"),
    state: cleanString(
      (issue.state as Record<string, unknown> | undefined)?.name || issue.stateName || issue.status,
      "Unknown state"
    ),
    url: cleanString(issue.url, ""),
  }));
}

function normalizeSlackChannels(result: unknown, fallbackLimit: number) {
  const rawCandidates = dedupeRecords(collectRecords(result), (record) =>
    [
      cleanString(record.id, ""),
      cleanString(record.name, ""),
    ]
      .filter(Boolean)
      .join("::")
  ).filter(
    (record) =>
      "is_channel" in record ||
      "is_private" in record ||
      "is_group" in record ||
      "num_members" in record
  );

  return rawCandidates.slice(0, fallbackLimit).map((channel, index) => ({
    id: cleanString(channel.id, `channel_${index + 1}`),
    name: cleanString(channel.name, "unknown-channel"),
    is_private: cleanBoolean(channel.is_private || channel.is_group, false),
  }));
}

function extractGoogleSheet(result: unknown, titleFallback: string) {
  const records = collectRecords(result);
  const firstRecord = records.find(
    (record) => "spreadsheetId" in record || "spreadsheetUrl" in record || "spreadsheet_id" in record
  );

  return {
    spreadsheet_id: cleanString(
      firstRecord?.spreadsheetId || firstRecord?.spreadsheet_id,
      "new_spreadsheet"
    ),
    title: cleanString(firstRecord?.title || firstRecord?.name, titleFallback),
    url: cleanString(firstRecord?.spreadsheetUrl || firstRecord?.url, ""),
  };
}

function extractNotionPage(result: unknown, titleFallback: string) {
  const records = collectRecords(result);
  const firstRecord = records.find((record) => "id" in record && ("url" in record || "public_url" in record));

  return {
    id: cleanString(firstRecord?.id, "notion_page"),
    title: cleanString(firstRecord?.title || firstRecord?.name, titleFallback),
    url: cleanString(firstRecord?.url || firstRecord?.public_url, ""),
  };
}

function extractLinearTeams(result: unknown, fallbackLimit: number) {
  const rawCandidates = dedupeRecords(collectRecords(result), (record) =>
    [
      cleanString(record.id || record.teamId || record.team_id, ""),
      cleanString(record.name || record.teamName || record.team_name, ""),
      cleanString(record.key || record.teamKey || record.team_key, ""),
    ]
      .filter(Boolean)
      .join("::")
  ).filter((record) => {
    const id = cleanString(record.id || record.teamId || record.team_id, "");
    const name = cleanString(record.name || record.teamName || record.team_name, "");
    const key = cleanString(record.key || record.teamKey || record.team_key, "");
    return Boolean((id || key) && name);
  });

  return rawCandidates.slice(0, fallbackLimit).map((team, index) => ({
    id: cleanString(team.id || team.teamId || team.team_id, `team_${index + 1}`),
    key: cleanString(team.key || team.teamKey || team.team_key, ""),
    name: cleanString(team.name || team.teamName || team.team_name, "Unknown team"),
  }));
}

async function resolveLinearTeamId(input: {
  explicitTeamId: string;
  executionUserId: string;
  connectedAccountId: string | undefined;
}) {
  if (input.explicitTeamId) {
    return {
      teamId: input.explicitTeamId,
      defaulted: false,
      team: null as { id: string; key: string; name: string } | null,
    };
  }

  const result = await executeTool(
    LINEAR_LIST_TEAMS_TOOL,
    input.executionUserId,
    input.connectedAccountId,
    { first: 1 }
  );
  const [team] = extractLinearTeams(result, 1);

  return {
    teamId: team?.id ?? "",
    defaulted: Boolean(team?.id),
    team: team ?? null,
  };
}

function extractLinearIssue(result: unknown, titleFallback: string) {
  const records = collectRecords(result);
  const firstRecord = records.find((record) => "id" in record && ("title" in record || "identifier" in record));

  return {
    id: cleanString(firstRecord?.id, "linear_issue"),
    identifier: cleanString(firstRecord?.identifier, ""),
    title: cleanString(firstRecord?.title, titleFallback),
    url: cleanString(firstRecord?.url, ""),
  };
}

function extractGitHubIssue(result: unknown, titleFallback: string) {
  const records = collectRecords(result);
  const firstRecord = records.find((record) => "id" in record && ("html_url" in record || "url" in record));

  return {
    id: cleanString(firstRecord?.id, "github_issue"),
    title: cleanString(firstRecord?.title, titleFallback),
    number: Number(firstRecord?.number) || 0,
    url: cleanString(firstRecord?.html_url || firstRecord?.url, ""),
  };
}

function extractSlackMessage(result: unknown, channelFallback: string) {
  const records = collectRecords(result);
  const firstRecord = records.find(
    (record) =>
      "ts" in record ||
      "message" in record ||
      "channel" in record ||
      "permalink" in record
  );

  const messageRecord =
    (firstRecord?.message as Record<string, unknown> | undefined) || firstRecord || {};

  return {
    channel: cleanString(
      (firstRecord?.channel as Record<string, unknown> | undefined)?.name ||
        firstRecord?.channel ||
        channelFallback,
      channelFallback
    ),
    timestamp: cleanString(firstRecord?.ts || messageRecord.ts, ""),
    permalink: cleanString(firstRecord?.permalink || messageRecord.permalink, ""),
  };
}

function serializeUnknown(value: unknown, depth = 0): unknown {
  if (depth > 3) {
    return "[Max depth reached]";
  }

  if (value instanceof Error) {
    const errorRecord = value as Error & {
      cause?: unknown;
      code?: unknown;
      status?: unknown;
      statusCode?: unknown;
      meta?: unknown;
      error?: unknown;
      headers?: unknown;
    };

    return {
      name: value.name,
      message: value.message,
      code: errorRecord.code,
      status: errorRecord.status,
      statusCode: errorRecord.statusCode,
      meta: serializeUnknown(errorRecord.meta, depth + 1),
      error: serializeUnknown(errorRecord.error, depth + 1),
      cause: serializeUnknown(errorRecord.cause, depth + 1),
      stack: process.env.NODE_ENV === "development" ? value.stack : undefined,
    };
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => serializeUnknown(item, depth + 1));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        serializeUnknown(item, depth + 1),
      ])
    );
  }

  return value;
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return serializeUnknown(error) as Record<string, unknown>;
  }

  return {
    message: typeof error === "string" ? error : "Unknown error",
    raw: serializeUnknown(error),
  };
}

function normalizeLimit(value: unknown, fallback = DEFAULT_COLLECTION_LIMIT, max = DEFAULT_COLLECTION_LIMIT) {
  return Math.max(1, Math.min(Number(value) || fallback, max));
}

async function executeTool(
  toolSlug: string,
  entityId: string,
  connectedAccountId: string | undefined,
  args: Record<string, unknown>
) {
  const composio = getComposio();

  return composio.tools.execute(toolSlug, {
    userId: entityId,
    ...(connectedAccountId ? { connectedAccountId } : {}),
    arguments: args,
    dangerouslySkipVersionCheck: true,
  });
}

async function executeDurableTool(
  toolSlug: string,
  entityId: string,
  connectedAccountId: string | undefined,
  args: Record<string, unknown>,
  sessionId?: string
) {
  if (connectedAccountId) {
    return executeTool(toolSlug, entityId, connectedAccountId, args);
  }

  if (sessionId) {
    return getComposio().tools.executeSessionTool(toolSlug, {
      sessionId,
      arguments: args,
    });
  }

  return executeTool(toolSlug, entityId, connectedAccountId, args);
}

export async function POST(request: Request) {
  let body: {
    provider?: string;
    entity_id?: string;
    connected_account_id?: string;
    session_id?: string;
    operation?: ProviderOperation;
  } | null = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const providerConfig = body?.provider ? getRockyProviderConfig(body.provider) : null;
  const entityId = body?.entity_id;
  let connectedAccountId = body?.connected_account_id;
  const sessionId = typeof body?.session_id === "string" ? body.session_id.trim() : "";
  const operation = body?.operation;

  if (!providerConfig) {
    return NextResponse.json({ ok: false, error: "unsupported_provider" }, { status: 400 });
  }

  if (!entityId || typeof entityId !== "string") {
    return NextResponse.json({ ok: false, error: "missing_entity_id" }, { status: 400 });
  }

  if (!operation || typeof operation !== "object") {
    return NextResponse.json({ ok: false, error: "missing_operation" }, { status: 400 });
  }

  if (!hasComposioConfig() || !providerConfig.authConfigId) {
    return NextResponse.json({ ok: false, error: "broker_not_configured" }, { status: 503 });
  }

  const resolvedConnection = await resolveProviderConnection({
    provider: providerConfig.id,
    entityId,
    connectedAccountId,
  });
  const executionUserId = resolvedConnection?.composio_user_id || entityId;

  if (resolvedConnection?.connected_account_id) {
    connectedAccountId = resolvedConnection.connected_account_id;
  }

  if (connectedAccountId && entityId.startsWith("rocky_") && !resolvedConnection) {
    return NextResponse.json(
      {
        ok: false,
        error: "connection_requires_reconnect",
        provider: providerConfig.id,
        operation_type: operation.type,
        requires_reconnect: true,
      },
      { status: 409 }
    );
  }

  try {
    switch (operation.type) {
      case "gmail_summary": {
        if (providerConfig.id !== "gmail") {
          return NextResponse.json({ ok: false, error: "unsupported_provider_operation" }, { status: 400 });
        }

        if (!connectedAccountId) {
          return NextResponse.json(
            {
              ok: false,
              error: "connection_requires_reconnect",
              provider: providerConfig.id,
              operation_type: operation.type,
              requires_reconnect: true,
            },
            { status: 409 }
          );
        }

        const maxResults = normalizeLimit(operation.max_results, GMAIL_SUMMARY_LIMIT, GMAIL_SUMMARY_LIMIT);
        const unreadOnly = operation.unread_only !== false;
        const rawQuery = cleanString(operation.query, "");
        const query = [unreadOnly ? "is:unread" : "", rawQuery].filter(Boolean).join(" ");
        const result = await executeDurableTool(
          GMAIL_FETCH_EMAILS_TOOL,
          executionUserId,
          connectedAccountId,
          {
            max_results: maxResults,
            ...(query ? { query } : {}),
          },
          sessionId
        );

        const messages = normalizeGmailMessages(result, maxResults);
        await markProviderConnectionUsed({
          provider: providerConfig.id,
          connectedAccountId,
        });

        return cappedJson({
          ok: true,
          provider: providerConfig.id,
          connected_account_id: connectedAccountId || null,
          message_count: messages.length,
          messages,
          source: "composio",
        });
      }

      case "gmail_send_email": {
        if (providerConfig.id !== "gmail") {
          return NextResponse.json({ ok: false, error: "unsupported_provider_operation" }, { status: 400 });
        }

        if (!connectedAccountId) {
          return NextResponse.json(
            {
              ok: false,
              error: "connection_requires_reconnect",
              provider: providerConfig.id,
              operation_type: operation.type,
              requires_reconnect: true,
            },
            { status: 409 }
          );
        }

        const recipient = cleanString(operation.recipient, "");
        const subject = cleanString(operation.title, "");
        const body = cleanString(operation.text, "");
        const cc = Array.isArray(operation.cc) ? operation.cc.map((value) => cleanString(value, "")).filter(Boolean) : [];
        const bcc = Array.isArray(operation.bcc) ? operation.bcc.map((value) => cleanString(value, "")).filter(Boolean) : [];

        if (!recipient) {
          return NextResponse.json({ ok: false, error: "missing_recipient" }, { status: 400 });
        }

        if (!subject) {
          return NextResponse.json({ ok: false, error: "missing_subject" }, { status: 400 });
        }

        if (!body) {
          return NextResponse.json({ ok: false, error: "missing_body" }, { status: 400 });
        }

        const result = await executeDurableTool(
          GMAIL_SEND_EMAIL_TOOL,
          executionUserId,
          connectedAccountId,
          {
            recipient_email: recipient,
            subject,
            body,
            ...(cc.length ? { cc } : {}),
            ...(bcc.length ? { bcc } : {}),
          },
          sessionId
        );

        await markProviderConnectionUsed({
          provider: providerConfig.id,
          connectedAccountId,
        });

        return cappedJson({
          ok: true,
          provider: providerConfig.id,
          connected_account_id: connectedAccountId || null,
          recipient,
          subject,
          cc,
          bcc,
          raw_result: result,
          source: "composio",
        });
      }

      case "google_sheets_create_spreadsheet": {
        if (providerConfig.id !== "google_sheets") {
          return NextResponse.json({ ok: false, error: "unsupported_provider_operation" }, { status: 400 });
        }

        const title = cleanString(operation.title, "");
        if (!title) {
          return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
        }

        const result = await executeTool(
          GOOGLESHEETS_CREATE_SPREADSHEET_TOOL,
          executionUserId,
          connectedAccountId,
          { title }
        );
        const spreadsheet = extractGoogleSheet(result, title);

        return cappedJson({
          ok: true,
          provider: providerConfig.id,
          connected_account_id: connectedAccountId || null,
          spreadsheet,
          source: "composio",
        });
      }

      case "google_sheets_append_rows": {
        if (providerConfig.id !== "google_sheets") {
          return NextResponse.json({ ok: false, error: "unsupported_provider_operation" }, { status: 400 });
        }

        const spreadsheetId = cleanString(operation.query, "");
        const explicitRange = cleanString(operation.range, "");
        const rows = Array.isArray(operation.rows) ? operation.rows.filter(Array.isArray) : [];
        const headers = Array.isArray(operation.headers) ? operation.headers.map((value) => cleanString(value, "")).filter(Boolean) : [];

        if (!spreadsheetId) {
          return NextResponse.json({ ok: false, error: "missing_spreadsheet_id" }, { status: 400 });
        }

        if (!rows.length) {
          return NextResponse.json({ ok: false, error: "missing_rows" }, { status: 400 });
        }

        const values = [...(headers.length ? [headers] : []), ...rows];
        const range = explicitRange || "Sheet1!A:Z";

        const result = await executeTool(
          GOOGLESHEETS_APPEND_VALUES_TOOL,
          executionUserId,
          connectedAccountId,
          {
            spreadsheetId,
            range,
            values,
            valueInputOption: "USER_ENTERED",
            majorDimension: "ROWS",
            insertDataOption: "INSERT_ROWS",
            includeValuesInResponse: false,
          }
        );

        return cappedJson({
          ok: true,
          provider: providerConfig.id,
          connected_account_id: connectedAccountId || null,
          appended_row_count: rows.length,
          included_headers: headers.length > 0,
          range,
          raw_result: result,
          source: "composio",
        });
      }

      case "google_drive_search_files": {
        if (providerConfig.id !== "google_drive") {
          return NextResponse.json({ ok: false, error: "unsupported_provider_operation" }, { status: 400 });
        }

        const query = cleanString(operation.query, "");
        if (!query) {
          return NextResponse.json({ ok: false, error: "missing_query" }, { status: 400 });
        }
        const maxResults = normalizeLimit(operation.max_results);

        const result = await executeTool(
          GOOGLEDRIVE_FIND_FILE_TOOL,
          executionUserId,
          connectedAccountId,
          { query }
        );
        const files = normalizeGoogleDriveFiles(result, maxResults);

        return cappedJson({
          ok: true,
          provider: providerConfig.id,
          connected_account_id: connectedAccountId || null,
          file_count: files.length,
          files,
          source: "composio",
        });
      }

      case "notion_search_pages": {
        if (providerConfig.id !== "notion") {
          return NextResponse.json({ ok: false, error: "unsupported_provider_operation" }, { status: 400 });
        }

        const query = cleanString(operation.query, "");
        if (!query) {
          return NextResponse.json({ ok: false, error: "missing_query" }, { status: 400 });
        }
        const maxResults = normalizeLimit(operation.max_results);

        const result = await executeTool(
          NOTION_SEARCH_PAGES_TOOL,
          executionUserId,
          connectedAccountId,
          {
            query,
            page_size: maxResults,
          }
        );
        const pages = normalizeNotionPages(result, maxResults);

        return cappedJson({
          ok: true,
          provider: providerConfig.id,
          connected_account_id: connectedAccountId || null,
          page_count: pages.length,
          pages,
          source: "composio",
        });
      }

      case "notion_create_page": {
        if (providerConfig.id !== "notion") {
          return NextResponse.json({ ok: false, error: "unsupported_provider_operation" }, { status: 400 });
        }

        const title = cleanString(operation.title, "");
        const parentId = cleanString(operation.parent_id, "");
        const markdown = cleanString(operation.markdown, "");

        if (!title || !parentId) {
          return NextResponse.json({ ok: false, error: "missing_title_or_parent_id" }, { status: 400 });
        }

        const result = await executeTool(
          NOTION_CREATE_PAGE_TOOL,
          executionUserId,
          connectedAccountId,
          {
            title,
            parent_id: parentId,
            ...(markdown ? { markdown } : {}),
          }
        );
        const page = extractNotionPage(result, title);

        return cappedJson({
          ok: true,
          provider: providerConfig.id,
          connected_account_id: connectedAccountId || null,
          page,
          source: "composio",
        });
      }

      case "notion_append_paragraphs": {
        if (providerConfig.id !== "notion") {
          return NextResponse.json({ ok: false, error: "unsupported_provider_operation" }, { status: 400 });
        }

        const blockId = cleanString(operation.block_id, "");
        const paragraphs = Array.isArray(operation.paragraphs)
          ? operation.paragraphs.map((value) => cleanString(value, "")).filter(Boolean)
          : [];

        if (!blockId || !paragraphs.length) {
          return NextResponse.json({ ok: false, error: "missing_block_id_or_paragraphs" }, { status: 400 });
        }

        const children = paragraphs.map((text) => ({
          type: "paragraph",
          object: "block",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: text,
                },
              },
            ],
          },
        }));

        const result = await executeTool(
          NOTION_APPEND_TEXT_BLOCKS_TOOL,
          executionUserId,
          connectedAccountId,
          {
            block_id: blockId,
            children,
          }
        );

        return cappedJson({
          ok: true,
          provider: providerConfig.id,
          connected_account_id: connectedAccountId || null,
          appended_paragraph_count: paragraphs.length,
          raw_result: result,
          source: "composio",
        });
      }

      case "github_list_repositories": {
        if (providerConfig.id !== "github") {
          return NextResponse.json({ ok: false, error: "unsupported_provider_operation" }, { status: 400 });
        }

        const maxResults = normalizeLimit(operation.max_results);
        const result = await executeTool(
          GITHUB_LIST_REPOS_TOOL,
          executionUserId,
          connectedAccountId,
          {
            per_page: maxResults,
            page: 1,
          }
        );
        const repositories = normalizeGitHubRepositories(result, maxResults);

        return cappedJson({
          ok: true,
          provider: providerConfig.id,
          connected_account_id: connectedAccountId || null,
          repository_count: repositories.length,
          repositories,
          source: "composio",
        });
      }

      case "linear_search_issues": {
        if (providerConfig.id !== "linear") {
          return NextResponse.json({ ok: false, error: "unsupported_provider_operation" }, { status: 400 });
        }

        const query = cleanString(operation.query, "");
        const maxResults = normalizeLimit(operation.max_results);

        const result = await executeTool(
          query ? LINEAR_SEARCH_ISSUES_TOOL : LINEAR_LIST_ISSUES_TOOL,
          executionUserId,
          connectedAccountId,
          query
            ? {
                query,
                limit: maxResults,
              }
            : {
                limit: maxResults,
              }
        );
        const issues = normalizeLinearIssues(result, maxResults);

        return cappedJson({
          ok: true,
          provider: providerConfig.id,
          connected_account_id: connectedAccountId || null,
          issue_count: issues.length,
          issues,
          source: "composio",
        });
      }

      case "linear_list_teams": {
        if (providerConfig.id !== "linear") {
          return NextResponse.json({ ok: false, error: "unsupported_provider_operation" }, { status: 400 });
        }

        const maxResults = normalizeLimit(operation.max_results);
        const result = await executeTool(
          LINEAR_LIST_TEAMS_TOOL,
          executionUserId,
          connectedAccountId,
          {
            first: maxResults,
          }
        );
        const teams = extractLinearTeams(result, maxResults);

        return cappedJson({
          ok: true,
          provider: providerConfig.id,
          connected_account_id: connectedAccountId || null,
          team_count: teams.length,
          teams,
          source: "composio",
        });
      }

      case "linear_create_issue": {
        if (providerConfig.id !== "linear") {
          return NextResponse.json({ ok: false, error: "unsupported_provider_operation" }, { status: 400 });
        }

        const title = cleanString(operation.title, "");
        const teamId = cleanString(operation.team_id, "");
        const description = cleanString(operation.body, "");
        const priority = Number(operation.priority) || 0;

        if (!title) {
          return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
        }

        const resolvedTeam = await resolveLinearTeamId({
          explicitTeamId: teamId,
          executionUserId,
          connectedAccountId,
        });

        if (!resolvedTeam.teamId) {
          return NextResponse.json({ ok: false, error: "missing_linear_team" }, { status: 400 });
        }

        const result = await executeTool(
          LINEAR_CREATE_ISSUE_TOOL,
          executionUserId,
          connectedAccountId,
          {
            title,
            team_id: resolvedTeam.teamId,
            ...(description ? { description } : {}),
            ...(priority > 0 ? { priority } : {}),
          }
        );
        const issue = extractLinearIssue(result, title);

        return cappedJson({
          ok: true,
          provider: providerConfig.id,
          connected_account_id: connectedAccountId || null,
          defaulted_team: resolvedTeam.defaulted,
          team: resolvedTeam.team,
          issue,
          source: "composio",
        });
      }

      case "github_create_issue": {
        if (providerConfig.id !== "github") {
          return NextResponse.json({ ok: false, error: "unsupported_provider_operation" }, { status: 400 });
        }

        const owner = cleanString(operation.owner, "");
        const repo = cleanString(operation.repo, "");
        const title = cleanString(operation.title, "");
        const bodyText = cleanString(operation.body, "");

        if (!owner || !repo || !title) {
          return NextResponse.json({ ok: false, error: "missing_owner_repo_or_title" }, { status: 400 });
        }

        const result = await executeTool(
          GITHUB_CREATE_ISSUE_TOOL,
          executionUserId,
          connectedAccountId,
          {
            owner,
            repo,
            title,
            ...(bodyText ? { body: bodyText } : {}),
          }
        );
        const issue = extractGitHubIssue(result, title);

        return cappedJson({
          ok: true,
          provider: providerConfig.id,
          connected_account_id: connectedAccountId || null,
          issue,
          source: "composio",
        });
      }

      case "slack_list_channels": {
        if (providerConfig.id !== "slack") {
          return NextResponse.json({ ok: false, error: "unsupported_provider_operation" }, { status: 400 });
        }

        const maxResults = normalizeLimit(operation.max_results);
        const result = await executeTool(
          SLACK_LIST_CHANNELS_TOOL,
          executionUserId,
          connectedAccountId,
          {
            limit: maxResults,
          }
        );
        const channels = normalizeSlackChannels(result, maxResults);
        const query = cleanString(operation.query, "").toLowerCase();
        const filteredChannels = query
          ? channels.filter((channel) => channel.name.toLowerCase().includes(query))
          : channels;

        return cappedJson({
          ok: true,
          provider: providerConfig.id,
          connected_account_id: connectedAccountId || null,
          channel_count: filteredChannels.length,
          channels: filteredChannels,
          source: "composio",
        });
      }

      case "slack_send_message": {
        if (providerConfig.id !== "slack") {
          return NextResponse.json({ ok: false, error: "unsupported_provider_operation" }, { status: 400 });
        }

        const channel = cleanString(operation.channel, "");
        const text = cleanString(operation.text, "");
        if (!channel || !text) {
          return NextResponse.json({ ok: false, error: "missing_channel_or_text" }, { status: 400 });
        }

        const result = await executeTool(
          SLACK_SEND_MESSAGE_TOOL,
          executionUserId,
          connectedAccountId,
          {
            channel,
            text,
          }
        );
        const message = extractSlackMessage(result, channel);

        return cappedJson({
          ok: true,
          provider: providerConfig.id,
          connected_account_id: connectedAccountId || null,
          message,
          source: "composio",
        });
      }

      default:
        return NextResponse.json({ ok: false, error: "unsupported_operation" }, { status: 400 });
    }
  } catch (error) {
    await markProviderConnectionFailed({
      provider: providerConfig.id,
      connectedAccountId,
      failureCode: error instanceof Error ? error.name : "unknown_error",
      failureMessage: error instanceof Error ? error.message : String(error),
    });

    console.error("Composio broker call failed", {
      provider: providerConfig.id,
      operationType: operation.type,
      executionContext: {
        hasConnectedAccountId: Boolean(connectedAccountId),
        hasSessionId: Boolean(sessionId),
        entityIdPrefix: typeof entityId === "string" ? entityId.slice(0, 12) : null,
        executionUserIdPrefix: executionUserId.slice(0, 12),
        resolvedFromConnectionStore: Boolean(resolvedConnection),
      },
      ...serializeError(error),
    });

    return NextResponse.json(
      {
        ok: false,
        error: "composio_call_failed",
        provider: providerConfig.id,
        operation_type: operation.type,
        details: serializeError(error),
      },
      { status: 502 }
    );
  }
}
