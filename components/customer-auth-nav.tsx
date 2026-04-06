"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type CustomerAuthNavState = {
  isReady: boolean;
  isAuthenticated: boolean;
};

type CustomerAuthNavProps = {
  iconOnly?: boolean;
};

export const CustomerAuthNav = ({ iconOnly = false }: CustomerAuthNavProps) => {
  const [state, setState] = useState<CustomerAuthNavState>({
    isReady: false,
    isAuthenticated: false,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
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
      setIsOpen(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (dropdownRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const handleLogout = async () => {
    if (!supabase) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await supabase.auth.signOut();
      setIsOpen(false);
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }

    if (!window.matchMedia("(max-width: 767px)").matches) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const closePanel = () => {
    setIsOpen(false);
  };

  if (!state.isReady) {
    return iconOnly ? (
      <div className="h-10 w-10 rounded-full border border-slate-200 bg-slate-100" />
    ) : (
      <div className="h-10 w-28 rounded-full border border-slate-200 bg-slate-100" />
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls="customer-account-menu"
        className={
          iconOnly
            ? "inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
            : "inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
        }
      >
        <svg
          viewBox="0 0 24 24"
          className={iconOnly ? "h-5 w-5" : "h-4 w-4"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 19.5c1.8-3.1 4.1-4.6 6.5-4.6s4.7 1.5 6.5 4.6" />
        </svg>
        {iconOnly ? null : state.isAuthenticated ? "Mon compte" : "Se connecter"}
      </button>

      <div
        id="customer-account-menu"
        className={`fixed inset-0 z-[130] md:hidden ${isOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!isOpen}
      >
        <button
          type="button"
          onClick={closePanel}
          aria-label="Fermer le panneau du compte"
          className={`absolute inset-0 bg-slate-950/45 transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Mon compte"
          className={`absolute inset-y-0 right-0 flex h-full w-full max-w-sm flex-col border-l border-slate-200 bg-white p-4 shadow-[-14px_0_42px_rgba(15,23,42,0.2)] transition-transform duration-300 ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
            <p className="text-base font-bold text-slate-900">
              {state.isAuthenticated ? "Mon compte" : "Se connecter"}
            </p>
            <button
              type="button"
              onClick={closePanel}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
              aria-label="Fermer"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          {!state.isAuthenticated ? (
            <div className="space-y-2">
              <Link href="/login" onClick={closePanel} className="btn-primary w-full">
                Se connecter
              </Link>
              <Link
                href="/register"
                onClick={closePanel}
                className="block text-center text-sm font-semibold text-slate-600 hover:text-brand-orange hover:underline"
              >
                Creer un compte
              </Link>
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              <Link
                href="/compte"
                onClick={closePanel}
                className="block rounded-xl px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Votre compte
              </Link>
              <Link
                href="/compte/commandes"
                onClick={closePanel}
                className="block rounded-xl px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Vos commandes
              </Link>
              <Link
                href="/compte/favoris"
                onClick={closePanel}
                className="block rounded-xl px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Favoris
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="block w-full rounded-xl px-3 py-2 text-left font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoggingOut ? "Deconnexion..." : "Se deconnecter"}
              </button>
            </div>
          )}
        </aside>
      </div>

      <div
        className={`absolute right-0 top-full z-[90] mt-2 hidden w-60 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl md:block ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {!state.isAuthenticated ? (
          <div className="space-y-2">
            <Link
              href="/login"
              onClick={closePanel}
              className="btn-primary w-full"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              onClick={closePanel}
              className="block text-center text-xs font-semibold text-slate-600 hover:text-brand-orange hover:underline"
            >
              Creer un compte
            </Link>
          </div>
        ) : (
          <div className="space-y-1 text-sm">
            <Link
              href="/compte"
              onClick={closePanel}
              className="block rounded-xl px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Votre compte
            </Link>
            <Link
              href="/compte/commandes"
              onClick={closePanel}
              className="block rounded-xl px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Vos commandes
            </Link>
            <Link
              href="/compte/favoris"
              onClick={closePanel}
              className="block rounded-xl px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Favoris
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="block w-full rounded-xl px-3 py-2 text-left font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoggingOut ? "Deconnexion..." : "Se deconnecter"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
