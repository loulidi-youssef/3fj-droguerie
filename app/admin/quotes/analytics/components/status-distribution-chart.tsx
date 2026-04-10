"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type StatusDistributionDatum = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type StatusDistributionChartProps = {
  data: StatusDistributionDatum[];
};

const toPercent = (value: number, total: number): string => {
  if (total <= 0) {
    return "0%";
  }
  return `${Math.round((value / total) * 1000) / 10}%`;
};

export function StatusDistributionChart({ data }: StatusDistributionChartProps) {
  const safeData = Array.isArray(data) ? data : [];
  const total = safeData.reduce((sum, item) => sum + Math.max(0, item.value), 0);

  if (total === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-500">
        Pas de donnees pour cette periode.
      </div>
    );
  }

  return (
    <div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={safeData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={100}
              paddingAngle={2}
              stroke="none"
            >
              {safeData.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, entry) => {
                const numericValue = Number(value ?? 0);
                const item = (entry?.payload ?? null) as StatusDistributionDatum | null;
                return [`${numericValue} (${toPercent(numericValue, total)})`, item?.label ?? ""];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {safeData.map((entry) => (
          <div key={entry.key} className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden
              />
              <span className="font-semibold text-slate-700">{entry.label}</span>
            </div>
            <p className="mt-1 text-slate-500">
              {entry.value} ({toPercent(entry.value, total)})
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
