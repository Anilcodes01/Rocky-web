import { NextResponse } from "next/server";

import { getSafeLoopbackRedirectURL } from "../../../../lib/auth";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const redirectURI = getSafeLoopbackRedirectURL(requestUrl.searchParams.get("redirect_uri"));
  const state = requestUrl.searchParams.get("state")?.trim() ?? "";

  if (!redirectURI || !state) {
    return NextResponse.json({ ok: false, error: "invalid_redirect_request" }, { status: 400 });
  }

  const callbackUrl = new URL("/auth/desktop/callback", requestUrl.origin);
  callbackUrl.searchParams.set("redirect_uri", redirectURI);
  callbackUrl.searchParams.set("state", state);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data.url) {
    return NextResponse.json(
      {
        ok: false,
        error: "desktop_login_start_failed",
      },
      { status: 500 }
    );
  }

  return NextResponse.redirect(data.url);
}
