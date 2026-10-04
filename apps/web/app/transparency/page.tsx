import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "../components/public-shell";
import {
  loadPublicTransparency,
  loadSiteSettings,
  type PublicTransparencyCategory,
  type PublicTransparencyDocument,
  type PublicTransparencyType,
} from "../../lib/public-api";
import { staticPageMetadata } from "../../lib/seo";
import styles from "./transparency.module.css";

export const revalidate = 60;

export const metadata: Metadata = staticPageMetadata({
  title: "شفافیت و گزارش‌ها | مرکز نیکوکاری آینه",
  description:
    "گزارش‌های عملکرد، مجوزها و اسناد مالی منتشرشده مرکز نیکوکاری آینه.",
  path: "/transparency",
});

const faNumber = new Intl.NumberFormat("fa-IR");
const faDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const iconByType: Record<PublicTransparencyType, string> = {
  PERFORMANCE_REPORT: "/transparency/clipboard-check.svg",
  LICENSE: "/transparency/shield-check.svg",
  FINANCIAL_DOCUMENT: "/transparency/file-spreadsheet.svg",
};

function documentDate(document: PublicTransparencyDocument): string | null {
  const value = document.documentDate ?? document.publishedAt;
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return faDate.format(date);
}

function DocumentRow({
  document,
}: {
  document: PublicTransparencyDocument;
}) {
  const date = documentDate(document);

  return (
    <article className={styles.documentRow}>
      <h3>{document.title}</h3>
      <div className={styles.documentMeta}>
        {date ? <span>تاریخ: {date}</span> : null}
        {document.project ? (
          <Link href={"/projects/" + encodeURIComponent(document.project.slug)}>
            طرح {document.project.title}
          </Link>
        ) : null}
      </div>
      {document.description ? <p>{document.description}</p> : null}
      {document.fileUrl ? (
        <a
          className={styles.documentAction}
          href={document.fileUrl}
          target="_blank"
          rel="noreferrer"
        >
          مشاهده
        </a>
      ) : (
        <span className={styles.documentUnavailable}>
          فایل عمومی در دسترس نیست
        </span>
      )}
    </article>
  );
}

function CategoryCard({
  category,
}: {
  category: PublicTransparencyCategory;
}) {
  const count = category.documents.length;

  return (
    <section className={styles.categoryCard}>
      <header className={styles.categoryHeader}>
        <span className={styles.categoryBadge}>
          {count > 0
            ? faNumber.format(count) + " سند منتشرشده"
            : "در حال تکمیل"}
        </span>
        <h2>{category.label}</h2>
        <span className={styles.categoryIcon}>
          <img
            src={iconByType[category.type]}
            alt=""
            width={20}
            height={20}
          />
        </span>
      </header>

      <p className={styles.categoryDescription}>{category.description}</p>

      <div className={styles.documents}>
        {count > 0 ? (
          category.documents.map((document) => (
            <DocumentRow document={document} key={document.id} />
          ))
        ) : (
          <p className={styles.emptyCategory}>
            هنوز سند تأییدشده‌ای در این دسته منتشر نشده است.
          </p>
        )}
      </div>
    </section>
  );
}

export default async function TransparencyPage() {
  const [data, settings] = await Promise.all([
    loadPublicTransparency(),
    loadSiteSettings(),
  ]);

  return (
    <PublicShell settings={settings} activeNav="transparency">
      <main id="main-content">
        <section className={styles.hero}>
          <span className={styles.eyebrow}>شفافیت</span>
          <h1>شفافیت، بخشی از کار ماست</h1>
          <p>
            اطلاعات رسمی، گزارش‌ها و اسناد مرتبط با فعالیت‌های مرکز در این بخش
            منتشر می‌شوند.
          </p>
        </section>

        <section className={styles.content} aria-labelledby="documents-title">
          <div className={styles.sectionHeader}>
            <h2 id="documents-title">اسناد و گزارش‌ها</h2>
            <p>
              داده‌های این بخش تنها پس از تکمیل و تأیید رسمی منتشر می‌شوند.
            </p>
          </div>

          <div className={styles.categoryGrid}>
            {data.categories.map((category) => (
              <CategoryCard category={category} key={category.type} />
            ))}
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
