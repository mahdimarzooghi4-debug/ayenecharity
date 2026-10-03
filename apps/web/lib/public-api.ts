export interface PublicHeroSlide {
  id: string;
  title: string;
  description: string;
  ctaLabel: string | null;
  ctaTarget: string | null;
  displayOrder: number;
  imageUrl: string;
}

export interface PublicProjectPreview {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  imageUrl: string | null;
}

export interface PublicTransparencyPreview {
  type: "PERFORMANCE_REPORT" | "LICENSE" | "FINANCIAL_DOCUMENT";
  label: string;
  count: number;
}

export type PublicSettings = Record<string, unknown>;

export interface PublicHomeData {
  heroSlides: PublicHeroSlide[];
  projects: PublicProjectPreview[];
  transparency: PublicTransparencyPreview[];
  settings: PublicSettings;
}

const API_BASE = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3001"
).replace(/\/+$/, "");

export async function loadPublicHome(): Promise<PublicHomeData> {
  try {
    const response = await fetch(API_BASE + "/api/public/home", {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Public homepage API returned " + response.status);
    }

    return (await response.json()) as PublicHomeData;
  } catch {
    return {
      heroSlides: [],
      projects: [],
      transparency: [
        { type: "PERFORMANCE_REPORT", label: "گزارش عملکرد", count: 0 },
        { type: "LICENSE", label: "مجوزها", count: 0 },
        { type: "FINANCIAL_DOCUMENT", label: "اسناد مالی", count: 0 },
      ],
      settings: {},
    };
  }
}

export function publicSetting(
  settings: PublicSettings,
  key: string,
): string | null {
  const value = settings[key];

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function safeExternalUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}
