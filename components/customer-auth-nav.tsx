"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type CustomerAuthNavState = {
  isReady: boolean;
  isAuthenticated: boolean;
  email: string | null;
};

type CustomerAuthNavProps = {
  iconOnly?: boolean;
  openRequestNonce?: number;
  renderTrigger?: boolean;
};

type MenuIconProps = {
  className?: string;
};

const UserIcon = ({ className = "h-4 w-4" }: MenuIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5.5 19.5c1.8-3.1 4.1-4.6 6.5-4.6s4.7 1.5 6.5 4.6" />
  </svg>
);

const OrdersIcon = ({ className = "h-4 w-4" }: MenuIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M7 4.5h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z" />
    <path d="M9 9.5h6M9 13h6M9 16.5h4" />
  </svg>
);

const HeartIcon = ({ className = "h-4 w-4" }: MenuIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M12 20.3 4.9 13.2a4.6 4.6 0 0 1 0-6.5 4.6 4.6 0 0 1 6.5 0L12 7.3l.6-.6a4.6 4.6 0 0 1 6.5 0 4.6 4.6 0 0 1 0 6.5L12 20.3Z" />
  </svg>
);

const HistoryIcon = ({ className = "h-4 w-4" }: MenuIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M3.5 12A8.5 8.5 0 1 0 6 6.2" />
    <path d="M3.5 4.5v3.7h3.7M12 8v4.4l3 1.9" />
  </svg>
);

const AddressIcon = ({ className = "h-4 w-4" }: MenuIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
    <circle cx="12" cy="11" r="2.2" />
  </svg>
);

const NotificationIcon = ({ className = "h-4 w-4" }: MenuIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M15 18H9m9-1.2A2 2 0 0 1 16.2 15V10a4.2 4.2 0 1 0-8.4 0v5a2 2 0 0 1-1.8 1.8L5 17h14l-1-.2Z" />
    <path d="M10.7 20a1.5 1.5 0 0 0 2.6 0" />
  </svg>
);

const LoginIcon = ({ className = "h-4 w-4" }: MenuIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M11 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h4" />
    <path d="m14 8.5 4 3.5-4 3.5M18 12H9" />
  </svg>
);

const RegisterIcon = ({ className = "h-4 w-4" }: MenuIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M15.5 19.5H7a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h8.5a2 2 0 0 1 2 2V11" />
    <path d="M15.5 5.5V8M14.2 6.8h2.6M16.5 15v6M13.5 18h6" />
  </svg>
);

const LogoutIcon = ({ className = "h-4 w-4" }: MenuIconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M11 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h4" />
    <path d="m14 8.5 4 3.5-4 3.5M18 12H9" />
  </svg>
);

