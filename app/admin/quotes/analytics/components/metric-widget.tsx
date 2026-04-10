import type { ReactNode } from "react";

type WidgetTone = "blue" | "green" | "orange" | "red" | "violet";

type MetricWidgetProps = {
  label: string;
  value: string;
  helper?: string;
  tone: WidgetTone;
  icon?: ReactNode;
};

const TONE_STYLES: Record<
  WidgetTone,
  {
    wrapper: string;
    icon: string;
    value: string;
  }
> = {
  blue: {
    wrapper: "border-sky-200/80 bg-sky-50/90",
    icon: "bg-sky-100 text-sky-700",
    value: "text-sky-900",
  },
  green: {
    wrapper: "border-emerald-200/80 bg-emerald-50/90",
    icon: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-900",
  },
  orange: {
    wrapper: "border-amber-200/80 bg-amber-50/90",
    icon: "bg-amber-100 text-amber-700",
    value: "text-amber-900",
  },
  red: {
    wrapper: "border-rose-200/80 bg-rose-50/90",
    icon: "bg-rose-100 text-rose-700",
    value: "text-rose-900",
  },
  violet: {
    wrapper: "border-violet-200/80 bg-violet-50/90",
    icon: "bg-violet-100 text-violet-700",
    value: "text-violet-900",
  },
};

export function MetricWidget({
  label,
  value,
  helper,
  tone,
  icon,
}: MetricWidgetProps) {
  const styles = TONE_STYLES[tone];

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition duration-200 hover:shadow-md ${styles.wrapper}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {icon ? (
          <span
            className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${styles.icon}`}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className={`mt-2 text-2xl font-extrabold ${styles.value}`}>{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </article>
  );
}
