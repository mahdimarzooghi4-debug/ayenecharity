import Link from "next/link";

import { HeroSlider } from "./components/hero-slider";
import { PublicShell } from "./components/public-shell";
import styles from "./home.module.css";
import {
  loadPublicHome,
  type PublicTransparencyPreview,
} from "../lib/public-api";

export const dynamic = "force-dynamic";

const faNumber = new Intl.NumberFormat("fa-IR");

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

const transparencyMeta: Record<
  PublicTransparencyPreview["type"],
  { description: string; icon: string; action: string }
> = {
  PERFORMANCE_REPORT: {
    description: "گزارش فعالیت‌ها و نتیجه اجرای طرح‌های نیکوکاری",
    icon: "/brand/file-text.svg",
    action: "مشاهده گزارش‌ها",
  },
  LICENSE: {
    description: "مجوزها و اطلاعات رسمی مرکز",
    icon: "/brand/shield.svg",
    action: "مشاهده مجوزها",
  },
  FINANCIAL_DOCUMENT: {
    description: "اسناد و مدارک مالی مرتبط با فعالیت‌های نیکوکاری",
    icon: "/brand/clipboard.svg",
    action: "مشاهده اسناد",
  },
};

export default async function HomePage() {
  const data = await loadPublicHome();

  return (
    <PublicShell settings={data.settings}>
      <main>
        <section className={styles.hero} aria-labelledby="home-title">
          <HeroSlider slides={data.heroSlides} />

          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>مرکز نیکوکاری آینه</div>
            <h1 id="home-title">از نیت خیر تا اثر واقعی</h1>
            <p className={styles.heroLead}>
              طرح‌های فعال نیکوکاری را ببینید و در مسیری که برایتان مهم است همراه شوید.
            </p>
            <div className={styles.heroActions}>
              <Link
                className={`${styles.primaryButton} ${styles.largeButton}`}
                href="/projects"
              >
                مشاهده طرح‌های فعال
              </Link>
              <Link
                className={`${styles.secondaryButton} ${styles.largeButton}`}
                href="/about"
              >
                درباره آینه
              </Link>
            </div>
          </div>
        </section>

        <section
          className={`${styles.section} ${styles.servicesSection}`}
          id="services"
          aria-labelledby="services-title"
        >
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>خدمات</span>
            <h2 id="services-title">زیرساخت یک نیکوکاری شفاف</h2>
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

        <section
          className={`${styles.section} ${styles.projectsSection}`}
          id="projects"
          aria-labelledby="projects-title"
        >
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>طرح‌ها</span>
            <h2 id="projects-title">این طرح‌ها منتظر همراهی‌اند</h2>
          </div>

          <div className={styles.projectGrid}>
            {data.projects.length > 0 ? (
              data.projects.map((project) => (
                <article className={styles.projectCard} key={project.id}>
                  <div className={styles.projectContent}>
                    <span className={styles.projectBadge}>طرح فعال</span>
                    <h3>{project.title}</h3>
                    {project.shortDescription ? <p>{project.shortDescription}</p> : null}
                    <Link
                      className={styles.projectLink}
                      href={"/projects/" + encodeURIComponent(project.slug)}
                    >
                      مشاهده طرح
                    </Link>
                  </div>

                  {project.imageUrl ? (
                    <img
                      className={styles.projectMedia}
                      src={project.imageUrl}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <span className={styles.projectMediaFallback} aria-hidden="true">
                      <img src="/brand/logo.png" alt="" width={58} height={58} />
                    </span>
                  )}
                </article>
              ))
            ) : (
              <div className={styles.emptyState}>
                در حال حاضر طرحی برای نمایش عمومی منتشر نشده است.
              </div>
            )}
          </div>

          <div className={styles.sectionAction}>
            <Link className={`${styles.secondaryButton} ${styles.largeButton}`} href="/projects">
              مشاهده همه طرح‌ها
            </Link>
          </div>
        </section>

        <section
          className={`${styles.section} ${styles.transparencySection}`}
          id="transparency"
          aria-labelledby="transparency-title"
        >
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>شفافیت</span>
            <h2 id="transparency-title">اثر مشارکت، قابل پیگیری است</h2>
            <p>گزارش فعالیت‌ها، مجوزها و مستندات مرکز در دسترس شماست.</p>
          </div>

          <div className={styles.transparencyGrid}>
            {data.transparency.map((item) => {
              const meta = transparencyMeta[item.type];

              return (
                <article className={styles.transparencyCard} key={item.type}>
                  <div className={styles.transparencyCardHeader}>
                    <span className={styles.transparencyIcon}>
                      <img src={meta.icon} alt="" width={18} height={18} />
                    </span>
                    <h3>{item.label}</h3>
                  </div>
                  <p>{meta.description}</p>
                  <div className={styles.transparencyFooter}>
                    <Link className={styles.transparencyLink} href="/transparency">
                      {meta.action}
                    </Link>
                    <span className={styles.transparencyBadge}>
                      {item.count > 0
                        ? faNumber.format(item.count) + " مورد منتشرشده"
                        : "در دست تکمیل"}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.cta} aria-label="مشاهده طرح‌های نیکوکاری">
          <Link className={styles.secondaryButton} href="/projects">
            مشاهده طرح‌ها
          </Link>
          <h2>یک همراهی کوچک، می‌تواند یک اثر واقعی بسازد</h2>
        </section>
      </main>
    </PublicShell>
  );
}
