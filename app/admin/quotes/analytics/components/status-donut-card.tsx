"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type DonutDatum = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type StatusDonutCardProps = {
  data: DonutDatum[];
  totalLabel?: string;
};

const toPercent = (value: number, total: number): string => {
  if (total <= 0) {
    return "0%";
  }
  return `${Math.round((value / total) * 1000) / 10}%`;
};

export function StatusDonutCard({
  data,
  totalLabel = "Total",
}: StatusDonutCardProps) {
  const safeData = Array.isArray(data) ? data : [];
  const total = safeData.reduce((sum, item) => sum + Math.max(0, item.value), 0);

  if (total === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
        Aucune donnee de statut sur cette periode.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="relative h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={safeData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={78}
              outerRadius={108}
              paddingAngle={3}
              stroke="none"
            >
              {safeData.map((item) => (
                <Cell key={item.key} fill={item.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, entry) => {
                const numericValue = Number(value ?? 0);
                const row = (entry?.payload ?? null) as DonutDatum | null;
                return [
                  `${numericValue} (${toPercent(numericValue, total)})`,
                  row?.label ?? "",
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {totalLabel}
          </p>
          <p className="text-3xl font-black text-slate-900">{total}</p>
        </div>
      </div>
      <div className="grid gap-2 self-center">
        {safeData.map((item) => (
          <div
            key={item.key}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <span className="text-sm font-semibold text-slate-700">{item.label}</span>
              </div>
              <span className="text-sm font-bold text-slate-900">
                {item.value} ({toPercent(item.value, total)})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
