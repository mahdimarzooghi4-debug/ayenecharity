const MAX_POSTGRES_BIGINT = 9_223_372_036_854_775_807n;

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeLocalizedDigits(value: string): string {
  return [...value]
    .map((character) => {
      const persianIndex = PERSIAN_DIGITS.indexOf(character);
      if (persianIndex >= 0) return String(persianIndex);

      const arabicIndex = ARABIC_DIGITS.indexOf(character);
      if (arabicIndex >= 0) return String(arabicIndex);

      return character;
    })
    .join("");
}

export function normalizeIranianMobile(value: string): string {
  const normalized = normalizeLocalizedDigits(value.trim()).replace(/[\s()-]/g, "");

  if (normalized.startsWith("+98")) {
    return "0" + normalized.slice(3);
  }

  if (normalized.startsWith("0098")) {
    return "0" + normalized.slice(4);
  }

  if (normalized.startsWith("98")) {
    return "0" + normalized.slice(2);
  }

  return normalized;
}

export function normalizeRialAmountInput(value: string): string {
  return normalizeLocalizedDigits(value.trim()).replace(/[\s,٬،]/g, "");
}

export class InvalidRialAmountError extends Error {}

export function parsePositiveRialAmount(value: string): bigint {
  const normalized = normalizeRialAmountInput(value);

  if (!/^[0-9]+$/.test(normalized)) {
    throw new InvalidRialAmountError("Amount must contain digits only.");
  }

  const amount = BigInt(normalized);

  if (amount <= 0n) {
    throw new InvalidRialAmountError("Amount must be greater than zero.");
  }

  if (amount > MAX_POSTGRES_BIGINT) {
    throw new InvalidRialAmountError("Amount is too large.");
  }

  return amount;
}
