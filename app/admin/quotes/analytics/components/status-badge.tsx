import { type QuoteRequestStatus } from "@/lib/quote-requests";

type StatusBadgeProps = {
  status: QuoteRequestStatus;
  label?: string;
};

const BADGE_CLASSNAME: Record<QuoteRequestStatus, string> = {
  new: "bg-amber-100 text-amber-700 border-amber-200",
  contacted: "bg-sky-100 text-sky-700 border-sky-200",
  converted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  closed: "bg-rose-100 text-rose-700 border-rose-200",
};

const STATUS_LABEL: Record<QuoteRequestStatus, string> = {
  new: "Nouveau",
  contacted: "Contacte",
  converted: "Converti",
  closed: "Cloture",
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${BADGE_CLASSNAME[status]}`}
    >
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}
