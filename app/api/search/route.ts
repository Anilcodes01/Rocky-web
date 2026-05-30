import { NextResponse } from "next/server";

import {
  searchWithSerper,
  type SerperSearchMode,
  type SerperSearchResult,
} from "@/lib/search/serper";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

type SearchRequestBody = {
  query?: unknown;
  mode?: unknown;
  max_results?: unknown;
} | null;

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

function normalizeMode(value: unknown): SerperSearchMode {
  if (value === "news" || value === "images") {
    return value;
  }

  return "search";
}

function normalizeMaxResults(value: unknown) {
  if (value === undefined || value === null) {
    return 6;
  }

  if (typeof value === "number" && Number.isInteger(value)) {
    return Math.min(Math.max(value, 1), 8);
  }

  return Number.NaN;
}

function normalizeResultsForPrompt(results: SerperSearchResult[]) {
  return results.map((result, index) => ({
    rank: index + 1,
    title: result.title,
    url: result.url,
    snippet: result.snippet,
    source: result.source ?? null,
    date: result.date ?? null,
    type: result.type,
  }));
}

export async function POST(request: Request) {
  let body: SearchRequestBody = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_query",
        message: "A non-empty search query is required.",
      },
      { status: 400 }
    );
  }

  const maxResults = normalizeMaxResults(body?.max_results);
  if (Number.isNaN(maxResults)) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_max_results",
        message: "max_results must be an integer between 1 and 8.",
      },
      { status: 400 }
    );
  }

  try {
    await requireAuthenticatedUser(request);

    const mode = normalizeMode(body?.mode);
    const results = await searchWithSerper({
      query,
      mode,
      maxResults,
    });

    return NextResponse.json({
      ok: true,
      query,
      mode,
      results,
      prompt_context: normalizeResultsForPrompt(results),
    });
  } catch (error) {
    return buildErrorResponse(error, "web_search_failed");
  }
}
