import { redirect } from "next/navigation";
import {
  clearAdminLoginFailures,
  createAdminSession,
  getAdminLoginAllowance,
  hasValidAdminSession,
  isAdminAuthConfigured,
  registerAdminLoginFailure,
  verifyAdminPassword,
} from "@/lib/admin-auth";

type LoginPageProps = {
  searchParams: {
    error?: string | string[];
    retryAfter?: string | string[];
  };
};

const loginErrorMessage = "Identifiants admin invalides. Merci de reessayer.";

const getRetryAfterSecondsFromSearchParams = (
  value: string | string[] | undefined,
): number => {
  const rawValue =
    typeof value === "string"
      ? value
      : Array.isArray(value)
      ? value[0] ?? ""
      : "";
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.ceil(parsed);
};

const buildTooManyAttemptsMessage = (retryAfterSeconds: number): string => {
  const retryAfterMinutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Trop de tentatives. Reessayez dans ${retryAfterMinutes} minute(s).`;
};

const loginAdminAction = async (formData: FormData) => {
  "use server";

  if (!isAdminAuthConfigured()) {
    redirect("/admin/login?error=auth-unavailable");
  }

  const loginAllowance = await getAdminLoginAllowance();
  if (!loginAllowance.allowed) {
    redirect(
      `/admin/login?error=too-many-attempts&retryAfter=${encodeURIComponent(
        String(loginAllowance.retryAfterSeconds),
      )}`,
    );
  }

  const password = formData.get("password");
  const candidatePassword = typeof password === "string" ? password : "";

  if (!verifyAdminPassword(candidatePassword)) {
    const failureResult = await registerAdminLoginFailure(loginAllowance.context);
    if (failureResult.locked) {
      redirect(
        `/admin/login?error=too-many-attempts&retryAfter=${encodeURIComponent(
          String(failureResult.retryAfterSeconds),
        )}`,
      );
    }

    redirect("/admin/login?error=invalid-credentials");
  }

  try {
    await clearAdminLoginFailures(loginAllowance.context);
    await createAdminSession();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown-error";
    console.error("[admin-login] Failed to create admin session.", errorMessage);
    redirect("/admin/login?error=auth-unavailable");
  }
  redirect("/admin/orders");
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isAdminAuthConfigured()) {
    return (
      <section className="bg-brand-light py-12">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-brand-blue">Admin login</h1>
          <p className="mt-3 text-sm text-slate-700">
            {isProduction ? (
              <>
                Configurez
                <span className="font-semibold"> ADMIN_ACCESS_PASSWORD_HASH </span>
                et
                <span className="font-semibold"> ADMIN_SESSION_SECRET </span>
                (32+ caracteres), puis supprimez
                <span className="font-semibold"> ADMIN_ACCESS_PASSWORD </span>
                et
                <span className="font-semibold"> ADMIN_PASSWORD</span>.
              </>
            ) : (
              <>
                Configurez
                <span className="font-semibold"> ADMIN_ACCESS_PASSWORD_HASH </span>
                (recommande) ou
                <span className="font-semibold"> ADMIN_ACCESS_PASSWORD </span>
                dans
                <span className="font-semibold"> .env.local</span>.
              </>
            )}
          </p>
        </div>
      </section>
    );
  }

  if (await hasValidAdminSession()) {
    redirect("/admin/orders");
  }

  const hasInvalidCredentialsError =
    typeof searchParams.error === "string"
      ? searchParams.error === "invalid-credentials"
      : Array.isArray(searchParams.error)
        ? searchParams.error.includes("invalid-credentials")
        : false;
  const hasTooManyAttemptsError =
    typeof searchParams.error === "string"
      ? searchParams.error === "too-many-attempts"
      : Array.isArray(searchParams.error)
      ? searchParams.error.includes("too-many-attempts")
      : false;
  const hasAuthUnavailableError =
    typeof searchParams.error === "string"
      ? searchParams.error === "auth-unavailable"
      : Array.isArray(searchParams.error)
      ? searchParams.error.includes("auth-unavailable")
      : false;
  const retryAfterSeconds = getRetryAfterSecondsFromSearchParams(
    searchParams.retryAfter,
  );
  const hasError =
    hasInvalidCredentialsError || hasTooManyAttemptsError || hasAuthUnavailableError;
  const errorMessage = hasTooManyAttemptsError
    ? buildTooManyAttemptsMessage(retryAfterSeconds)
    : hasAuthUnavailableError
    ? "Connexion admin indisponible. Merci de reessayer."
    : loginErrorMessage;

  return (
    <section className="bg-brand-light py-12">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-card">
        <h1 className="text-2xl font-extrabold text-brand-blue">Admin login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Entrez le mot de passe admin pour acceder aux commandes.
        </p>

        {hasError ? (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
            {errorMessage}
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

