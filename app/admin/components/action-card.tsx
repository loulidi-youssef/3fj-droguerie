import Link from "next/link";
import type { ReactNode } from "react";

type ActionCardProps = {
  href: string;
  title: string;
  description: string;
  icon?: ReactNode;
  tone?: "blue" | "green" | "orange" | "indigo";
};

const TONE_CLASSNAME: Record<NonNullable<ActionCardProps["tone"]>, string> = {
  blue: "border-sky-200/80 bg-sky-50/70 hover:bg-sky-50",
  green: "border-emerald-200/80 bg-emerald-50/70 hover:bg-emerald-50",
  orange: "border-amber-200/80 bg-amber-50/70 hover:bg-amber-50",
  indigo: "border-indigo-200/80 bg-indigo-50/70 hover:bg-indigo-50",
};

export const ActionCard = ({
  href,
  title,
  description,
  icon,
  tone = "blue",
}: ActionCardProps) => {
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${TONE_CLASSNAME[tone]}`}
    >
      <p className="inline-flex items-center gap-2 text-sm font-bold text-brand-blue">
        {icon ? (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-brand-blue">
            {icon}
          </span>
        ) : null}
        {title}
      </p>
      <p className="mt-1 text-xs text-slate-600">{description}</p>
    </Link>
  );
};
