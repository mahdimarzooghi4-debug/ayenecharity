import type { Metadata } from "next";
import Link from "next/link";

import { PublicShell } from "../components/public-shell";
import { loadPublicProjects, loadSiteSettings } from "../../lib/public-api";
import styles from "./projects.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "طرح‌های نیکوکاری | مرکز نیکوکاری آینه",
  description: "طرح‌های فعال مرکز نیکوکاری آینه و مسیرهای همراهی با هر طرح.",
};

export default async function ProjectsPage() {
  const [projects, settings] = await Promise.all([
    loadPublicProjects(),
    loadSiteSettings(),
  ]);

  return (
    <PublicShell settings={settings} activeNav="projects">
      <main>
        <section className={styles.internalHero}>
          <span className={styles.internalEyebrow}>طرح‌های نیکوکاری</span>
          <h1>یک مسیر را برای همراهی انتخاب کنید</h1>
          <p>هر طرح، مسیر مستقلی برای ایجاد یک اثر واقعی است.</p>
        </section>

        <section className={styles.projectsSection} id="active-projects" aria-labelledby="projects-title">
          <div className={styles.sectionHeader}>
            <h2 id="projects-title">طرح‌های فعال</h2>
            <p>هر طرح مستقل است و مسیر همراهی مشخص خود را دارد.</p>
          </div>

          <div className={styles.projectsGrid}>
            {projects.items.length > 0 ? (
              projects.items.map((project) => (
                <article className={styles.projectCard} key={project.id}>
                  <div className={styles.projectCardContent}>
                    <span className={styles.statusBadge}>طرح فعال</span>
                    <h3>{project.title}</h3>
                    {project.shortDescription ? (
                      <p className={styles.projectDescription}>{project.shortDescription}</p>
                    ) : null}
                    <p className={styles.participationMethod}>
                      شیوه مشارکت: واریز به شماره کارت
                    </p>
                    <Link
                      className={styles.projectAction}
                      href={"/projects/" + encodeURIComponent(project.slug)}
                    >
                      مشاهده طرح
                    </Link>
                  </div>

                  {project.imageUrl ? (
                    <img
                      className={styles.projectImage}
                      src={project.imageUrl}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <span className={styles.projectImageFallback} aria-hidden="true">
                      <img src="/brand/logo.png" alt="" width={62} height={62} />
                    </span>
                  )}
                </article>
              ))
            ) : (
              <div className={styles.emptyState}>
                در حال حاضر طرح فعالی برای نمایش عمومی منتشر نشده است.
              </div>
            )}
          </div>
        </section>

        <section className={styles.projectsCta} aria-label="دعوت به همراهی">
          <Link className={styles.projectsCtaLink} href="#active-projects">
            مشاهده طرح‌ها
          </Link>
          <h2>یک همراهی کوچک، می‌تواند یک اثر واقعی بسازد</h2>
        </section>
      </main>
    </PublicShell>
  );
}
