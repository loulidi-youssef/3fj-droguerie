import Link from "next/link";

type EmptyAnalyticsStateProps = {
  title: string;
  description: string;
};

export function EmptyAnalyticsState({ title, description }: EmptyAnalyticsStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/90 p-8 text-center shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">{description}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/admin/quotes"
          className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Voir les devis
        </Link>
        <Link
          href="/admin"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-orange hover:text-brand-orange"
        >
          Retour dashboard
        </Link>
      </div>
    </div>
  );
}
