import type { ReactNode } from "react";

type PremiumCardTone = "blue" | "green" | "orange" | "red";

type PremiumStatCardProps = {
  title: string;
  value: number;
  subtitle: string;
  note?: string;
  tone: PremiumCardTone;
  icon?: ReactNode;
};

const CARD_TONES: Record<
  PremiumCardTone,
  {
    wrapper: string;
    icon: string;
    glow: string;
    value: string;
  }
> = {
  blue: {
    wrapper:
      "border-sky-200/80 bg-gradient-to-br from-sky-100/80 via-sky-50 to-white",
    icon: "bg-sky-100 text-sky-700",
    glow: "shadow-sky-200/60",
    value: "text-sky-900",
  },
  green: {
    wrapper:
      "border-emerald-200/80 bg-gradient-to-br from-emerald-100/70 via-emerald-50 to-white",
    icon: "bg-emerald-100 text-emerald-700",
    glow: "shadow-emerald-200/60",
    value: "text-emerald-900",
  },
  orange: {
    wrapper:
      "border-amber-200/80 bg-gradient-to-br from-amber-100/70 via-amber-50 to-white",
    icon: "bg-amber-100 text-amber-700",
    glow: "shadow-amber-200/60",
    value: "text-amber-900",
  },
  red: {
    wrapper:
      "border-rose-200/80 bg-gradient-to-br from-rose-100/70 via-rose-50 to-white",
    icon: "bg-rose-100 text-rose-700",
    glow: "shadow-rose-200/60",
    value: "text-rose-900",
  },
};

export function PremiumStatCard({
  title,
  value,
  subtitle,
  note,
  tone,
  icon,
}: PremiumStatCardProps) {
  const styles = CARD_TONES[tone];

  return (
    <article
      className={`rounded-3xl border p-5 shadow-md transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${styles.wrapper} ${styles.glow}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className={`mt-2 text-4xl font-black leading-none ${styles.value}`}>{value}</p>
          <p className="mt-2 text-xs font-medium text-slate-600">{subtitle}</p>
          {note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
        </div>
        {icon ? (
          <span
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}
          >
            {icon}
          </span>
        ) : null}
      </div>
    </article>
  );
}
