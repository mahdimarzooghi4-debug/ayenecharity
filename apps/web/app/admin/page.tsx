"use client";

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
      <div className={styles.pageHeader}>
        <span className={styles.noteBadge}>داده‌های واقعی سامانه</span>
        <div>
          <h1>داشبورد</h1>
          <p>خلاصه‌ای فشرده از وضعیت طرح‌ها، مشارکت‌ها و درخواست‌ها</p>
        </div>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <section className={styles.metricsGrid}>
        <Metric label="درخواست‌های همکاری" value={data?.metrics.cooperationRequests} />
        <Metric label="رسیدهای در انتظار بررسی" value={data?.metrics.pendingReceipts} accent />
        <Metric label="مشارکت‌های ثبت‌شده" value={data?.metrics.contributions} />
        <Metric label="طرح‌های فعال" value={data?.metrics.activeProjects} />
      </section>

      <section className={styles.dashboardGrid}>
        <div className={styles.stack}>
          <Panel title="رسیدهای نیازمند بررسی" subtitle="اولویت بررسی دستی">
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

          <Panel title="آخرین درخواست‌ها" subtitle="درخواست‌های همکاری">
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

        <Panel title="آخرین مشارکت‌ها" subtitle="تازه‌ترین موارد ثبت‌شده" large>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>نام</th>
                  <th>طرح</th>
                  <th>مبلغ اعلامی</th>
                  <th>وضعیت</th>
                  <th>تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {(data?.latestContributions ?? []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.contributorName}</td>
                    <td>{item.project.title}</td>
                    <td>{amount(item.declaredAmountRial)}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>{faDate.format(new Date(item.createdAt))}</td>
                  </tr>
                ))}
                {data && data.latestContributions.length === 0 ? (
                  <tr><td colSpan={5} className={styles.emptyCell}>هنوز مشارکتی ثبت نشده است.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </AdminShell>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | null | undefined;
  accent?: boolean;
}) {
  return (
    <article className={styles.metricCard}>
      <div className={styles.metricTitle}>
        <span className={accent ? styles.metricIconAccent : styles.metricIcon}>•</span>
        <span>{label}</span>
      </div>
      <strong>{value == null ? "—" : faNumber.format(value)}</strong>
    </article>
  );
}

function Panel({
  title,
  subtitle,
  children,
  large = false,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <section className={large ? styles.panelLarge : styles.panel}>
      <div className={styles.panelHeader}>
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
    return <div className={styles.emptyState}>{empty}</div>;
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
