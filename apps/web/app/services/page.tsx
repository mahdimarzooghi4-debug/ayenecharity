import type { Metadata } from "next";

import { PublicShell } from "../components/public-shell";
import { loadSiteSettings } from "../../lib/public-api";
import { staticPageMetadata } from "../../lib/seo";
import styles from "../home.module.css";

export const revalidate = 60;

export const metadata: Metadata = staticPageMetadata({
  title: "خدمات | مرکز نیکوکاری آینه",
  description:
    "خدمات مرکز نیکوکاری آینه برای اجرای طرح‌ها، مدیریت مشارکت‌ها و گزارش‌دهی شفاف.",
  path: "/services",
});

const services = [
  {
    title: "مجوز و چارچوب رسمی",
    description: "بستر رسمی برای اجرای فعالیت‌های نیکوکاری.",
    icon: "/brand/shield.svg",
  },
  {
    title: "مدیریت مشارکت‌ها",
    description: "دریافت و مدیریت شفاف مشارکت‌های مردمی.",
    icon: "/brand/wallet.svg",
  },
  {
    title: "اجرای طرح‌ها",
    description: "برنامه‌ریزی و اجرای حرفه‌ای فعالیت‌های خیرخواهانه.",
    icon: "/brand/activity.svg",
  },
  {
    title: "گزارش و پیگیری",
    description: "ثبت مستندات و گزارش نتیجه فعالیت‌ها.",
    icon: "/brand/file-text.svg",
  },
] as const;

export default async function ServicesPage() {
  const settings = await loadSiteSettings();

  return (
    <PublicShell settings={settings} activeNav="services">
      <main id="main-content">
        <section
          className={`${styles.section} ${styles.servicesSection}`}
          aria-labelledby="services-title"
        >
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>خدمات</span>
            <h1 id="services-title">زیرساخت یک نیکوکاری شفاف</h1>
            <p>
              از مدیریت مشارکت تا اجرای طرح و گزارش نتیجه، مسیر فعالیت‌ها
              قابل پیگیری طراحی شده است.
            </p>
          </div>

          <div className={styles.serviceGrid}>
            {services.map((service) => (
              <article className={styles.serviceCard} key={service.title}>
                <span className={styles.serviceAccent} />
                <div className={styles.serviceCardHeader}>
                  <strong>{service.title}</strong>
                  <span className={styles.serviceIcon}>
                    <img src={service.icon} alt="" width={14} height={14} />
                  </span>
                </div>
                <p>{service.description}</p>
              </article>
            ))}
          </div>

          <div className={styles.flow} aria-label="مسیر مشارکت تا گزارش">
            <div className={styles.flowStep}>
              <span className={styles.flowIcon}>
                <img src="/brand/heart.svg" alt="" width={18} height={18} />
              </span>
              <span>مشارکت</span>
            </div>
            <span className={styles.flowDivider} />
            <div className={styles.flowStep}>
              <span className={styles.flowIcon}>
                <img src="/brand/activity.svg" alt="" width={18} height={18} />
              </span>
              <span>اجرا</span>
            </div>
            <span className={styles.flowDivider} />
            <div className={styles.flowStep}>
              <span className={styles.flowIcon}>
                <img src="/brand/file-text.svg" alt="" width={18} height={18} />
              </span>
              <span>گزارش</span>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
