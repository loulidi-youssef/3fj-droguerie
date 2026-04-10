import { formatDh } from "@/lib/currency";
import { StatusBadge, type AnalyticsOrderStatus } from "./status-badge";

type OrderTableRow = {
  id: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  status: AnalyticsOrderStatus;
  total: number;
};

type OrdersTableProps = {
  rows: OrderTableRow[];
  formatDate: (value: string) => string;
};

export function OrdersTable({ rows, formatDate }: OrdersTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 bg-slate-50">
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2">Client</th>
            <th className="px-3 py-2">Telephone</th>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Statut</th>
            <th className="px-3 py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-slate-100 text-slate-700 transition hover:bg-sky-50/40"
            >
              <td className="px-3 py-3 font-medium">{row.customerName}</td>
              <td className="px-3 py-3">{row.customerPhone}</td>
              <td className="px-3 py-3">{formatDate(row.createdAt)}</td>
              <td className="px-3 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-3 py-3 font-semibold text-slate-900">
                {formatDh(row.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
