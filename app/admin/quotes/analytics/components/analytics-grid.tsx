import type { ReactNode } from "react";

type AnalyticsGridProps = {
  children: ReactNode;
  className?: string;
};

export function AnalyticsGrid({ children, className }: AnalyticsGridProps) {
  return <div className={`grid gap-5 xl:grid-cols-3 ${className ?? ""}`}>{children}</div>;
}
