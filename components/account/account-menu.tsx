"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ACCOUNT_MENU_ITEMS,
  type AccountMenuKey,
  type LanguageCode,
} from "@/components/account/account-config";
import {
  AccountMenuIcon,
  ChevronRightIcon,
} from "@/components/account/account-icons";
import { LanguageSelector } from "@/components/account/language-selector";

type AccountMenuDesktopProps = {
  email: string | null;
  activeKey: AccountMenuKey;
  selectedLanguage: LanguageCode;
  selectedLanguageLabel: string;
  onLanguageChange: (code: LanguageCode) => void;
  onLogout: () => void;
  isLoggingOut: boolean;
};

const getRowClassName = (isActive: boolean) => {
  return `group flex min-h-[3.1rem] w-full items-center gap-3 rounded-xl px-3.5 py-2 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/35 ${
    isActive
      ? "bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/20"
      : "text-slate-700 hover:bg-slate-50"
  }`;
};

export const AccountMenuDesktop = ({
  email,
  activeKey,
  selectedLanguage,
  selectedLanguageLabel,
  onLanguageChange,
  onLogout,
  isLoggingOut,
}: AccountMenuDesktopProps) => {
  const [isLanguageSelectorOpen, setIsLanguageSelectorOpen] = useState(false);

  const regularItems = useMemo(
    () => ACCOUNT_MENU_ITEMS.filter((item) => item.key !== "logout"),
    [],
  );
  const logoutItem = useMemo(
    () => ACCOUNT_MENU_ITEMS.find((item) => item.key === "logout"),
    [],
  );

  return (
    <aside className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.08)]">
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Compte client</p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-900">
          {email ?? "Session active"}
        </p>
      </div>

      <nav aria-label="Navigation du compte" className="mt-3 space-y-1">
        {regularItems.map((item) => {
          const isActive = activeKey === item.key;

          if (item.key === "language") {
            return (
              <div key={item.key} className="relative">
                <button
                  type="button"
                  onClick={() => setIsLanguageSelectorOpen((current) => !current)}
                  className={getRowClassName(isActive || isLanguageSelectorOpen)}
                  aria-expanded={isLanguageSelectorOpen}
                  aria-haspopup="dialog"
                >
                  <span
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      isActive || isLanguageSelectorOpen
                        ? "bg-brand-blue/15 text-brand-blue"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                    }`}
                  >
                    <AccountMenuIcon name={item.icon} />
                  </span>
                  <span className="truncate">{item.label}</span>
                  <span className="ml-auto mr-1 text-xs font-semibold text-slate-500">
                    {selectedLanguageLabel}
                  </span>
                  <ChevronRightIcon className="h-4 w-4 text-slate-400" />
                </button>
                <LanguageSelector
                  mode="desktop"
                  isOpen={isLanguageSelectorOpen}
                  selectedLanguage={selectedLanguage}
                  onSelect={onLanguageChange}
                  onClose={() => setIsLanguageSelectorOpen(false)}
                />
              </div>
            );
          }

          if (item.type === "link") {
            return (
              <Link key={item.key} href={item.href} className={getRowClassName(isActive)}>
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    isActive
                      ? "bg-brand-blue/15 text-brand-blue"
                      : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                  }`}
                >
                  <AccountMenuIcon name={item.icon} />
                </span>
                <span className="truncate">{item.label}</span>
                <ChevronRightIcon className="ml-auto h-4 w-4 text-slate-400" />
              </Link>
            );
          }

          return null;
        })}
      </nav>

      {logoutItem ? (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="group flex min-h-[3.1rem] w-full items-center gap-3 rounded-xl px-3.5 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/35 disabled:cursor-not-allowed disabled:opacity-65"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-slate-200">
              <AccountMenuIcon name={logoutItem.icon} />
            </span>
            <span className="truncate">
              {isLoggingOut ? "Déconnexion..." : logoutItem.label}
            </span>
            <ChevronRightIcon className="ml-auto h-4 w-4 text-slate-400" />
          </button>
        </div>
      ) : null}
    </aside>
  );
};

