"use client";

import { useEffect, useMemo, useState } from "react";

type CountdownTimerProps = {
  expiresAt: string;
  compact?: boolean;
  variant?: "default" | "homepage-offer";
};

type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const getCountdown = (expiresAt: string): Countdown => {
  const distance = new Date(expiresAt).getTime() - Date.now();
  if (distance <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((distance / (1000 * 60)) % 60),
    seconds: Math.floor((distance / 1000) % 60),
  };
};

export const CountdownTimer = ({
  expiresAt,
  compact = false,
  variant = "default",
}: CountdownTimerProps) => {
  const [countdown, setCountdown] = useState<Countdown>(() => getCountdown(expiresAt));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(getCountdown(expiresAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const items = useMemo(
    () => [
      { label: "Jours", value: countdown.days },
      { label: "Heures", value: countdown.hours },
      { label: "Minutes", value: countdown.minutes },
      { label: "Secondes", value: countdown.seconds },
    ],
    [countdown],
  );

  return (
    <div className={`grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-3 ${compact ? "mt-0" : "mt-4 sm:mt-5"}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className={`border text-center backdrop-blur-sm ${
            variant === "homepage-offer"
              ? compact
                ? "rounded-lg border-white/5 bg-brand-blue px-1.5 py-1 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] sm:px-2 sm:py-1.5"
                : "rounded-lg border-white/5 bg-brand-blue px-2 py-1.5 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] sm:px-3 sm:py-2"
              : compact
                ? "rounded-2xl border-slate-200 bg-slate-50 p-1.5 text-slate-700 sm:p-2"
                : "rounded-2xl border-white/15 bg-white/15 p-3 text-white"
          }`}
        >
          <p
            className={`font-extrabold ${
              variant === "homepage-offer"
                ? compact
                  ? "text-[1.05rem] leading-none sm:text-xl"
                  : "text-2xl leading-none sm:text-3xl"
                : compact
                  ? "text-base sm:text-xl"
                  : "text-2xl sm:text-[1.8rem]"
            }`}
          >
            {String(item.value).padStart(2, "0")}
          </p>
          <p
            className={`text-xs uppercase tracking-wide ${
              variant === "homepage-offer"
                ? compact
                  ? "mt-0.5 text-[8px] text-slate-200 sm:text-[9px]"
                  : "mt-1 text-[10px] text-slate-200"
                : compact
                  ? "text-[10px] text-slate-500"
                  : "text-slate-100"
            }`}
          >
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
};
