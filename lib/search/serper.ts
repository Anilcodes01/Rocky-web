import "server-only";

import { getServerEnv } from "../env";

export type SerperSearchMode = "search" | "news" | "images";

export type SerperSearchResultType = "organic" | "news" | "image";

export type SerperSearchResult = {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  date?: string;
  type: SerperSearchResultType;
};

type SerperSearchOptions = {
  query: string;
  mode?: SerperSearchMode;
  maxResults?: number;
};

type SerperOrganicItem = {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
};

type SerperNewsItem = {
  title?: string;
  link?: string;
  snippet?: string;
  source?: string;
  date?: string;
};

type SerperImageItem = {
  title?: string;
  link?: string;
  source?: string;
  imageUrl?: string;
};

type SerperSearchResponse = {
  organic?: SerperOrganicItem[];
  news?: SerperNewsItem[];
  images?: SerperImageItem[];
};

const SERPER_ENDPOINTS: Record<SerperSearchMode, string> = {
  search: "https://google.serper.dev/search",
  news: "https://google.serper.dev/news",
  images: "https://google.serper.dev/images",
};

function normalizeSearchResult(
  item: SerperOrganicItem | SerperNewsItem | SerperImageItem,
  type: SerperSearchResultType
) {
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const url = typeof item.link === "string" ? item.link.trim() : "";

  if (!title || !url) {
    return null;
  }

  let snippet = "";
  let source: string | undefined;
  let date: string | undefined;

  if (type === "image") {
    const imageItem = item as SerperImageItem;
    snippet = typeof imageItem.imageUrl === "string" ? imageItem.imageUrl.trim() : "";
    source = typeof imageItem.source === "string" ? imageItem.source.trim() || undefined : undefined;
  } else if (type === "news") {
    const newsItem = item as SerperNewsItem;
    snippet = typeof newsItem.snippet === "string" ? newsItem.snippet.trim() : "";
    source = typeof newsItem.source === "string" ? newsItem.source.trim() || undefined : undefined;
    date = typeof newsItem.date === "string" ? newsItem.date.trim() || undefined : undefined;
  } else {
    const organicItem = item as SerperOrganicItem;
    snippet = typeof organicItem.snippet === "string" ? organicItem.snippet.trim() : "";
    date = typeof organicItem.date === "string" ? organicItem.date.trim() || undefined : undefined;
  }

  return {
    title,
    url,
    snippet,
    source,
    date,
    type,
  } satisfies SerperSearchResult;
}

export async function searchWithSerper({
  query,
  mode = "search",
  maxResults = 6,
}: SerperSearchOptions): Promise<SerperSearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const env = getServerEnv();
  const apiKey = env.SERPER_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("SERPER_API_KEY is not configured.");
  }

  const normalizedMaxResults = Math.min(Math.max(maxResults, 1), 8);
  const endpoint = SERPER_ENDPOINTS[mode];

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({
      q: trimmedQuery,
      num: normalizedMaxResults,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Serper request failed (${response.status}): ${payload || "Unknown error"}`);
  }

  const payload = (await response.json()) as SerperSearchResponse;

  const items: Array<SerperSearchResult | null> =
    mode === "news"
      ? (payload.news ?? []).map((item) => normalizeSearchResult(item, "news"))
      : mode === "images"
        ? (payload.images ?? []).map((item) => normalizeSearchResult(item, "image"))
        : (payload.organic ?? []).map((item) => normalizeSearchResult(item, "organic"));

  return items.filter((item): item is SerperSearchResult => item !== null).slice(0, normalizedMaxResults);
}