export const CustomerAuthNav = ({
  iconOnly = false,
  openRequestNonce,
  renderTrigger = true,
}: CustomerAuthNavProps) => {
  const [state, setState] = useState<CustomerAuthNavState>({
    isReady: false,
    isAuthenticated: false,
    email: null,
  });
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const firstActionRef = useRef<HTMLAnchorElement | null>(null);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    if (!supabase) {
      setState({ isReady: true, isAuthenticated: false, email: null });
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
        email: data.session?.user.email ?? null,
      });
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        isReady: true,
        isAuthenticated: Boolean(session),
        email: session?.user.email ?? null,
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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeout = window.setTimeout(() => {
      firstActionRef.current?.focus();
    }, 25);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isOpen]);

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

  const authenticatedMenuItems: Array<{
    href: string;
    label: string;
    icon: (props: MenuIconProps) => JSX.Element;
  }> = [
    { href: "/compte", label: "Mon compte", icon: UserIcon },
    { href: "/compte/commandes", label: "Mes commandes", icon: OrdersIcon },
    { href: "/compte/favoris", label: "Favoris", icon: HeartIcon },
    { href: "/compte/historique", label: "Historique", icon: HistoryIcon },
    { href: "/compte/adresses", label: "Adresses", icon: AddressIcon },
    { href: "/compte/notifications", label: "Notifications", icon: NotificationIcon },
  ];

  const guestMenuItems: Array<{
    href: string;
    label: string;
    icon: (props: MenuIconProps) => JSX.Element;
  }> = [
    { href: "/login", label: "Se connecter", icon: LoginIcon },
    { href: "/register", label: "Creer un compte", icon: RegisterIcon },
  ];

  useEffect(() => {
    if (typeof openRequestNonce !== "number") {
      return;
    }

    if (openRequestNonce <= 0) {
      return;
    }

    setIsOpen(true);
  }, [openRequestNonce]);

  if (!state.isReady) {
    return iconOnly ? (
      <div className="h-9 w-9 rounded-full border border-slate-200 bg-slate-100 sm:h-10 sm:w-10" />
    ) : (
      <div className="h-10 w-28 rounded-full border border-slate-200 bg-slate-100" />
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      {renderTrigger ? (
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
            }
          }}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          className={
            iconOnly
              ? "inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-brand-orange hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 sm:h-10 sm:w-10"
              : "inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
          }
        >
          <UserIcon className={iconOnly ? "h-5 w-5" : "h-4 w-4"} />
          {iconOnly ? null : state.isAuthenticated ? "Mon compte" : "Se connecter"}
        </button>
      ) : null}

      <div
        id={menuId}
        className={`fixed inset-0 z-[130] overflow-hidden md:hidden ${isOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!isOpen}
      >
        <button
          type="button"
          onClick={closePanel}
          aria-label="Fermer le panneau du compte"
          className={`fixed inset-0 bg-slate-950/45 backdrop-blur-[1px] transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Mon compte"
          className={`fixed inset-y-0 right-0 flex h-[100dvh] w-full max-w-sm flex-col overflow-y-auto border-l border-slate-200 bg-white p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[-14px_0_42px_rgba(15,23,42,0.2)] transition-transform duration-200 will-change-transform ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2.5">
            <p className="text-sm font-bold text-slate-900">
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

          {state.isAuthenticated ? (
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Compte
              </p>
              <p className="truncate text-xs font-medium text-slate-700">
                {state.email ?? "Utilisateur connecte"}
              </p>
            </div>
          ) : null}

          <div className="space-y-1 text-sm" role="menu">
            {(state.isAuthenticated ? authenticatedMenuItems : guestMenuItems).map(
              (menuItem, index) => {
                const Icon = menuItem.icon;
                return (
                  <Link
                    key={menuItem.href}
                    href={menuItem.href}
                    onClick={closePanel}
                    ref={index === 0 ? firstActionRef : undefined}
                    role="menuitem"
                    className="inline-flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
                  >
                    <Icon className="h-4 w-4 text-slate-500" />
                    <span>{menuItem.label}</span>
                  </Link>
                );
              },
            )}
            {state.isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                role="menuitem"
                className="inline-flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-medium text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <LogoutIcon className="h-4 w-4" />
                <span>{isLoggingOut ? "Deconnexion..." : "Deconnexion"}</span>
              </button>
            ) : null}
          </div>
        </aside>
      </div>

      <div
        className={`absolute right-0 top-[calc(100%+0.45rem)] z-[140] hidden w-[17.5rem] origin-top-right rounded-2xl border border-slate-200 bg-white p-2.5 shadow-[0_14px_30px_rgba(15,23,42,0.12)] transition duration-200 md:block ${
          isOpen
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
        role="menu"
      >
        {state.isAuthenticated ? (
          <div className="mb-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Connecte
            </p>
            <p className="truncate text-xs font-medium text-slate-700">
              {state.email ?? "Utilisateur connecte"}
            </p>
          </div>
        ) : null}

        <div className="space-y-1 text-sm">
          {(state.isAuthenticated ? authenticatedMenuItems : guestMenuItems).map(
            (menuItem, index) => {
              const Icon = menuItem.icon;
              return (
                <Link
                  key={menuItem.href}
                  href={menuItem.href}
                  onClick={closePanel}
                  ref={index === 0 ? firstActionRef : undefined}
                  role="menuitem"
                  className="inline-flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
                >
                  <Icon className="h-4 w-4 text-slate-500" />
                  <span>{menuItem.label}</span>
                </Link>
              );
            },
          )}
          {state.isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              role="menuitem"
              className="inline-flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-medium text-rose-700 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <LogoutIcon className="h-4 w-4" />
              <span>{isLoggingOut ? "Deconnexion..." : "Deconnexion"}</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
