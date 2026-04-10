import { businessInfo } from "@/data/business";

export type CheckoutCustomerInput = {
  name: string;
  phone: string;
  address: string;
  location: string;
  note: string;
};

export type CheckoutField = keyof CheckoutCustomerInput;

export type CheckoutFieldErrors = Partial<Record<CheckoutField, string>>;

type CheckoutCustomerValidationResult = {
  isValid: boolean;
  errors: CheckoutFieldErrors;
  customer: CheckoutCustomerInput;
};

type CheckoutValidationOptions = {
  requireAddress?: boolean;
  requireName?: boolean;
  requireLocation?: boolean;
};

const normalizeText = (value: string): string => {
  return value.trim().replace(/\s+/g, " ");
};

const MAX_NAME_LENGTH = 120;
const MAX_PHONE_LENGTH = 20;
const MAX_ADDRESS_LENGTH = 240;
const MAX_LOCATION_LENGTH = 120;
const MAX_NOTE_LENGTH = 500;

const isValidMoroccanPhone = (value: string): boolean => {
  const digits = value.replace(/\D/g, "");

  const localFormat =
    digits.length === 10 &&
    (digits.startsWith("05") || digits.startsWith("06") || digits.startsWith("07"));
  const localWithoutZero =
    digits.length === 9 &&
    (digits.startsWith("5") || digits.startsWith("6") || digits.startsWith("7"));
  const internationalFormat =
    digits.length === 12 &&
    (digits.startsWith("2125") || digits.startsWith("2126") || digits.startsWith("2127"));

  return localFormat || localWithoutZero || internationalFormat;
};

export const validateCheckoutCustomer = (
  input: CheckoutCustomerInput,
  options?: CheckoutValidationOptions,
): CheckoutCustomerValidationResult => {
  const requireAddress = options?.requireAddress ?? true;
  const requireName = options?.requireName ?? true;
  const requireLocation = options?.requireLocation ?? true;
  const normalizedName = normalizeText(input.name);
  const normalizedPhone = input.phone.trim();
  const normalizedAddress = normalizeText(input.address);
  const normalizedRawLocation = normalizeText(input.location);
  const normalizedLocation = normalizedRawLocation || businessInfo.city;
  const normalizedNote = normalizeText(input.note);

  const errors: CheckoutFieldErrors = {};

  if (requireName) {
    if (!normalizedName) {
      errors.name = "Le nom complet est obligatoire.";
    } else if (normalizedName.length < 2) {
      errors.name = "Le nom complet doit contenir au moins 2 caracteres.";
    } else if (normalizedName.length > MAX_NAME_LENGTH) {
      errors.name = `Le nom complet ne doit pas depasser ${MAX_NAME_LENGTH} caracteres.`;
    }
  } else if (normalizedName) {
    if (normalizedName.length < 2) {
      errors.name = "Le nom complet doit contenir au moins 2 caracteres.";
    } else if (normalizedName.length > MAX_NAME_LENGTH) {
      errors.name = `Le nom complet ne doit pas depasser ${MAX_NAME_LENGTH} caracteres.`;
    }
  }

  if (!normalizedPhone) {
    errors.phone = "Le numero de telephone est obligatoire.";
  } else if (normalizedPhone.length > MAX_PHONE_LENGTH) {
    errors.phone = `Le numero ne doit pas depasser ${MAX_PHONE_LENGTH} caracteres.`;
  } else if (!isValidMoroccanPhone(normalizedPhone)) {
    errors.phone =
      "Numero invalide. Utilisez un numero marocain (ex: 06XXXXXXXX ou +2126XXXXXXXX).";
  }

  if (requireAddress) {
    if (!normalizedAddress) {
      errors.address = "L'adresse est obligatoire.";
    } else if (normalizedAddress.length < 4) {
      errors.address = "L'adresse doit contenir au moins 4 caracteres.";
    } else if (normalizedAddress.length > MAX_ADDRESS_LENGTH) {
      errors.address = `L'adresse ne doit pas depasser ${MAX_ADDRESS_LENGTH} caracteres.`;
    }
  } else if (normalizedAddress && normalizedAddress.length > MAX_ADDRESS_LENGTH) {
    errors.address = `L'adresse ne doit pas depasser ${MAX_ADDRESS_LENGTH} caracteres.`;
  }

  if (requireLocation) {
    if (!normalizedRawLocation) {
      errors.location = "La ville est obligatoire.";
    } else if (normalizedRawLocation.length < 2) {
      errors.location = "La ville doit contenir au moins 2 caracteres.";
    } else if (normalizedRawLocation.length > MAX_LOCATION_LENGTH) {
      errors.location = `La ville ne doit pas depasser ${MAX_LOCATION_LENGTH} caracteres.`;
    }
  } else if (normalizedRawLocation) {
    if (normalizedRawLocation.length < 2) {
      errors.location = "La ville doit contenir au moins 2 caracteres.";
    } else if (normalizedRawLocation.length > MAX_LOCATION_LENGTH) {
      errors.location = `La ville ne doit pas depasser ${MAX_LOCATION_LENGTH} caracteres.`;
    }
  } else if (normalizedLocation.length > MAX_LOCATION_LENGTH) {
    errors.location = `La localisation ne doit pas depasser ${MAX_LOCATION_LENGTH} caracteres.`;
  }

  if (normalizedNote.length > MAX_NOTE_LENGTH) {
    errors.note = `La note ne doit pas depasser ${MAX_NOTE_LENGTH} caracteres.`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    customer: {
      name: normalizedName || "Client",
      phone: normalizedPhone,
      address: normalizedAddress,
      location: normalizedLocation || businessInfo.city,
      note: normalizedNote,
    },
  };
};
