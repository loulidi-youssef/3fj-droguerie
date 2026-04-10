import type { ReactNode } from "react";

type PremiumCardTone = "blue" | "green" | "orange" | "red" | "indigo";

type PremiumStatCardProps = {
  title: string;
  value: number | string;
  subtitle: string;
  tone: PremiumCardTone;
  icon?: ReactNode;
};

const CARD_TONES: Record<
  PremiumCardTone,
  {
    wrapper: string;
    icon: string;
    value: string;
  }
> = {
  blue: {
    wrapper: "border-sky-200/80 bg-gradient-to-br from-sky-100/80 to-white",
    icon: "bg-sky-100 text-sky-700",
    value: "text-sky-900",
  },
  green: {
    wrapper: "border-emerald-200/80 bg-gradient-to-br from-emerald-100/70 to-white",
    icon: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-900",
  },
  orange: {
    wrapper: "border-amber-200/80 bg-gradient-to-br from-amber-100/70 to-white",
    icon: "bg-amber-100 text-amber-700",
    value: "text-amber-900",
  },
  red: {
    wrapper: "border-rose-200/80 bg-gradient-to-br from-rose-100/70 to-white",
    icon: "bg-rose-100 text-rose-700",
    value: "text-rose-900",
  },
  indigo: {
    wrapper: "border-indigo-200/80 bg-gradient-to-br from-indigo-100/70 to-white",
    icon: "bg-indigo-100 text-indigo-700",
    value: "text-indigo-900",
  },
};

export const PremiumStatCard = ({
  title,
  value,
  subtitle,
  tone,
  icon,
}: PremiumStatCardProps) => {
  const styles = CARD_TONES[tone];
  return (
    <article
      className={`rounded-3xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${styles.wrapper}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className={`mt-2 text-3xl font-extrabold leading-none ${styles.value}`}>{value}</p>
          <p className="mt-2 text-xs text-slate-600">{subtitle}</p>
        </div>
        {icon ? (
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
          >
            {icon}
          </span>
        ) : null}
      </div>
    </article>
  );
};
