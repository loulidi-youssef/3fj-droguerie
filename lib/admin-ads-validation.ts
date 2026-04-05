import type { UpsertAdminAdInput } from "@/lib/admin-ads";
import type { AdPosition } from "@/types";

type ParsedAdInput =
  | {
      ok: true;
      value: UpsertAdminAdInput;
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

const parseDateInput = (value: unknown): string | null | "invalid" => {
  const textValue = toOptionalString(value);
  if (!textValue) {
    return null;
  }

  const date = new Date(textValue);
  if (Number.isNaN(date.getTime())) {
    return "invalid";
  }

  return date.toISOString();
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

const parseOptionalUuid = (value: unknown): string | null | "invalid" => {
  const rawValue = toOptionalString(value);
  if (!rawValue) {
    return null;
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawValue)) {
    return "invalid";
  }

  return rawValue;
};

const normalizeLink = (value: string): string | null => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const parseFromUnknown = (payload: {
  imageUrl: unknown;
  title: unknown;
  description: unknown;
  link: unknown;
  position: unknown;
  isActive: unknown;
  startDate: unknown;
  endDate: unknown;
  planId: unknown;
}): ParsedAdInput => {
  const imageUrl = toRequiredString(payload.imageUrl);
  const title = toOptionalString(payload.title);
  const description = toOptionalString(payload.description);
  const linkRaw = toRequiredString(payload.link);
  const position = parsePosition(payload.position);
  const isActive = parseBooleanInput(payload.isActive);
  const startDate = parseDateInput(payload.startDate);
  const endDate = parseDateInput(payload.endDate);
  const planId = parseOptionalUuid(payload.planId);

  if (!imageUrl) {
    return { ok: false, error: "L'image de la publicite est obligatoire." };
  }

  if (!linkRaw) {
    return { ok: false, error: "Le lien cible est obligatoire." };
  }

  const link = normalizeLink(linkRaw);
  if (!link) {
    return { ok: false, error: "Le lien cible doit etre une URL http(s) valide." };
  }

  if (!position) {
    return { ok: false, error: "La position doit etre top ou middle." };
  }

  if (startDate === "invalid") {
    return { ok: false, error: "Date de debut invalide." };
  }

  if (endDate === "invalid") {
    return { ok: false, error: "Date de fin invalide." };
  }

  if (startDate && endDate && new Date(endDate).getTime() <= new Date(startDate).getTime()) {
    return { ok: false, error: "La date de fin doit etre apres la date de debut." };
  }

  if (planId === "invalid") {
    return { ok: false, error: "Plan publicitaire invalide." };
  }

  return {
    ok: true,
    value: {
      imageUrl,
      title,
      description,
      link,
      position,
      isActive,
      startDate,
      endDate,
      planId,
    },
  };
};

export const parseAdminAdInputFromJson = (
  payload: Record<string, unknown>,
): ParsedAdInput => {
  return parseFromUnknown({
    imageUrl: payload.image_url,
    title: payload.title,
    description: payload.description,
    link: payload.link,
    position: payload.position,
    isActive: payload.is_active,
    startDate: payload.start_date,
    endDate: payload.end_date,
    planId: payload.plan_id,
  });
};

export const parseAdminAdInputFromFormData = (formData: FormData): ParsedAdInput => {
  return parseFromUnknown({
    imageUrl: formData.get("imageUrl"),
    title: formData.get("title"),
    description: formData.get("description"),
    link: formData.get("link"),
    position: formData.get("position"),
    isActive: formData.get("isActive"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    planId: formData.get("planId"),
  });
};

