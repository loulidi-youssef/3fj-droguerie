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

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextPath, setNextPath] = useState("/compte/commandes");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(resolveNextPath(params.get("next")));
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    const redirectIfLoggedIn = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (data.session) {
        router.replace(nextPath);
      }
    };

    void redirectIfLoggedIn();

    return () => {
      isMounted = false;
    };
  }, [nextPath, router, supabase]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!supabase) {
      setErrorMessage("Supabase Auth n'est pas configure.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage("Connexion impossible. Verifiez vos identifiants.");
        return;
      }

      router.push(nextPath);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-padding bg-brand-light">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-7">
        <h1 className="text-2xl font-extrabold text-brand-blue">Connexion client</h1>
        <p className="mt-2 text-sm text-slate-600">
          Connectez-vous pour suivre et annuler vos commandes (dans la premiere heure).
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
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-orange"
              placeholder="Votre mot de passe"
              autoComplete="current-password"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Vous n&apos;avez pas de compte ?{" "}
          <Link
            href={`/register?next=${encodeURIComponent(nextPath)}`}
            className="font-semibold text-brand-orange hover:underline"
          >
            Creer un compte
          </Link>
        </p>
      </div>
    </section>
  );
}
