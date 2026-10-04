export const COOPERATION_REQUEST_TYPES = [
  "VOLUNTEER",
  "ORGANIZATIONAL",
  "PROJECT_PROPOSAL",
] as const;

export type CooperationRequestType =
  (typeof COOPERATION_REQUEST_TYPES)[number];

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

export function normalizeContactPhone(value: string): string {
  const normalizedDigits = value
    .split("")
    .map((char) => {
      const persianIndex = persianDigits.indexOf(char);
      if (persianIndex >= 0) return String(persianIndex);

      const arabicIndex = arabicDigits.indexOf(char);
      if (arabicIndex >= 0) return String(arabicIndex);

      return char;
    })
    .join("");

  const trimmed = normalizedDigits.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^0-9]/g, "");
  return (hasPlus ? "+" : "") + digits;
}
