"use client";

import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "../lib/supabase/browser";

type AuthState = {
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
};

export function AuthDock() {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const syncUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        setAuthState(null);
        setIsLoading(false);
        return;
      }

      setAuthState({
        email: user.email ?? null,
        fullName:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : typeof user.user_metadata?.name === "string"
              ? user.user_metadata.name
              : null,
        avatarUrl:
          typeof user.user_metadata?.avatar_url === "string"
            ? user.user_metadata.avatar_url
            : null,
      });
      setIsLoading(false);
    };

    void syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="absolute right-4 top-4 z-30 sm:right-6 sm:top-6">
      <div className="flex items-center gap-3 rounded-full border border-white/12 bg-black/45 px-3 py-2 text-white shadow-[0_18px_42px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        {authState?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={authState.avatarUrl}
            alt={authState.fullName || authState.email || "Rocky user"}
            className="h-9 w-9 rounded-full border border-white/15 object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/8 text-sm font-semibold text-white/90">
            {authState?.fullName?.[0] || authState?.email?.[0]?.toUpperCase() || "R"}
          </div>
        )}

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
            Rocky account
          </p>
          <p className="truncate text-sm font-medium text-white/90">
            {isLoading
              ? "Checking sign-in..."
              : authState?.fullName || authState?.email || "Not signed in"}
          </p>
        </div>

        {authState ? (
          <a
            href="/auth/logout"
            className="rounded-full border border-white/12 bg-white/8 px-3 py-2 text-sm font-medium text-white/88 transition hover:bg-white/12"
          >
            Sign out
          </a>
        ) : (
          <a
            href="/auth/login?next=/"
            className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            Sign in with Google
          </a>
        )}
      </div>
    </div>
  );
}
