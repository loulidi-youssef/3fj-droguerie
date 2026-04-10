"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type QuoteTrendPoint = {
  date: string;
  count: number;
};

type QuoteTrendChartProps = {
  data: QuoteTrendPoint[];
};

const formatShortDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-MA", { day: "2-digit", month: "2-digit" }).format(date);
};

export function QuoteTrendChart({ data }: QuoteTrendChartProps) {
  const safeData = Array.isArray(data) ? data : [];

  if (safeData.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
        Aucune tendance disponible.
      </div>
    );
  }

  return (
    <div className="h-80 rounded-2xl bg-slate-50/70 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={safeData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="quoteTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 11, fill: "#475569" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#475569" }} />
          <Tooltip
            labelFormatter={(label) => formatShortDate(String(label))}
            formatter={(value) => [`${Number(value ?? 0)} devis`, "Volume"]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#2563eb"
            fillOpacity={1}
            fill="url(#quoteTrendFill)"
            strokeWidth={2.5}
            activeDot={{ r: 5, fill: "#1d4ed8" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
