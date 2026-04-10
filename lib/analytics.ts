"use client";

export type CheckoutFunnelEventName =
  | "cart_view"
  | "add_to_cart"
  | "checkout_start"
  | "checkout_submit"
  | "order_success"
  | "order_error";

type AnalyticsPayload = {
  cartSize?: number;
  totalPrice?: number;
  deliveryOption?: string | null;
  timestamp?: string;
  [key: string]: unknown;
};

type TrackEventRequest = {
  name: CheckoutFunnelEventName;
  payload: AnalyticsPayload;
  timestamp: string;
};

const ANALYTICS_ROUTE = "/api/analytics";

export const trackEvent = (
  name: CheckoutFunnelEventName,
  payload: AnalyticsPayload = {},
): void => {
  const timestamp = new Date().toISOString();
  const normalizedPayload: AnalyticsPayload = {
    ...payload,
    timestamp,
  };
  const requestBody: TrackEventRequest = {
    name,
    payload: normalizedPayload,
    timestamp,
  };

  if (process.env.NODE_ENV !== "production") {
    console.info("[analytics]", requestBody);
  }

  if (typeof window === "undefined") {
    return;
  }

  const serializedBody = JSON.stringify(requestBody);

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const beaconPayload = new Blob([serializedBody], {
        type: "application/json",
      });
      if (navigator.sendBeacon(ANALYTICS_ROUTE, beaconPayload)) {
        return;
      }
    }
  } catch {
    // Analytics must never impact UX.
  }

  void fetch(ANALYTICS_ROUTE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: serializedBody,
    keepalive: true,
    cache: "no-store",
  }).catch(() => {
    // Analytics failures are intentionally ignored.
  });
};
