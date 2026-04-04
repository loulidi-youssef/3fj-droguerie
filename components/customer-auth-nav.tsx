"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type CustomerAuthNavState = {
  isReady: boolean;
  isAuthenticated: boolean;
};

export const CustomerAuthNav = () => {
  const [state, setState] = useState<CustomerAuthNavState>({
    isReady: false,
    isAuthenticated: false,
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    if (!supabase) {
      setState({ isReady: true, isAuthenticated: false });
      return;
    }

    let isMounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      setState({
        isReady: true,
        isAuthenticated: Boolean(data.session),
      });
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        isReady: true,
        isAuthenticated: Boolean(session),
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    if (!supabase) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await supabase.auth.signOut();
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!state.isReady) {
    return (
      <div className="h-10 w-24 rounded-full border border-slate-200 bg-slate-100" />
    );
  }

  if (!state.isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange sm:text-sm"
        >
          Connexion
        </Link>
        <Link href="/register" className="btn-primary-pill px-3 py-2 text-xs sm:text-sm">
          Creer compte
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/compte" className="btn-outline-brand rounded-full px-3 py-2 text-xs sm:text-sm">
        Mon compte
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
      >
        {isLoggingOut ? "Deconnexion..." : "Deconnexion"}
      </button>
    </div>
  );
};
