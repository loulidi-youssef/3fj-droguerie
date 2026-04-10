import type { ReactNode } from "react";

type AnalyticsGridProps = {
  children: ReactNode;
};

export function AnalyticsGrid({ children }: AnalyticsGridProps) {
  return <div className="grid gap-4 xl:grid-cols-3">{children}</div>;
}

