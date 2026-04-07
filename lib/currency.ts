const MAD_DECIMAL_FACTOR = 100;

const MAD_NUMBER_FORMATTER = new Intl.NumberFormat("fr-MA-u-nu-latn", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const toFiniteDecimalAmount = (value: unknown): number => {
  const parsed = parseDecimalInput(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const roundDhAmount = (value: unknown): number => {
  const numericValue = toFiniteDecimalAmount(value);
  const rounded =
    Math.round((numericValue + Number.EPSILON) * MAD_DECIMAL_FACTOR) / MAD_DECIMAL_FACTOR;
  return Object.is(rounded, -0) ? 0 : rounded;
};

export const formatDh = (value: unknown): string => {
  return `${MAD_NUMBER_FORMATTER.format(roundDhAmount(value))} DH`;
};

export const parseDecimalInput = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  if (typeof value !== "string") {
    return Number.NaN;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return Number.NaN;
  }

  const compact = trimmed.replace(/\s+/g, "");
  const hasComma = compact.includes(",");
  const hasDot = compact.includes(".");

  let normalized = compact;
  if (hasComma && hasDot) {
    const lastComma = compact.lastIndexOf(",");
    const lastDot = compact.lastIndexOf(".");
    normalized =
      lastComma > lastDot
        ? compact.replace(/\./g, "").replace(/,/g, ".")
        : compact.replace(/,/g, "");
  } else if (hasComma) {
    normalized = compact.replace(/,/g, ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};
