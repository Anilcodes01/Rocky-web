import "server-only";

import { getSiteUrl } from "./env";

export function getComposioCallbackUrl(requestUrl?: string | URL) {
  const explicit = process.env.COMPOSIO_CALLBACK_URL;

  if (explicit) {
    return explicit;
  }

  return `${getSiteUrl(requestUrl)}/oauth/composio/callback`;
}

export function getOAuthStateKey(state: string) {
  return `rocky_composio_state:${state}`;
}

export function getConnectionCodeKey(code: string) {
  return `rocky_connection_code:${code}`;
}

export function isValidDesktopRedirectUri(value: string) {
  try {
    const url = new URL(value);
    const port = Number.parseInt(url.port, 10);

    return (
      url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
      Number.isInteger(port) &&
      port >= 8765 &&
      port <= 8774 &&
      url.pathname.replace(/\/+$/, "") === "/rocky/oauth/callback"
    );
  } catch {
    return false;
  }
}

export function isValidState(value: string | null) {
  return typeof value === "string" && value.trim().length >= 8 && value.length <= 512;
}

export function errorPage(title: string, message: string, status = 400) {
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} | Rocky</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #080b0a;
        color: #fff8de;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        width: min(560px, calc(100% - 32px));
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 8px;
        background: rgba(13, 18, 15, 0.88);
        padding: 28px;
        box-shadow: 0 30px 90px rgba(0, 0, 0, 0.42);
      }
      h1 {
        margin: 0 0 12px;
        font-size: clamp(32px, 7vw, 54px);
        line-height: 0.95;
      }
      p {
        margin: 0;
        color: rgba(255, 250, 240, 0.72);
        font-size: 16px;
        line-height: 1.6;
      }
      a {
        color: #dcff82;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${message}</p>
    </main>
  </body>
</html>`,
    {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    }
  );
}
