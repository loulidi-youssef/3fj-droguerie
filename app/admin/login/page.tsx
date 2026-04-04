import { redirect } from "next/navigation";
import {
  createAdminSession,
  hasValidAdminSession,
  isAdminAuthConfigured,
  verifyAdminPassword,
} from "@/lib/admin-auth";

type LoginPageProps = {
  searchParams: {
    error?: string | string[];
  };
};

const loginErrorMessage = "Mot de passe invalide. Merci de reessayer.";

const loginAdminAction = async (formData: FormData) => {
  "use server";

  const password = formData.get("password");
  const candidatePassword = typeof password === "string" ? password : "";

  if (!verifyAdminPassword(candidatePassword)) {
    redirect("/admin/login?error=invalid-password");
  }

  createAdminSession();
  redirect("/admin/orders");
};

export default function AdminLoginPage({ searchParams }: LoginPageProps) {
  if (!isAdminAuthConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Admin login</h1>
          <p className="mt-3 text-sm text-slate-700">
            Configurez la variable d&apos;environnement
            <span className="font-semibold"> ADMIN_ACCESS_PASSWORD</span> dans
            <span className="font-semibold"> .env.local</span>, puis redemarrez le serveur.
          </p>
        </div>
      </section>
    );
  }

  if (hasValidAdminSession()) {
    redirect("/admin/orders");
  }

  const hasError =
    typeof searchParams.error === "string"
      ? searchParams.error === "invalid-password"
      : Array.isArray(searchParams.error)
        ? searchParams.error.includes("invalid-password")
        : false;

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-card">
        <h1 className="text-2xl font-extrabold text-brand-blue">Admin login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Entrez le mot de passe admin pour acceder aux commandes.
        </p>

        {hasError ? (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {loginErrorMessage}
          </p>
        ) : null}

        <form action={loginAdminAction} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Mot de passe admin
            </span>
            <input
              type="password"
              name="password"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-orange"
              placeholder="Votre mot de passe"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-xl bg-brand-blue px-4 py-3 text-sm font-semibold text-white"
          >
            Se connecter
          </button>
        </form>
      </div>
    </section>
  );
}
