import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "../components/public-shell";
import { loadSiteSettings } from "../../lib/public-api";
import { staticPageMetadata } from "../../lib/seo";
import styles from "../home.module.css";

export const revalidate = 60;

export const metadata: Metadata = staticPageMetadata({
  title: "درباره ما | مرکز نیکوکاری آینه",
  description:
    "درباره مرکز نیکوکاری آینه و مسیر شفاف اجرای طرح‌های نیکوکاری.",
  path: "/about",
});

export default async function AboutPage() {
  const settings = await loadSiteSettings();

  return (
    <PublicShell settings={settings} activeNav="about">
      <main id="main-content">
        <section
          className={`${styles.section} ${styles.servicesSection}`}
          aria-labelledby="about-title"
        >
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>درباره ما</span>
            <h1 id="about-title">مرکز نیکوکاری آینه</h1>
            <p>
              آینه بستری برای اجرای فعالیت‌های نیکوکاری، مدیریت مشارکت‌های
              مردمی و انتشار گزارش‌های قابل پیگیری است.
            </p>
          </div>

          <div className={styles.serviceGrid}>
            <article className={styles.serviceCard}>
              <span className={styles.serviceAccent} />
              <div className={styles.serviceCardHeader}>
                <strong>طرح‌های مشخص</strong>
                <span className={styles.serviceIcon}>
                  <img src="/brand/activity.svg" alt="" width={14} height={14} />
                </span>
              </div>
              <p>هر طرح مسیر مستقل خود را برای اجرا و همراهی دارد.</p>
            </article>

            <article className={styles.serviceCard}>
              <span className={styles.serviceAccent} />
              <div className={styles.serviceCardHeader}>
                <strong>شفافیت</strong>
                <span className={styles.serviceIcon}>
                  <img src="/brand/file-text.svg" alt="" width={14} height={14} />
                </span>
              </div>
              <p>گزارش‌ها و مستندات منتشرشده از بخش شفافیت قابل مشاهده‌اند.</p>
            </article>

            <article className={styles.serviceCard}>
              <span className={styles.serviceAccent} />
              <div className={styles.serviceCardHeader}>
                <strong>همکاری</strong>
                <span className={styles.serviceIcon}>
                  <img src="/brand/heart.svg" alt="" width={14} height={14} />
                </span>
              </div>
              <p>مسیر ارتباط و همکاری با مرکز از بخش تماس در دسترس است.</p>
            </article>
          </div>

          <div className={styles.sectionAction}>
            <Link
              className={`${styles.primaryButton} ${styles.largeButton}`}
              href="/contact"
            >
              ارتباط با ما
            </Link>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
