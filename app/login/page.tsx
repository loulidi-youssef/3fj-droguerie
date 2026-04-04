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
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [nextPath, setNextPath] = useState("/compte/commandes");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(resolveNextPath(params.get("next")));

    if (params.get("reset") === "success") {
      setInfoMessage("Mot de passe mis a jour avec succes. Vous pouvez maintenant vous connecter.");
    }
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

  const isValidEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const normalizePhone = (value: string): string | null => {
    const compact = value.replace(/[^\d+]/g, "");
    const withPlus = compact.startsWith("00") ? `+${compact.slice(2)}` : compact;

    // Local Moroccan number like 06XXXXXXXX -> +2126XXXXXXXX
    if (/^0\d{9}$/.test(withPlus)) {
      return `+212${withPlus.slice(1)}`;
    }

    // National format without +, e.g. 2126XXXXXXXX
    if (/^212\d{9}$/.test(withPlus)) {
      return `+${withPlus}`;
    }

    if (!/^\+?\d{8,15}$/.test(withPlus)) {
      return null;
    }

    return withPlus.startsWith("+") ? withPlus : `+${withPlus}`;
  };

  const mapLoginErrorMessage = (rawMessage: string, isPhoneAttempt: boolean): string => {
    const message = rawMessage.toLowerCase();

    if (message.includes("invalid login credentials")) {
      if (isPhoneAttempt) {
        return "Connexion telephone impossible. Verifiez le numero, le mot de passe et l'activation de Phone Auth dans Supabase.";
      }
      return "Connexion impossible. Verifiez vos identifiants.";
    }

    if (message.includes("phone logins are disabled") || message.includes("unsupported phone provider")) {
      return "Connexion par telephone non activee. Activez Phone Auth dans Supabase pour l'utiliser.";
    }

    if (message.includes("email logins are disabled")) {
      return "Connexion email non activee dans Supabase.";
    }

    return "Connexion impossible pour le moment. Merci de reessayer.";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!supabase) {
      setErrorMessage("Supabase Auth n'est pas configure.");
      return;
    }

    const rawIdentifier = identifier.trim();
    if (!rawIdentifier) {
      setErrorMessage("Entrez votre email ou votre numero de telephone.");
      return;
    }

    const emailLogin = isValidEmail(rawIdentifier) ? rawIdentifier.toLowerCase() : null;
    const phoneLogin = emailLogin ? null : normalizePhone(rawIdentifier);
    const isPhoneAttempt = !emailLogin;

    if (!emailLogin && !phoneLogin) {
      setErrorMessage("Format invalide. Utilisez un email valide ou un numero de telephone (ex: +212661517301).");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        ...(emailLogin ? { email: emailLogin } : { phone: phoneLogin! }),
        password,
      });

      if (error) {
        setErrorMessage(mapLoginErrorMessage(error.message ?? "", isPhoneAttempt));
        return;
      }

      router.push(nextPath);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    if (!supabase) {
      setErrorMessage("Supabase Auth n'est pas configure.");
      return;
    }

    setIsGoogleSubmitting(true);

    const redirectTo = `${window.location.origin}/login?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("provider is not enabled") || message.includes("unsupported provider")) {
        setErrorMessage("Google Sign-In n'est pas active dans Supabase. Activez le provider Google dans Auth > Providers.");
      } else {
        setErrorMessage("Impossible de lancer Google Sign-In pour le moment.");
      }
    }

    setIsGoogleSubmitting(false);
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
              Email ou téléphone
            </span>
            <input
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-orange"
              placeholder="Email ou téléphone"
              autoComplete="username"
              inputMode="text"
              spellCheck={false}
            />
            <p className="mt-1 text-xs text-slate-500">
              Téléphone: disponible si Phone Auth est activée dans Supabase.
            </p>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Mot de passe
            </span>
            <div className="relative mt-1">
              <input
                type={isPasswordVisible ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 pr-10 text-sm text-slate-700 outline-none focus:border-brand-orange"
                placeholder="Votre mot de passe"
                autoComplete="current-password"
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

          <div className="text-right">
            <Link
              href="/mot-de-passe-oublie"
              className="text-xs font-semibold text-brand-orange hover:underline"
            >
              Mot de passe oublie ?
            </Link>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <p className="font-semibold">Connexion impossible</p>
              <p className="mt-1">{errorMessage}</p>
            </div>
          ) : null}

          {infoMessage ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
              {infoMessage}
            </p>
          ) : null}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? "Connexion..." : "Se connecter"}
          </button>

          <div className="flex items-center gap-2 pt-1">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">ou</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleSubmitting}
            className="btn-outline-brand w-full"
          >
            {isGoogleSubmitting ? "Ouverture Google..." : "Continuer avec Google"}
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
