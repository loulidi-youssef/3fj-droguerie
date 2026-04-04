"use client";

import { useEffect, useMemo, useState } from "react";

type CountdownTimerProps = {
  expiresAt: string;
  compact?: boolean;
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

export const CountdownTimer = ({ expiresAt, compact = false }: CountdownTimerProps) => {
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
    <div
      className={`grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 ${
        compact ? "mt-0" : "mt-5"
      }`}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-2xl border text-center backdrop-blur-sm ${
            compact
              ? "border-slate-200 bg-slate-50 p-2 text-slate-700"
              : "border-white/15 bg-white/15 p-3 text-white"
          }`}
        >
          <p
            className={`font-extrabold ${
              compact ? "text-lg sm:text-xl" : "text-2xl sm:text-[1.8rem]"
            }`}
          >
            {String(item.value).padStart(2, "0")}
          </p>
          <p
            className={`text-xs uppercase tracking-wide ${
              compact ? "text-slate-500" : "text-slate-100"
            }`}
          >
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
};
