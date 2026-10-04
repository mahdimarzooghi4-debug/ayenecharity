import type { Metadata } from "next";

const DEFAULT_SITE_URL = "http://localhost:3000";
export const SITE_NAME = "مرکز نیکوکاری آینه";
export const SITE_DESCRIPTION =
  "وب‌سایت رسمی مرکز نیکوکاری آینه؛ معرفی طرح‌های نیکوکاری، گزارش‌های شفافیت و مسیرهای همکاری.";

export function siteUrl(): URL {
  const configured =
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    DEFAULT_SITE_URL;

  try {
    const url = new URL(configured);
    url.pathname = "/";
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}

export function staticPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "fa_IR",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
