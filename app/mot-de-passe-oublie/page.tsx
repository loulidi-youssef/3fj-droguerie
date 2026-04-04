"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const mapResetRequestErrorMessage = (rawMessage: string): string => {
  const message = rawMessage.toLowerCase();

  if (message.includes("invalid email")) {
    return "Adresse email invalide. Verifiez le format puis reessayez.";
  }

  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Trop de demandes en peu de temps. Merci de patienter puis reessayer.";
  }

  if (message.includes("signup is disabled") || message.includes("not allowed")) {
    return "Le service est temporairement indisponible. Merci de reessayer plus tard.";
  }

  return "Impossible d'envoyer le lien de reinitialisation pour le moment.";
};

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!supabase) {
      setErrorMessage("Supabase Auth n'est pas configure.");
      return;
    }

    setIsSubmitting(true);

    try {
      const redirectTo = `${window.location.origin}/reinitialiser-mot-de-passe`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        setErrorMessage(mapResetRequestErrorMessage(error.message ?? ""));
        return;
      }

      setSuccessMessage(
        "Si un compte existe pour cet email, un lien de reinitialisation vient d'etre envoye.",
      );
    } catch {
      setErrorMessage("Une erreur technique est survenue. Merci de reessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-padding bg-brand-light">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-7">
        <h1 className="text-2xl font-extrabold text-brand-blue">Mot de passe oublie</h1>
        <p className="mt-2 text-sm text-slate-600">
          Entrez votre email pour recevoir un lien de reinitialisation.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-orange"
              placeholder="vous@email.com"
              autoComplete="email"
            />
          </label>

          {errorMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <p className="font-semibold">Envoi impossible</p>
              <p className="mt-1">{errorMessage}</p>
            </div>
          ) : null}

          {successMessage ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? "Envoi..." : "Envoyer le lien"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Retour a la page{" "}
          <Link href="/login" className="font-semibold text-brand-orange hover:underline">
            Connexion
          </Link>
        </p>
      </div>
    </section>
  );
}
