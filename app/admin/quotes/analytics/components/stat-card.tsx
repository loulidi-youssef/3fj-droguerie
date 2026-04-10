import type { ReactNode } from "react";

type StatCardTone = "blue" | "green" | "orange" | "red";

type StatCardProps = {
  title: string;
  value: number;
  subtitle: string;
  tone: StatCardTone;
  icon?: ReactNode;
};

const TONE_CLASSNAME: Record<StatCardTone, string> = {
  blue: "border-sky-200 bg-sky-50 text-sky-800",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  orange: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-rose-200 bg-rose-50 text-rose-800",
};

export function StatCard({ title, value, subtitle, tone, icon }: StatCardProps) {
  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md ${TONE_CLASSNAME[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{title}</p>
          <p className="mt-2 text-3xl font-extrabold leading-none">{value}</p>
          <p className="mt-2 text-xs opacity-80">{subtitle}</p>
        </div>
        {icon ? (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/70">
            {icon}
          </span>
        ) : null}
      </div>
    </article>
  );
}

