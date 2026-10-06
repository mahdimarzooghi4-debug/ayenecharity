"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { adminApi } from "../../lib/admin-api";
import styles from "./admin.module.css";
import { AdminShell } from "./components/admin-shell";

interface DashboardData {
  metrics: {
    activeProjects: number | null;
    contributions: number | null;
    pendingReceipts: number | null;
    cooperationRequests: number | null;
  };
  latestContributions: Array<{
    id: string;
    contributorName: string;
    declaredAmountRial: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
    project: { title: string };
  }>;
  reviewQueue: Array<{
    id: string;
    contributorName: string;
    declaredAmountRial: string;
    createdAt: string;
    project: { title: string };
  }>;
  recentRequests: Array<{
    id: string;
    fullName: string;
    organizationOrProjectName: string | null;
    requestType: string;
    status: string;
    createdAt: string;
  }>;
}

const faNumber = new Intl.NumberFormat("fa-IR");
const faDate = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" });

function amount(value: string) {
  return faNumber.format(BigInt(value)) + " ریال";
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi<DashboardData>("/admin/dashboard")
      .then(setData)
      .catch(() => setError("دریافت اطلاعات داشبورد ناموفق بود."));
  }, []);

  return (
    <AdminShell title="داشبورد" subtitle="نمای کلی عملیات روزانه">
      <div className={styles.dashboardPage}>
      <div className={styles.pageHeader}>
        <span className={styles.noteBadge}>داده‌های واقعی سامانه</span>
        <div>
          <h1>داشبورد</h1>
          <p>خلاصه‌ای فشرده از وضعیت طرح‌ها، مشارکت‌ها و درخواست‌ها</p>
        </div>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <section className={styles.metricsGrid}>
        <Metric
          label="درخواست‌های همکاری"
          value={data?.metrics.cooperationRequests}
          icon="/brand/metric-users-round.svg"
        />
        <Metric
          label="رسیدهای در انتظار بررسی"
          value={data?.metrics.pendingReceipts}
          icon="/brand/metric-receipt-text.svg"
          accent
        />
        <Metric
          label="مشارکت‌های ثبت‌شده"
          value={data?.metrics.contributions}
          icon="/brand/admin-hand-heart.svg"
        />
        <Metric
          label="طرح‌های فعال"
          value={data?.metrics.activeProjects}
          icon="/brand/metric-folder-check.svg"
        />
      </section>

      <section className={styles.dashboardGrid}>
        <div className={styles.stack}>
          <Panel
            title="رسیدهای نیازمند بررسی"
            subtitle="اولویت بررسی دستی"
            badge={data ? `${faNumber.format(data.reviewQueue.length)} مورد` : "در حال دریافت"}
          >
            <CompactList
              empty="رسیدی در انتظار بررسی نیست."
              rows={(data?.reviewQueue ?? []).map((item) => ({
                id: item.id,
                title: item.contributorName,
                meta: item.project.title,
                tail: amount(item.declaredAmountRial),
              }))}
            />
          </Panel>

          <Panel
            title="آخرین درخواست‌ها"
            subtitle="درخواست‌های همکاری سایت"
            badge={data ? `${faNumber.format(data.recentRequests.length)} مورد` : "در حال دریافت"}
          >
            <CompactList
              empty="درخواستی ثبت نشده است."
              rows={(data?.recentRequests ?? []).map((item) => ({
                id: item.id,
                title: item.fullName,
                meta: item.organizationOrProjectName ?? item.requestType,
                tail: faDate.format(new Date(item.createdAt)),
              }))}
            />
          </Panel>
        </div>

        <Panel
          title="آخرین مشارکت‌ها"
          subtitle="آخرین موارد ثبت‌شده در سامانه"
          badge={data ? `${faNumber.format(data.latestContributions.length)} مورد` : "در حال دریافت"}
          large
        >
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>نام</th>
                  <th>طرح</th>
                  <th>مبلغ اعلامی</th>
                  <th>تاریخ</th>
                  <th>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {(data?.latestContributions ?? []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.contributorName}</td>
                    <td>{item.project.title}</td>
                    <td>{amount(item.declaredAmountRial)}</td>
                    <td>{faDate.format(new Date(item.createdAt))}</td>
                    <td><StatusBadge status={item.status} /></td>
                  </tr>
                ))}
                {data && data.latestContributions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyCell}>
                      <span className={styles.emptyTableState}>
                        <span className={styles.emptyIcon}>
                          <img src="/brand/wallet.svg" alt="" width={22} height={22} />
                        </span>
                        <strong>هنوز مشارکتی ثبت نشده است.</strong>
                        <small>اولین مشارکت پس از ثبت در این جدول نمایش داده می‌شود.</small>
                      </span>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className={styles.dashboardTableFooter}>
            <Link href="/admin/contributions">مشاهده مشارکت‌ها</Link>
            <span>داده‌های واقعی سامانه</span>
          </div>
        </Panel>
      </section>
      </div>
    </AdminShell>
  );
}

function Metric({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: number | null | undefined;
  icon: string;
  accent?: boolean;
}) {
  return (
    <article className={styles.metricCard}>
      <div className={styles.metricTitle}>
        <span>{label}</span>
        <span className={accent ? styles.metricIconAccent : styles.metricIcon}>
          <img src={icon} alt="" width={18} height={18} />
        </span>
      </div>
      <div className={styles.metricValue}>
        <strong>{value == null ? "—" : faNumber.format(value)}</strong>
        <small className={styles.metricHint}>
          {value == null ? "در حال دریافت" : value === 0 ? "موردی ثبت نشده" : "به‌روز"}
        </small>
      </div>
    </article>
  );
}

function Panel({
  title,
  subtitle,
  children,
  badge,
  large = false,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <section className={large ? styles.panelLarge : styles.panel}>
      <div className={styles.panelHeader}>
        {badge ? <span className={styles.panelBadge}>{badge}</span> : null}
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function CompactList({
  rows,
  empty,
}: {
  rows: Array<{ id: string; title: string; meta: string; tail: string }>;
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>
          <img src="/brand/clipboard.svg" alt="" width={22} height={22} />
        </span>
        <strong>{empty}</strong>
        <small>با ثبت داده جدید، این بخش به‌صورت خودکار به‌روزرسانی می‌شود.</small>
      </div>
    );
  }

  return (
    <div className={styles.compactList}>
      {rows.map((row) => (
        <div key={row.id}>
          <div>
            <strong>{row.title}</strong>
            <small>{row.meta}</small>
          </div>
          <span>{row.tail}</span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" }) {
  const label = status === "PENDING" ? "در انتظار" : status === "APPROVED" ? "تأییدشده" : "ردشده";
  return <span className={styles["status" + status]}>{label}</span>;
}
