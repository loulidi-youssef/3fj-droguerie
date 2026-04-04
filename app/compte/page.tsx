"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthState = {
  isLoading: boolean;
  email: string | null;
};

export default function ComptePage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    email: null,
  });

  useEffect(() => {
    if (!supabase) {
      router.replace("/login?next=/compte");
      return;
    }

    let isMounted = true;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (!data.session) {
        router.replace("/login?next=/compte");
        return;
      }

      setAuthState({
        isLoading: false,
        email: data.session.user.email ?? null,
      });
    };

    void syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login?next=/compte");
        return;
      }

      setAuthState({
        isLoading: false,
        email: session.user.email ?? null,
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (authState.isLoading) {
    return (
      <section className="section-padding bg-brand-light">
        <div className="mx-auto max-w-4xl px-4 sm:px-5 lg:px-6">
          <p className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-card">
            Chargement du compte...
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding bg-brand-light">
      <div className="mx-auto max-w-4xl px-4 sm:px-5 lg:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-blue sm:text-4xl">
          Mon compte
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Connecte en tant que: <span className="font-semibold">{authState.email}</span>
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/compte/commandes"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,42,77,0.12)]"
          >
            <h2 className="text-lg font-bold text-brand-blue">Mes commandes</h2>
            <p className="mt-2 text-sm text-slate-600">
              Consultez vos commandes et annulez celles qui sont encore eligibles.
            </p>
          </Link>

          <Link
            href="/compte/favoris"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,42,77,0.12)]"
          >
            <h2 className="text-lg font-bold text-brand-blue">Mes favoris</h2>
            <p className="mt-2 text-sm text-slate-600">
              Retrouvez rapidement les produits que vous avez sauvegardes.
            </p>
          </Link>

          <Link
            href="/produits"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,42,77,0.12)]"
          >
            <h2 className="text-lg font-bold text-brand-blue">Continuer les achats</h2>
            <p className="mt-2 text-sm text-slate-600">
              Retournez au catalogue et commandez en quelques clics.
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
}
