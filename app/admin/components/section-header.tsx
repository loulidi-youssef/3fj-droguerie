import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  description?: string;
  badge?: string;
  actions?: ReactNode;
};

export const SectionHeader = ({
  title,
  description,
  badge,
  actions,
}: SectionHeaderProps) => {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        {badge ? (
          <p className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            {badge}
          </p>
        ) : null}
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-blue">
          {title}
        </h1>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
};
