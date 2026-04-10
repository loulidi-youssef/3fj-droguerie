import type { ReactNode } from "react";

type AdminSectionCardProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};

export const AdminSectionCard = ({
  title,
  subtitle,
  icon,
  actions,
  className,
  children,
}: AdminSectionCardProps) => {
  return (
    <article
      className={`rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-md ${className ?? ""}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="inline-flex items-center gap-2 text-lg font-extrabold text-brand-blue">
            {icon ? (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                {icon}
              </span>
            ) : null}
            {title}
          </h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children}
    </article>
  );
};
