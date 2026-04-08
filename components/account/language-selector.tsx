"use client";

import { useEffect } from "react";
import {
  LANGUAGE_OPTIONS,
  type LanguageCode,
} from "@/components/account/account-config";
import { CheckIcon } from "@/components/account/account-icons";

type LanguageSelectorProps = {
  mode: "desktop" | "mobile";
  isOpen: boolean;
  selectedLanguage: LanguageCode;
  onSelect: (code: LanguageCode) => void;
  onClose: () => void;
};

export const LanguageSelector = ({
  mode,
  isOpen,
  selectedLanguage,
  onSelect,
  onClose,
}: LanguageSelectorProps) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  if (mode === "desktop") {
    return (
      <>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le sélecteur de langue"
          className="fixed inset-0 z-20 cursor-default"
        />
        <div
          role="dialog"
          aria-label="Choisir la langue"
          className="absolute right-0 top-[calc(100%+0.45rem)] z-30 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_38px_rgba(15,23,42,0.14)]"
        >
          <p className="px-2 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Langue
          </p>
          <div className="space-y-0.5">
            {LANGUAGE_OPTIONS.map((language) => {
              const isActive = selectedLanguage === language.code;

              return (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => {
                    onSelect(language.code);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/35 ${
                    isActive
                      ? "bg-brand-blue/10 text-brand-blue"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{language.label}</span>
                  {isActive ? <CheckIcon className="h-4 w-4" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[120] md:hidden">
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer le sélecteur de langue"
        className="absolute inset-0 bg-slate-950/45"
      />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-16px_40px_rgba(15,23,42,0.22)]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
        <p className="text-sm font-semibold text-slate-900">Choisir la langue</p>
        <div className="mt-3 space-y-1">
          {LANGUAGE_OPTIONS.map((language) => {
            const isActive = selectedLanguage === language.code;

            return (
              <button
                key={language.code}
                type="button"
                onClick={() => {
                  onSelect(language.code);
                  onClose();
                }}
                className={`flex min-h-[3.25rem] w-full items-center justify-between rounded-2xl px-3.5 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/35 ${
                  isActive
                    ? "bg-brand-blue/10 text-brand-blue"
                    : "text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                }`}
              >
                <span>{language.label}</span>
                {isActive ? <CheckIcon className="h-4 w-4" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
