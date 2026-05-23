import "server-only";

import { Composio } from "@composio/core";

let composio: Composio | null = null;

export function hasComposioConfig() {
  return Boolean(process.env.COMPOSIO_API_KEY);
}

export function getComposio() {
  if (!process.env.COMPOSIO_API_KEY) {
    throw new Error("COMPOSIO_API_KEY is not configured.");
  }

  if (!composio) {
    composio = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY,
      allowTracking: false,
      disableVersionCheck: true,
    });
  }

  return composio;
}
