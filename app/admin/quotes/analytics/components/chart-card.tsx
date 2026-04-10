import type { ReactNode } from "react";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

export function ChartCard({
  title,
  subtitle,
  actions,
  className,
  bodyClassName,
  children,
}: ChartCardProps) {
  return (
    <article
      className={`rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:shadow-md ${className ?? ""}`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      <div className={bodyClassName}>{children}</div>
    </article>
  );
}
