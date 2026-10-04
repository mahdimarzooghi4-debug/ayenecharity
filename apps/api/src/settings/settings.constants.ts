export const SETTINGS = {
  centerName: {
    key: "center.name",
    section: "center",
    label: "نام مرکز",
    defaultValue: "مرکز نیکوکاری آینه",
    public: true,
  },
  parentOrganization: {
    key: "center.parentOrganization",
    section: "center",
    label: "نام مجموعه مادر",
    defaultValue: "خانه خلاق آینه",
    public: true,
  },
  centerAddress: {
    key: "center.address",
    section: "center",
    label: "آدرس",
    defaultValue: "",
    public: true,
  },
  centerPhone: {
    key: "center.phone",
    section: "center",
    label: "شماره تماس",
    defaultValue: "",
    public: true,
  },
  centerEmail: {
    key: "center.email",
    section: "center",
    label: "ایمیل",
    defaultValue: "",
    public: true,
  },
  cardNumber: {
    key: "contribution.cardNumber",
    section: "contribution",
    label: "شماره کارت",
    defaultValue: "",
    public: true,
  },
  accountHolderName: {
    key: "contribution.accountHolderName",
    section: "contribution",
    label: "نام صاحب حساب",
    defaultValue: "",
    public: true,
  },
  instagram: {
    key: "social.instagram",
    section: "social",
    label: "Instagram",
    defaultValue: "",
    public: true,
  },
  bale: {
    key: "social.bale",
    section: "social",
    label: "Bale",
    defaultValue: "",
    public: true,
  },
  telegram: {
    key: "social.telegram",
    section: "social",
    label: "Telegram",
    defaultValue: "",
    public: true,
  },
} as const;

export type SettingName = keyof typeof SETTINGS;
export type SettingSection =
  (typeof SETTINGS)[SettingName]["section"];
export type SettingKey = (typeof SETTINGS)[SettingName]["key"];

export const SETTING_KEYS = Object.values(SETTINGS).map(
  (item) => item.key,
) as SettingKey[];

export const PUBLIC_SETTING_KEYS_V1 = Object.values(SETTINGS)
  .filter((item) => item.public)
  .map((item) => item.key) as SettingKey[];

export function settingsDefaults(): Record<SettingName, string> {
  return Object.fromEntries(
    Object.entries(SETTINGS).map(([name, definition]) => [
      name,
      definition.defaultValue,
    ]),
  ) as Record<SettingName, string>;
}
