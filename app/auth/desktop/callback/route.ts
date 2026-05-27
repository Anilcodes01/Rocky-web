import { NextResponse } from "next/server";

import { getSafeLoopbackRedirectURL } from "../../../../lib/auth";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state")?.trim() ?? "";
  const redirectURI = getSafeLoopbackRedirectURL(requestUrl.searchParams.get("redirect_uri"));

  if (!code || !state || !redirectURI) {
    return NextResponse.json({ ok: false, error: "invalid_desktop_callback" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    const failedRedirect = new URL(redirectURI);
    failedRedirect.searchParams.set("state", state);
    failedRedirect.searchParams.set("error", "desktop_exchange_failed");
    return NextResponse.redirect(failedRedirect);
  }

  const redirectUrl = new URL(redirectURI);
  redirectUrl.searchParams.set("state", state);
  redirectUrl.searchParams.set("access_token", data.session.access_token);
  redirectUrl.searchParams.set("refresh_token", data.session.refresh_token);
  redirectUrl.searchParams.set("expires_at", String(data.session.expires_at ?? 0));
  redirectUrl.searchParams.set("user_id", data.session.user.id);

  return NextResponse.redirect(redirectUrl);
}
