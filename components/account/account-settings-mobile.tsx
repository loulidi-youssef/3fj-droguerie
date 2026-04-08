"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ACCOUNT_MENU_ITEMS,
  MOBILE_ACCOUNT_SECTIONS,
  type AccountMenuKey,
  type LanguageCode,
} from "@/components/account/account-config";
import {
  AccountMenuIcon,
  ChevronRightIcon,
} from "@/components/account/account-icons";
import { LanguageSelector } from "@/components/account/language-selector";

type AccountSettingsMobileProps = {
  email: string | null;
  activeKey: AccountMenuKey;
  selectedLanguage: LanguageCode;
  selectedLanguageLabel: string;
  onLanguageChange: (code: LanguageCode) => void;
  onLogout: () => void;
  isLoggingOut: boolean;
  scaffoldedMessage: string | null;
};

const getRowClassName = (isActive: boolean) => {
  return `group flex min-h-[3.5rem] w-full items-center gap-3 px-3.5 text-left text-[0.95rem] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/35 ${
    isActive
      ? "bg-brand-blue/10 text-brand-blue"
      : "text-slate-700 hover:bg-slate-50 active:bg-slate-100"
  }`;
};

export const AccountSettingsMobile = ({
  email,
  activeKey,
  selectedLanguage,
  selectedLanguageLabel,
  onLanguageChange,
  onLogout,
  isLoggingOut,
  scaffoldedMessage,
}: AccountSettingsMobileProps) => {
  const [isLanguageSelectorOpen, setIsLanguageSelectorOpen] = useState(false);

  const itemsByKey = useMemo(
    () => new Map(ACCOUNT_MENU_ITEMS.map((item) => [item.key, item])),
    [],
  );

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-8 pt-3">
      <header className="pb-3">
        <h1 className="text-[1.55rem] font-extrabold tracking-tight text-brand-blue">Mon compte</h1>
        <p className="mt-1 text-sm text-slate-600">Paramètres et préférences de votre compte client.</p>
        <p className="mt-1 truncate text-xs font-medium text-slate-500">{email ?? "Session active"}</p>
      </header>

      {scaffoldedMessage ? (
        <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
          {scaffoldedMessage}
        </p>
      ) : null}

      <div className="space-y-4">
        {MOBILE_ACCOUNT_SECTIONS.map((section) => {
          return (
            <section key={section.title} aria-label={section.title}>
              <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {section.title}
              </p>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                {section.keys.map((itemKey, index) => {
                  const item = itemsByKey.get(itemKey);
                  if (!item) {
                    return null;
                  }

                  const isActive = activeKey === item.key;
                  const rowClassName = getRowClassName(isActive);
                  const withDividerClassName =
                    index > 0 ? "border-t border-slate-100" : "";

                  if (item.key === "language") {
                    return (
                      <div key={item.key} className={withDividerClassName}>
                        <button
                          type="button"
                          onClick={() => setIsLanguageSelectorOpen(true)}
                          className={rowClassName}
                          aria-haspopup="dialog"
                          aria-expanded={isLanguageSelectorOpen}
                        >
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
                          <span className="ml-auto mr-1 text-xs font-semibold text-slate-500">
                            {selectedLanguageLabel}
                          </span>
                          <ChevronRightIcon className="h-4 w-4 text-slate-400" />
                        </button>
                      </div>
                    );
                  }

                  if (item.key === "logout") {
                    return (
                      <div key={item.key} className={withDividerClassName}>
                        <button
                          type="button"
                          onClick={onLogout}
                          disabled={isLoggingOut}
                          className={`${rowClassName} disabled:cursor-not-allowed disabled:opacity-65`}
                        >
                          <span
                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                              isActive
                                ? "bg-brand-blue/15 text-brand-blue"
                                : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                            }`}
                          >
                            <AccountMenuIcon name={item.icon} />
                          </span>
                          <span className="truncate">
                            {isLoggingOut ? "Déconnexion..." : item.label}
                          </span>
                          <ChevronRightIcon className="ml-auto h-4 w-4 text-slate-400" />
                        </button>
                      </div>
                    );
                  }

                  if (item.type === "link") {
                    return (
                      <div key={item.key} className={withDividerClassName}>
                        <Link href={item.href} className={rowClassName}>
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
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </section>
          );
        })}
      </div>

      <LanguageSelector
        mode="mobile"
        isOpen={isLanguageSelectorOpen}
        selectedLanguage={selectedLanguage}
        onSelect={onLanguageChange}
        onClose={() => setIsLanguageSelectorOpen(false)}
      />
    </div>
  );
};

