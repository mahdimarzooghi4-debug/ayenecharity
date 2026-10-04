import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { PublicShell } from "../../components/public-shell";
import {
  loadContributionSettings,
  loadPublicProject,
  loadSiteSettings,
  type PublicProjectReport,
} from "../../../lib/public-api";
import { ContributionDialogButton } from "./contribution-dialog";
import styles from "../projects.module.css";

export const dynamic = "force-dynamic";

const getProject = cache(loadPublicProject);

const persianDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function reportDate(report: PublicProjectReport): string {
  const value = report.documentDate ?? report.publishedAt;
  if (!value) return "تاریخ ثبت نشده";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "تاریخ ثبت نشده";

  return "تاریخ: " + persianDate.format(date);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProject(slug);

  if (result.status !== "ok") {
    return {
      title: "طرح نیکوکاری | مرکز نیکوکاری آینه",
    };
  }

  return {
    title: result.project.title + " | مرکز نیکوکاری آینه",
    description: result.project.shortDescription ?? undefined,
  };
}

function ReportCard({ report }: { report: PublicProjectReport }) {
  const content = (
    <>
      <span className={styles.reportBadge}>منتشر شده</span>
      <h3>{report.title}</h3>
      <p className={styles.reportDate}>{reportDate(report)}</p>
    </>
  );

  if (report.fileUrl) {
    return (
      <a
        className={styles.reportCard}
        href={report.fileUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={"مشاهده " + report.title}
      >
        {content}
      </a>
    );
  }

  return <article className={styles.reportCard}>{content}</article>;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [result, settings, contributionSettings] = await Promise.all([
    getProject(slug),
    loadSiteSettings(),
    loadContributionSettings(),
  ]);

  if (result.status === "not-found") {
    notFound();
  }

  if (result.status === "unavailable") {
    return (
      <PublicShell settings={settings} activeNav="projects">
        <main>
          <section className={styles.internalHero}>
            <span className={styles.internalEyebrow}>طرح‌های نیکوکاری</span>
            <h1>اطلاعات طرح در دسترس نیست</h1>
            <p>دریافت اطلاعات این طرح در حال حاضر ممکن نیست.</p>
          </section>
          <section className={styles.projectsSection}>
            <div className={styles.unavailableState}>
              لطفاً کمی بعد دوباره تلاش کنید.
            </div>
          </section>
        </main>
      </PublicShell>
    );
  }

  const project = result.project;

  return (
    <PublicShell settings={settings} activeNav="projects">
      <main>
        <section className={styles.detailHero}>
          <div className={styles.detailIntro}>
            <span className={styles.breadcrumb}>طرح‌ها&nbsp;&nbsp;/&nbsp;&nbsp;{project.title}</span>
            <span className={styles.statusBadge}>طرح فعال</span>
            <h1>{project.title}</h1>
            {project.shortDescription ? (
              <p className={styles.detailLead}>{project.shortDescription}</p>
            ) : null}
            <ContributionDialogButton
              projectId={project.id}
              projectTitle={project.title}
              cardNumber={contributionSettings.cardNumber}
              cardHolder={contributionSettings.cardHolder}
              variant="primary"
            />
          </div>

          {project.imageUrl ? (
            <img className={styles.detailImage} src={project.imageUrl} alt="" />
          ) : (
            <span className={styles.detailImageFallback} aria-hidden="true">
              <img src="/brand/logo.png" alt="" width={88} height={88} />
            </span>
          )}
        </section>

        <section className={styles.aboutSection} aria-labelledby="about-project-title">
          <h2 className={styles.detailSectionTitle} id="about-project-title">
            درباره این طرح
          </h2>
          <p className={styles.aboutText}>
            {project.description ?? "اطلاعات تکمیلی این طرح هنوز منتشر نشده است."}
          </p>
        </section>

        <section className={styles.functionSection} aria-labelledby="function-title">
          <h2 className={styles.detailSectionTitle} id="function-title">
            این طرح چه کاری انجام می‌دهد؟
          </h2>

          <div className={styles.infoGrid}>
            <article className={styles.infoCard}>
              <div className={styles.infoHeader}>
                <strong>نوع حمایت</strong>
                <span className={styles.infoIcon}>
                  <img src="/brand/heart-handshake.svg" alt="" width={17} height={17} />
                </span>
              </div>
              <p>پشتیبانی از فعالیت‌های اجتماعی و نیکوکاری.</p>
            </article>

            <article className={styles.infoCard}>
              <div className={styles.infoHeader}>
                <strong>جامعه هدف</strong>
                <span className={styles.infoIcon}>
                  <img src="/brand/users.svg" alt="" width={17} height={17} />
                </span>
              </div>
              <p>گروه‌های هدف متناسب با موضوع هر فعالیت.</p>
            </article>

            <article className={styles.infoCard}>
              <div className={styles.infoHeader}>
                <strong>نحوه اجرا</strong>
                <span className={styles.infoIcon}>
                  <img src="/brand/workflow.svg" alt="" width={17} height={17} />
                </span>
              </div>
              <p>برنامه‌ریزی و اجرای مستند با همراهی تیم طرح.</p>
            </article>

            <article className={styles.infoCard}>
              <div className={styles.infoHeader}>
                <strong>گزارش‌دهی</strong>
                <span className={styles.infoIcon}>
                  <img src="/brand/file-check.svg" alt="" width={17} height={17} />
                </span>
              </div>
              <p>انتشار گزارش فعالیت پس از تکمیل اطلاعات.</p>
            </article>
          </div>
        </section>

        <section className={styles.participationCta} id="participation" aria-labelledby="participation-title">
          <ContributionDialogButton
            projectId={project.id}
            projectTitle={project.title}
            cardNumber={contributionSettings.cardNumber}
            cardHolder={contributionSettings.cardHolder}
            variant="secondary"
          />
          <div className={styles.participationCopy}>
            <h2 id="participation-title">همراه این طرح شوید</h2>
            <p>مشارکت در این طرح از طریق شماره کارت مرکز نیکوکاری آینه انجام می‌شود.</p>
          </div>
        </section>

        <section className={styles.reportsSection} id="reports" aria-labelledby="reports-title">
          <div className={styles.sectionHeader}>
            <h2 id="reports-title">گزارش‌های این طرح</h2>
            <p>گزارش‌های منتشرشده و تأییدشده مرتبط با این طرح در این بخش قرار می‌گیرند.</p>
          </div>

          <div className={styles.reportsGrid}>
            {project.reports.length > 0 ? (
              project.reports.map((report) => <ReportCard report={report} key={report.id} />)
            ) : (
              <div className={styles.emptyState}>
                هنوز گزارشی برای این طرح منتشر نشده است.
              </div>
            )}
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
