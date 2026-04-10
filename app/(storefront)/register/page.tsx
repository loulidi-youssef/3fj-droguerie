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

type SupabaseAuthErrorLike = {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
};

const toDebugError = (error: SupabaseAuthErrorLike | null) => {
  if (!error) {
    return null;
  }

  return {
    message: error.message ?? null,
    status: error.status ?? null,
    code: error.code ?? null,
    name: error.name ?? null,
  };
};

const shouldDebugRegisterFlow = process.env.NODE_ENV !== "production";

const logRegisterDebug = (step: string, details: Record<string, unknown>) => {
  if (!shouldDebugRegisterFlow) {
    return;
  }

  console.info(`[register] ${step}`, details);
};

const maskEmailForDebug = (email: string): string => {
  const atIndex = email.indexOf("@");
  if (atIndex <= 1) {
    return "***";
  }

  return `${email.slice(0, 2)}***${email.slice(atIndex)}`;
};

const mapSignUpErrorMessage = (error: SupabaseAuthErrorLike): string => {
  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("already registered") || message.includes("already exists")) {
    return "Cet email est deja utilise. Connectez-vous ou utilisez un autre email.";
  }

  if (message.includes("invalid email")) {
    return "Adresse email invalide. Verifiez le format puis reessayez.";
  }

  if (
    message.includes("password should be at least") ||
    message.includes("weak password") ||
    message.includes("password") && message.includes("invalid")
  ) {
    return "Mot de passe invalide ou trop faible. Utilisez au moins 6 caracteres.";
  }

  if (
    message.includes("signup is disabled") ||
    message.includes("signups not allowed")
  ) {
    return "Les inscriptions sont temporairement indisponibles. Merci de reessayer plus tard.";
  }

  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Trop de tentatives d'inscription. Merci de patienter puis reessayer.";
  }

  if (error.message?.trim()) {
    return `Inscription impossible: ${error.message.trim()}`;
  }

  return "Inscription impossible. Merci de verifier les informations.";
};

const mapAutoLoginErrorMessage = (error: SupabaseAuthErrorLike | null): string => {
  const message = error?.message?.toLowerCase() ?? "";

  if (message.includes("email not confirmed")) {
    return "Compte cree avec succes. Confirmez votre email, puis connectez-vous.";
  }

  if (message.includes("invalid login credentials")) {
    return "Compte cree, mais la connexion automatique a echoue. Connectez-vous manuellement.";
  }

  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Compte cree, mais trop de tentatives de connexion automatique. Connectez-vous dans quelques instants.";
  }

  if (error?.message?.trim()) {
    return `Compte cree, mais connexion automatique impossible (${error.message.trim()}). Connectez-vous manuellement.`;
  }

  return "Compte cree, mais connexion automatique impossible. Connectez-vous pour continuer.";
};

export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextPath, setNextPath] = useState("/compte/commandes");

  const redirectAfterAutoLogin = (destination: string): void => {
    setSuccessMessage("Compte cree et connexion reussie. Redirection...");
    window.setTimeout(() => {
      router.push(destination);
      router.refresh();
    }, 400);
  };

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
    setSuccessMessage(null);
    const normalizedEmail = email.trim();

    if (!supabase) {
      setErrorMessage("Supabase Auth n'est pas configure.");
      return;
    }

    setIsSubmitting(true);

    try {
      logRegisterDebug("signup:start", {
        email: maskEmailForDebug(normalizedEmail),
        nextPath,
      });

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      logRegisterDebug("signup:result", {
        hasUser: Boolean(data.user),
        hasSession: Boolean(data.session),
        error: toDebugError(error),
      });

      if (error) {
        setErrorMessage(mapSignUpErrorMessage(error));
        return;
      }

      if (data.session) {
        logRegisterDebug("redirect:after-signup-session", { nextPath });
        redirectAfterAutoLogin(nextPath);
        return;
      }

      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      logRegisterDebug("autologin:result", {
        hasSession: Boolean(loginData.session),
        error: toDebugError(loginError),
      });

      if (loginData.session && !loginError) {
        logRegisterDebug("redirect:after-autologin", { nextPath });
        redirectAfterAutoLogin(nextPath);
        return;
      }

      setSuccessMessage(mapAutoLoginErrorMessage(loginError));
    } catch (error) {
      logRegisterDebug("signup:exception", {
        error: error instanceof Error ? error.message : String(error),
      });
      setErrorMessage(
        "Une erreur technique est survenue pendant l'inscription. Merci de reessayer.",
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

          {errorMessage ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <p className="font-semibold">Inscription impossible</p>
              <p className="mt-1">{errorMessage}</p>
            </div>
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
