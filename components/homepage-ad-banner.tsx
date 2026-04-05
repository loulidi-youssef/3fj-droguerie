"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Ad } from "@/types";

type HomepageAdBannerProps = {
  ad: Ad | null;
  slot: "top" | "middle";
};

const ADS_SESSION_STORAGE_KEY = "3fj-ads-session-key";

const getAdSessionKey = (): string => {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(ADS_SESSION_STORAGE_KEY);
  if (existing && /^[a-zA-Z0-9._-]{8,120}$/.test(existing)) {
    return existing;
  }

  const generated =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(ADS_SESSION_STORAGE_KEY, generated);
  return generated;
};

const postAdEvent = (adId: string, eventType: "view" | "click", sessionKey: string): void => {
  const endpoint = `/api/ads/${encodeURIComponent(adId)}/${eventType}`;
  const payload = JSON.stringify({ session_key: sessionKey });

  if (eventType === "click" && typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(endpoint, blob);
      return;
    } catch {
      // Fallback to fetch below.
    }
  }

  void fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
    cache: "no-store",
    keepalive: true,
  }).catch(() => {});
};

const getAltText = (ad: Ad): string => {
  const title = ad.title?.trim();
  if (title) {
    return title;
  }

  return "Publicite sponsorisee";
};

export const HomepageAdBanner = ({ ad, slot }: HomepageAdBannerProps) => {
  const anchorRef = useRef<HTMLAnchorElement | null>(null);
  const didTrackViewRef = useRef(false);
  const sessionKey = useMemo(() => getAdSessionKey(), []);

  useEffect(() => {
    if (!ad) {
      return;
    }

    const anchorElement = anchorRef.current;
    if (!anchorElement || !sessionKey || didTrackViewRef.current) {
      return;
    }

    const markViewed = () => {
      if (didTrackViewRef.current) {
        return;
      }
      didTrackViewRef.current = true;
      postAdEvent(ad.id, "view", sessionKey);
    };

    if (typeof window === "undefined" || typeof window.IntersectionObserver === "undefined") {
      markViewed();
      return;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            markViewed();
            observer.disconnect();
            break;
          }
        }
      },
      {
        threshold: 0.35,
      },
    );

    observer.observe(anchorElement);

    return () => {
      observer.disconnect();
    };
  }, [ad, sessionKey]);

  if (!ad) {
    return null;
  }

  const hasOverlayContent = Boolean(ad.title?.trim() || ad.description?.trim());
  const containerHeightClass =
    slot === "top"
      ? "h-[132px] sm:h-[170px] lg:h-[220px]"
      : "h-[116px] sm:h-[142px] lg:h-[170px]";

  return (
    <section className={slot === "top" ? "bg-[#f1f3f5] pt-2" : "bg-[#f1f3f5] py-3"}>
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-6">
        <a
          ref={anchorRef}
          href={ad.link}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => {
            if (!sessionKey) {
              return;
            }
            postAdEvent(ad.id, "click", sessionKey);
          }}
          className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
        >
          <div className={`relative ${containerHeightClass}`}>
            <img
              src={ad.imageUrl}
              alt={getAltText(ad)}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02] group-hover:opacity-95"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/55 via-slate-950/25 to-transparent" />

            {hasOverlayContent ? (
              <div className="absolute inset-0 flex items-end p-3 sm:p-5">
                <div className="max-w-3xl text-white">
                  {ad.title ? (
                    <p className="text-sm font-bold uppercase tracking-wide sm:text-base">
                      {ad.title}
                    </p>
                  ) : null}
                  {ad.description ? (
                    <p className="mt-1 text-xs text-slate-100 sm:text-sm">{ad.description}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
              Publicite
            </span>
          </div>
        </a>
      </div>
    </section>
  );
};
