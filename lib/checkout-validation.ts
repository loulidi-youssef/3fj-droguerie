import { businessInfo } from "@/data/business";

export type CheckoutCustomerInput = {
  name: string;
  phone: string;
  address: string;
  location: string;
};

export type CheckoutField = keyof CheckoutCustomerInput;

export type CheckoutFieldErrors = Partial<Record<CheckoutField, string>>;

type CheckoutCustomerValidationResult = {
  isValid: boolean;
  errors: CheckoutFieldErrors;
  customer: CheckoutCustomerInput;
};

const normalizeText = (value: string): string => {
  return value.trim().replace(/\s+/g, " ");
};

const MAX_NAME_LENGTH = 120;
const MAX_PHONE_LENGTH = 20;
const MAX_ADDRESS_LENGTH = 240;
const MAX_LOCATION_LENGTH = 120;

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
): CheckoutCustomerValidationResult => {
  const normalizedName = normalizeText(input.name);
  const normalizedPhone = input.phone.trim();
  const normalizedAddress = normalizeText(input.address);
  const normalizedLocation = normalizeText(input.location || businessInfo.city);

  const errors: CheckoutFieldErrors = {};

  if (!normalizedName) {
    errors.name = "Le nom complet est obligatoire.";
  } else if (normalizedName.length < 4) {
    errors.name = "Le nom complet doit contenir au moins 4 caracteres.";
  } else if (normalizedName.length > MAX_NAME_LENGTH) {
    errors.name = `Le nom complet ne doit pas depasser ${MAX_NAME_LENGTH} caracteres.`;
  }

  if (!normalizedPhone) {
    errors.phone = "Le numero de telephone est obligatoire.";
  } else if (normalizedPhone.length > MAX_PHONE_LENGTH) {
    errors.phone = `Le numero ne doit pas depasser ${MAX_PHONE_LENGTH} caracteres.`;
  } else if (!isValidMoroccanPhone(normalizedPhone)) {
    errors.phone =
      "Numero invalide. Utilisez un numero marocain (ex: 06XXXXXXXX ou +2126XXXXXXXX).";
  }

  if (!normalizedAddress) {
    errors.address = "L'adresse est obligatoire.";
  } else if (normalizedAddress.length < 8) {
    errors.address = "L'adresse doit contenir au moins 8 caracteres.";
  } else if (normalizedAddress.length > MAX_ADDRESS_LENGTH) {
    errors.address = `L'adresse ne doit pas depasser ${MAX_ADDRESS_LENGTH} caracteres.`;
  }

  if (input.location.trim() && normalizedLocation.length < 2) {
    errors.location = "La localisation doit contenir au moins 2 caracteres.";
  } else if (normalizedLocation.length > MAX_LOCATION_LENGTH) {
    errors.location = `La localisation ne doit pas depasser ${MAX_LOCATION_LENGTH} caracteres.`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    customer: {
      name: normalizedName,
      phone: normalizedPhone,
      address: normalizedAddress,
      location: normalizedLocation || businessInfo.city,
    },
  };
};
