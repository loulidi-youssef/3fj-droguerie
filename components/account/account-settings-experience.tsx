"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACCOUNT_LANGUAGE_STORAGE_KEY,
  ACCOUNT_SCAFFOLDED_MESSAGES,
  DEFAULT_LANGUAGE_CODE,
  getActiveAccountMenuKey,
  getLanguageLabel,
  type LanguageCode,
} from "@/components/account/account-config";
import { AccountDashboardDesktop } from "@/components/account/account-dashboard-desktop";
import { AccountSettingsMobile } from "@/components/account/account-settings-mobile";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthState = {
  isLoading: boolean;
  email: string | null;
};

const resolveAccountPath = (pathname: string | null): string => {
  if (pathname && pathname.startsWith("/compte")) {
    return pathname;
  }

  return "/compte";
};

const getDocumentLanguage = (code: LanguageCode): string => {
  if (code === "ar") {
    return "ar";
  }

  if (code === "en") {
    return "en";
  }

  if (code === "es") {
    return "es";
  }

  return "fr";
};

export const AccountSettingsExperience = () => {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    email: null,
  });
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(
    DEFAULT_LANGUAGE_CODE,
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isManualLogoutRef = useRef(false);

  const accountPath = useMemo(() => resolveAccountPath(pathname), [pathname]);
  const activeKey = useMemo(() => getActiveAccountMenuKey(pathname), [pathname]);
  const scaffoldedMessage = ACCOUNT_SCAFFOLDED_MESSAGES[activeKey] ?? null;
  const selectedLanguageLabel = getLanguageLabel(selectedLanguage);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(ACCOUNT_LANGUAGE_STORAGE_KEY);
      if (!raw) {
        document.documentElement.lang = getDocumentLanguage(DEFAULT_LANGUAGE_CODE);
        return;
      }

      if (raw === "fr" || raw === "ar" || raw === "en" || raw === "es") {
        setSelectedLanguage(raw);
        document.documentElement.lang = getDocumentLanguage(raw);
        return;
      }
    } catch {
      // Ignore localStorage read errors and keep default.
    }

    document.documentElement.lang = getDocumentLanguage(DEFAULT_LANGUAGE_CODE);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(ACCOUNT_LANGUAGE_STORAGE_KEY, selectedLanguage);
    } catch {
      // Ignore localStorage write errors.
    }

    document.documentElement.lang = getDocumentLanguage(selectedLanguage);
  }, [selectedLanguage]);

  useEffect(() => {
    if (!supabase) {
      router.replace(`/login?next=${encodeURIComponent(accountPath)}`);
      return;
    }

    let isMounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (!data.session) {
        if (!isManualLogoutRef.current) {
          router.replace(`/login?next=${encodeURIComponent(accountPath)}`);
        }
        return;
      }

      setAuthState({
        isLoading: false,
        email: data.session.user.email ?? null,
      });
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (!isManualLogoutRef.current) {
          router.replace(`/login?next=${encodeURIComponent(accountPath)}`);
        }
        return;
      }

      setAuthState({
        isLoading: false,
        email: session.user.email ?? null,
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [accountPath, router, supabase]);

  const handleLogout = async () => {
    if (!supabase) {
      return;
    }

    setIsLoggingOut(true);
    isManualLogoutRef.current = true;

    try {
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      isManualLogoutRef.current = false;
      setIsLoggingOut(false);
    }
  };

  if (authState.isLoading) {
    return (
      <section className="section-padding bg-brand-light">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-5 lg:px-6">
          <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-card">
            Chargement de votre espace compte...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding bg-brand-light">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-5 lg:px-6">
        <div className="hidden md:block">
          <header className="pb-5">
            <h1 className="text-[2rem] font-extrabold tracking-tight text-brand-blue xl:text-[2.2rem]">
              Mon compte
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Paramètres, navigation du compte et historique de consultation.
            </p>
          </header>

          {scaffoldedMessage ? (
            <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {scaffoldedMessage}
            </p>
          ) : null}

          <AccountDashboardDesktop
            email={authState.email}
            activeKey={activeKey}
            selectedLanguage={selectedLanguage}
            selectedLanguageLabel={selectedLanguageLabel}
            onLanguageChange={setSelectedLanguage}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
          />
        </div>

        <div className="md:hidden">
          <AccountSettingsMobile
            email={authState.email}
            activeKey={activeKey}
            selectedLanguage={selectedLanguage}
            selectedLanguageLabel={selectedLanguageLabel}
            onLanguageChange={setSelectedLanguage}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
            scaffoldedMessage={scaffoldedMessage}
          />
        </div>
      </div>
    </section>
  );
};

