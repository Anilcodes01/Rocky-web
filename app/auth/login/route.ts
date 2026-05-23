import { NextResponse } from "next/server";

import { getSafeNextPath } from "../../../lib/auth";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"), "/");
  const callbackUrl = new URL("/auth/callback", requestUrl.origin);
  callbackUrl.searchParams.set("next", nextPath);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data.url) {
    const redirect = new URL("/", requestUrl.origin);
    redirect.searchParams.set("auth_error", "login_start_failed");
    return NextResponse.redirect(redirect);
  }

  return NextResponse.redirect(data.url);
}
