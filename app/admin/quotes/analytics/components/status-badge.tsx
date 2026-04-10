type DashboardStatus = "pending" | "processing" | "confirmed" | "cancelled";

type StatusBadgeProps = {
  status: DashboardStatus;
  label?: string;
};

const BADGE_CLASSNAME: Record<DashboardStatus, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  processing: "bg-sky-100 text-sky-700 border-sky-200",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
};

const STATUS_LABEL: Record<DashboardStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
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

export type { DashboardStatus };

