import type { ReactNode } from "react";

type AnalyticsTableCardProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AnalyticsTableCard({
  title,
  subtitle,
  actions,
  children,
  className,
}: AnalyticsTableCardProps) {
  return (
    <article
      className={`rounded-3xl border border-slate-200/80 bg-white p-5 shadow-md ${className ?? ""}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children}
    </article>
  );
}
