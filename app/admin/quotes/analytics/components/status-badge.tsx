export type AnalyticsOrderStatus = "pending" | "confirmed" | "cancelled";

type StatusBadgeProps = {
  status: AnalyticsOrderStatus;
  label?: string;
};

const BADGE_CLASSNAME: Record<AnalyticsOrderStatus, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
};

const STATUS_LABEL: Record<AnalyticsOrderStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmee",
  cancelled: "Annulee",
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
