export const HOME_CONTENT = {
  heroTitle: {
    key: "home.hero.title",
    label: "عنوان Hero",
    defaultValue: "از نیت خیر تا اثر واقعی",
    maxLength: 160,
  },
  heroDescription: {
    key: "home.hero.description",
    label: "توضیح Hero",
    defaultValue:
      "طرح‌های فعال نیکوکاری را ببینید و در مسیری که برایتان مهم است همراه شوید.",
    maxLength: 360,
  },
  servicesTitle: {
    key: "home.services.title",
    label: "عنوان خدمات",
    defaultValue: "زیرساخت یک نیکوکاری شفاف",
    maxLength: 160,
  },
  projectsTitle: {
    key: "home.projects.title",
    label: "عنوان طرح‌ها",
    defaultValue: "این طرح‌ها منتظر همراهی‌اند",
    maxLength: 160,
  },
  finalCtaText: {
    key: "home.finalCta.text",
    label: "متن CTA نهایی",
    defaultValue: "یک همراهی کوچک، می‌تواند یک اثر واقعی بسازد",
    maxLength: 220,
  },
} as const;

export type HomeContentName = keyof typeof HOME_CONTENT;
export type HomeContentKey =
  (typeof HOME_CONTENT)[HomeContentName]["key"];

export const HOME_CONTENT_KEYS = Object.values(HOME_CONTENT).map(
  (item) => item.key,
) as HomeContentKey[];

export function isHomeContentKey(value: string): value is HomeContentKey {
  return HOME_CONTENT_KEYS.includes(value as HomeContentKey);
}

export function homeContentDefinition(key: HomeContentKey) {
  return Object.values(HOME_CONTENT).find((item) => item.key === key)!;
}

export function defaultHomeContent(): Record<HomeContentName, string> {
  return Object.fromEntries(
    Object.entries(HOME_CONTENT).map(([name, item]) => [
      name,
      item.defaultValue,
    ]),
  ) as Record<HomeContentName, string>;
}
