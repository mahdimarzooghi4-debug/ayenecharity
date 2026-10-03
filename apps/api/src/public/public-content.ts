import type { Prisma } from "@prisma/client";

export const PUBLIC_HOME_SETTING_KEYS = [
  "center.address",
  "center.phone",
  "center.email",
  "social.instagram",
  "social.bale",
  "social.telegram",
] as const;

export const PUBLIC_CONTRIBUTION_SETTING_KEYS = [
  "contribution.cardNumber",
  "contribution.cardHolder",
] as const;

export const PUBLIC_SETTING_KEYS = [
  ...PUBLIC_HOME_SETTING_KEYS,
  ...PUBLIC_CONTRIBUTION_SETTING_KEYS,
] as const;

export type PublicSettingKey = (typeof PUBLIC_SETTING_KEYS)[number];

export function normalizePublicSettings(
  rows: Array<{ key: string; value: Prisma.JsonValue }>,
  allowedKeys: readonly string[] = PUBLIC_SETTING_KEYS,
): Partial<Record<PublicSettingKey, Prisma.JsonValue>> {
  const allowed = new Set<string>(allowedKeys);
  const output: Partial<Record<PublicSettingKey, Prisma.JsonValue>> = {};

  for (const row of rows) {
    if (!allowed.has(row.key)) continue;
    output[row.key as PublicSettingKey] = row.value;
  }

  return output;
}
