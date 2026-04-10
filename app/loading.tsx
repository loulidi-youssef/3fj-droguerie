export default function GlobalLoading() {
  return (
    <main className="min-h-screen bg-brand-light px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-brand-orange/40 border-t-brand-orange" />
            <p className="text-sm font-semibold text-brand-blue">
              Chargement en cours...
            </p>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-3 w-4/6 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>
    </main>
  );
}

