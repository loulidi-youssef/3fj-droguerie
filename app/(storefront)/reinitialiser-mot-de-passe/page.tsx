"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type ResetSessionStatus = "checking" | "ready" | "invalid";

const readRecoveryErrorFromUrl = (): string | null => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  const errorDescription =
    searchParams.get("error_description") ?? hashParams.get("error_description");

  if (!errorDescription) {
    return null;
  }

  return decodeURIComponent(errorDescription.replace(/\+/g, " "));
};

const mapResetUpdateErrorMessage = (rawMessage: string): string => {
  const message = rawMessage.toLowerCase();

  if (message.includes("password should be at least") || message.includes("weak")) {
    return "Mot de passe trop faible. Utilisez au moins 6 caracteres.";
  }

  if (message.includes("same password")) {
    return "Choisissez un nouveau mot de passe different de l'ancien.";
  }

  if (message.includes("session") || message.includes("expired") || message.includes("invalid")) {
    return "Lien invalide ou expire. Demandez un nouveau lien de reinitialisation.";
  }

  return "Impossible de mettre a jour le mot de passe pour le moment.";
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [status, setStatus] = useState<ResetSessionStatus>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!supabase) {
        setStatus("invalid");
        setErrorMessage("Supabase Auth n'est pas configure.");
        return;
      }

      const urlErrorMessage = readRecoveryErrorFromUrl();
      if (urlErrorMessage) {
        setStatus("invalid");
        setErrorMessage("Lien invalide ou expire. Demandez un nouveau lien de reinitialisation.");
        return;
      }

      const tryResolveSession = async (): Promise<boolean> => {
        const { data } = await supabase.auth.getSession();
        return Boolean(data.session);
      };

      const hasSessionNow = await tryResolveSession();
      if (hasSessionNow) {
        setStatus("ready");
        return;
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, 300);
      });

      const hasSessionAfterDelay = await tryResolveSession();
      if (hasSessionAfterDelay) {
        setStatus("ready");
        return;
      }

      setStatus("invalid");
      setErrorMessage("Lien invalide ou expire. Demandez un nouveau lien de reinitialisation.");
    };

    void run();
  }, [supabase]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!supabase) {
      setErrorMessage("Supabase Auth n'est pas configure.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Mot de passe trop court. Minimum 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMessage(mapResetUpdateErrorMessage(error.message ?? ""));
        return;
      }

      setSuccessMessage("Mot de passe mis a jour avec succes. Redirection vers la connexion...");
      window.setTimeout(() => {
        router.replace("/login?reset=success");
      }, 800);
    } catch {
      setErrorMessage("Une erreur technique est survenue. Merci de reessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-padding bg-brand-light">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-7">
        <h1 className="text-2xl font-extrabold text-brand-blue">Reinitialiser le mot de passe</h1>
        <p className="mt-2 text-sm text-slate-600">
          Definissez un nouveau mot de passe pour votre compte.
        </p>

        {status === "checking" ? (
          <p className="mt-5 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
            Verification du lien...
          </p>
        ) : status === "invalid" ? (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <p className="font-semibold">Lien invalide</p>
            <p className="mt-1">
              {errorMessage ?? "Lien invalide ou expire. Demandez un nouveau lien."}
            </p>
            <Link
              href="/mot-de-passe-oublie"
              className="mt-2 inline-flex font-semibold text-brand-orange hover:underline"
            >
              Demander un nouveau lien
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Nouveau mot de passe
              </span>
              <div className="relative mt-1">
                <input
                  type={isPasswordVisible ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 pr-10 text-sm text-slate-700 outline-none focus:border-brand-orange"
                  placeholder="Minimum 6 caracteres"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible((current) => !current)}
                  className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-slate-500 transition hover:text-brand-blue"
                  aria-label={isPasswordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {isPasswordVisible ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M3 4.5l18 15" />
                      <path d="M10.7 10.2A2.8 2.8 0 0012 15a2.8 2.8 0 002.7-1.9" />
                      <path d="M9.9 5.2A10.7 10.7 0 0121 12a10.9 10.9 0 01-3.9 4.7" />
                      <path d="M6.5 7.3A10.8 10.8 0 003 12a10.8 10.8 0 005.5 6.3" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                      <circle cx="12" cy="12" r="2.8" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Confirmer le mot de passe
              </span>
              <input
                type={isPasswordVisible ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-orange"
                placeholder="Retapez le mot de passe"
                autoComplete="new-password"
              />
            </label>

            {errorMessage ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <p className="font-semibold">Mise a jour impossible</p>
                <p className="mt-1">{errorMessage}</p>
              </div>
            ) : null}

            {successMessage ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
                {successMessage}
              </p>
            ) : null}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? "Mise a jour..." : "Mettre a jour le mot de passe"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
