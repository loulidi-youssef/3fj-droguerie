import type { UpsertAdminAdPlanInput } from "@/lib/admin-ad-plans";
import type { AdPosition } from "@/types";

type ParsedAdPlanInput =
  | {
      ok: true;
      value: UpsertAdminAdPlanInput;
    }
  | {
      ok: false;
      error: string;
    };

const toOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toRequiredString = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const parsePosition = (value: unknown): AdPosition | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "top" || normalized === "middle") {
    return normalized;
  }

  return null;
};

const parseBooleanInput = (value: unknown): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "on";
  }

  return false;
};

const parsePositiveInteger = (value: unknown): number | null => {
  if (typeof value === "number") {
    if (Number.isInteger(value) && value > 0) {
      return value;
    }
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const parseNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value === "number") {
    if (Number.isInteger(value) && value >= 0) {
      return value;
    }
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const parseFromUnknown = (payload: {
  name: unknown;
  description: unknown;
  position: unknown;
  durationDays: unknown;
  price: unknown;
  isActive: unknown;
}): ParsedAdPlanInput => {
  const name = toRequiredString(payload.name);
  const description = toOptionalString(payload.description);
  const position = parsePosition(payload.position);
  const durationDays = parsePositiveInteger(payload.durationDays);
  const price = parseNonNegativeInteger(payload.price);
  const isActive = parseBooleanInput(payload.isActive);

  if (!name) {
    return { ok: false, error: "Le nom du plan est obligatoire." };
  }

  if (!position) {
    return { ok: false, error: "La position du plan doit etre top ou middle." };
  }

  if (!durationDays) {
    return { ok: false, error: "La duree (jours) doit etre un nombre entier superieur a 0." };
  }

  if (price === null) {
    return { ok: false, error: "Le prix du plan doit etre un nombre entier >= 0." };
  }

  return {
    ok: true,
    value: {
      name,
      description,
      position,
      durationDays,
      price,
      isActive,
    },
  };
};

export const parseAdminAdPlanInputFromJson = (
  payload: Record<string, unknown>,
): ParsedAdPlanInput => {
  return parseFromUnknown({
    name: payload.name,
    description: payload.description,
    position: payload.position,
    durationDays: payload.duration_days,
    price: payload.price,
    isActive: payload.is_active,
  });
};

export const parseAdminAdPlanInputFromFormData = (
  formData: FormData,
): ParsedAdPlanInput => {
  return parseFromUnknown({
    name: formData.get("name"),
    description: formData.get("description"),
    position: formData.get("position"),
    durationDays: formData.get("durationDays"),
    price: formData.get("price"),
    isActive: formData.get("isActive"),
  });
};
