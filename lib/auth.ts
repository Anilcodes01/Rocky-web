import "server-only";

export function getSafeNextPath(value: string | null | undefined, fallback = "/") {
  if (!value) {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function getSafeLoopbackRedirectURL(
  value: string | null | undefined,
  fallback?: string | null
) {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate) {
    return fallback ?? null;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:") {
      return fallback ?? null;
    }

    const hostname = url.hostname.toLowerCase();
    if (hostname !== "127.0.0.1" && hostname !== "localhost") {
      return fallback ?? null;
    }

    return url.toString();
  } catch {
    return fallback ?? null;
  }
}
