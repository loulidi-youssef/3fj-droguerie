type MetricChipTone = "blue" | "green" | "orange" | "red" | "slate";

type MetricChipProps = {
  label: string;
  tone?: MetricChipTone;
};

const CHIP_TONE_CLASSNAME: Record<MetricChipTone, string> = {
  blue: "border-sky-200 bg-sky-50 text-sky-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  orange: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-rose-200 bg-rose-50 text-rose-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

export const MetricChip = ({ label, tone = "slate" }: MetricChipProps) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${CHIP_TONE_CLASSNAME[tone]}`}
    >
      {label}
    </span>
  );
};
