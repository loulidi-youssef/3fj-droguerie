import type { ReactNode } from "react";

type AnalyticsSectionHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function AnalyticsSectionHeader({
  title,
  description,
  actions,
}: AnalyticsSectionHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-blue sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
