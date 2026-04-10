import type { ReactNode } from "react";

type AnalyticsChartCardProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function AnalyticsChartCard({
  title,
  subtitle,
  actions,
  className,
  children,
}: AnalyticsChartCardProps) {
  return (
    <article
      className={`rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-md ${className ?? ""}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
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
