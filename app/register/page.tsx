"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const resolveNextPath = (value: string | null): string => {
  if (!value) {
    return "/compte/commandes";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/compte/commandes";
  }

  return value;
};

export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextPath, setNextPath] = useState("/compte/commandes");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(resolveNextPath(params.get("next")));
  }, []);

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
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage("Inscription impossible. Merci de verifier les informations.");
        return;
      }

      if (data.session) {
        router.push(nextPath);
        router.refresh();
        return;
      }

      setSuccessMessage(
        "Compte cree. Verifiez votre boite email pour confirmer votre compte, puis connectez-vous.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-padding bg-brand-light">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-7">
        <h1 className="text-2xl font-extrabold text-brand-blue">Creer un compte client</h1>
        <p className="mt-2 text-sm text-slate-600">
          Le compte est optionnel et permet de suivre ou annuler vos commandes eligibles.
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

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Mot de passe
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-orange"
              placeholder="Minimum 6 caracteres"
              autoComplete="new-password"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? "Creation..." : "Creer mon compte"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Vous avez deja un compte ?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="font-semibold text-brand-orange hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </section>
  );
}
