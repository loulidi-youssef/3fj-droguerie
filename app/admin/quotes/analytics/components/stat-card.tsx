import type { ReactNode } from "react";

type StatCardTone = "blue" | "green" | "orange" | "red";

type StatCardProps = {
  title: string;
  value: number;
  subtitle: string;
  note?: string;
  tone: StatCardTone;
  icon?: ReactNode;
};

const TONE_WRAPPER_CLASSNAME: Record<StatCardTone, string> = {
  blue: "border-sky-200/80 bg-gradient-to-br from-sky-50 to-white",
  green: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white",
  orange: "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white",
  red: "border-rose-200/80 bg-gradient-to-br from-rose-50 to-white",
};

const TONE_ACCENT_CLASSNAME: Record<StatCardTone, string> = {
  blue: "bg-sky-500",
  green: "bg-emerald-500",
  orange: "bg-amber-500",
  red: "bg-rose-500",
};

const TONE_TEXT_CLASSNAME: Record<StatCardTone, string> = {
  blue: "text-sky-900",
  green: "text-emerald-900",
  orange: "text-amber-900",
  red: "text-rose-900",
};

export function StatCard({ title, value, subtitle, note, tone, icon }: StatCardProps) {
  return (
    <article
      className={`relative overflow-hidden rounded-3xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${TONE_WRAPPER_CLASSNAME[tone]}`}
    >
      <span className={`absolute left-0 top-0 h-full w-1.5 ${TONE_ACCENT_CLASSNAME[tone]}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className={`mt-2 text-3xl font-extrabold leading-none ${TONE_TEXT_CLASSNAME[tone]}`}>{value}</p>
          <p className="mt-2 text-xs text-slate-600">{subtitle}</p>
          {note ? <p className="mt-1 text-xs font-medium text-slate-500">{note}</p> : null}
        </div>
        {icon ? (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 shadow-sm">
            {icon}
          </span>
        ) : null}
      </div>
    </article>
  );
}
