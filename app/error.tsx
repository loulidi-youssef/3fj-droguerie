"use client";

import Link from "next/link";
import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global route error boundary:", error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="bg-brand-light">
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
          <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M12 8v5" />
                <path d="M12 16h.01" />
                <path d="M10.3 3.8L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.8a2 2 0 00-3.4 0z" />
              </svg>
            </div>

            <h1 className="mt-4 text-2xl font-extrabold text-brand-blue">
              Une erreur est survenue
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Un probleme inattendu a empeche le chargement de cette page.
              Merci de reessayer.
            </p>

            {error.digest ? (
              <p className="mt-2 text-xs text-slate-500">
                Reference: {error.digest}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-orangeDark"
              >
                Reessayer
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Retour a l accueil
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}

