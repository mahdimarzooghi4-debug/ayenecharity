import type { Prisma } from "@prisma/client";

export const PUBLIC_SETTING_KEYS = [
  "center.address",
  "center.phone",
  "center.email",
  "social.instagram",
  "social.bale",
  "social.telegram",
  "contribution.cardNumber",
  "contribution.cardHolder",
] as const;

export type PublicSettingKey = (typeof PUBLIC_SETTING_KEYS)[number];

export function normalizePublicSettings(
  rows: Array<{ key: string; value: Prisma.JsonValue }>,
): Partial<Record<PublicSettingKey, Prisma.JsonValue>> {
  const allowed = new Set<string>(PUBLIC_SETTING_KEYS);
  const output: Partial<Record<PublicSettingKey, Prisma.JsonValue>> = {};

  for (const row of rows) {
    if (!allowed.has(row.key)) continue;
    output[row.key as PublicSettingKey] = row.value;
  }

  return output;
}
