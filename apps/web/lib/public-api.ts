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

export interface PublicProjectReport {
  id: string;
  title: string;
  type: "PERFORMANCE_REPORT" | "LICENSE" | "FINANCIAL_DOCUMENT";
  description: string | null;
  documentDate: string | null;
  publishedAt: string | null;
  fileUrl: string | null;
}

export interface PublicProjectDetail extends PublicProjectPreview {
  description: string | null;
  publishedAt: string | null;
  reports: PublicProjectReport[];
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

export interface PublicProjectsData {
  items: PublicProjectPreview[];
}

export type PublicProjectLoadResult =
  | { status: "ok"; project: PublicProjectDetail }
  | { status: "not-found" }
  | { status: "unavailable" };

const API_BASE = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3001"
).replace(/\/+$/, "");

async function publicFetch(path: string): Promise<Response> {
  return fetch(API_BASE + path, {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });
}

export async function loadPublicHome(): Promise<PublicHomeData> {
  try {
    const response = await publicFetch("/api/public/home");

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

export async function loadSiteSettings(): Promise<PublicSettings> {
  try {
    const response = await publicFetch("/api/public/site-settings");
    if (!response.ok) {
      throw new Error("Public site settings API returned " + response.status);
    }
    return (await response.json()) as PublicSettings;
  } catch {
    return {};
  }
}

export async function loadPublicProjects(): Promise<PublicProjectsData> {
  try {
    const response = await publicFetch("/api/public/projects");
    if (!response.ok) {
      throw new Error("Public projects API returned " + response.status);
    }
    return (await response.json()) as PublicProjectsData;
  } catch {
    return { items: [] };
  }
}

export async function loadPublicProject(slug: string): Promise<PublicProjectLoadResult> {
  try {
    const response = await publicFetch(
      "/api/public/projects/" + encodeURIComponent(slug),
    );

    if (response.status === 404) {
      return { status: "not-found" };
    }

    if (!response.ok) {
      return { status: "unavailable" };
    }

    return {
      status: "ok",
      project: (await response.json()) as PublicProjectDetail,
    };
  } catch {
    return { status: "unavailable" };
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
