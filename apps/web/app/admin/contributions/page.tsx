"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AdminApiError,
  adminApi,
} from "../../../lib/admin-api";
import styles from "../admin.module.css";
import { AdminShell } from "../components/admin-shell";

type ContributionStatus = "PENDING" | "APPROVED" | "REJECTED";

interface ContributionProject {
  id: string;
  title: string;
}

interface ContributionItem {
  id: string;
  contributorName: string;
  contributorPhone: string;
  contributorEmail: string | null;
  declaredAmountRial: string;
  contributorNote: string | null;
  status: ContributionStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedBy: {
    id: string;
    fullName: string;
  } | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  project: ContributionProject;
  receipt: {
    originalName: string;
    mimeType: string;
    sizeBytes: string;
  };
}

interface ContributionListResponse {
  items: ContributionItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pendingCount: number;
  projects: ContributionProject[];
  capabilities: {
    review: boolean;
  };
}

interface ReceiptAccessResponse {
  url: string;
  expiresInSeconds: number | null;
}

const faNumber = new Intl.NumberFormat("fa-IR");
const faDateTime = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusLabels: Record<ContributionStatus, string> = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تأیید شده",
  REJECTED: "رد شده",
};

function formatRial(value: string): string {
  try {
    return faNumber.format(BigInt(value)) + " ریال";
  } catch {
    return value + " ریال";
  }
}

function isoStart(value: string): string {
  return value ? value + "T00:00:00.000Z" : "";
}

function isoEnd(value: string): string {
  return value ? value + "T23:59:59.999Z" : "";
}

export default function AdminContributionsPage() {
  const [data, setData] = useState<ContributionListResponse | null>(null);
  const [status, setStatus] = useState<"" | ContributionStatus>("");
  const [projectId, setProjectId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [page, setPage] = useState(1);
  const [reviewing, setReviewing] = useState<ContributionItem | null>(null);
  const [error, setError] = useState("");

  const params = useMemo(() => {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: "25",
      sort: "createdAt",
      order: "desc",
    });

    if (status) query.set("status", status);
    if (projectId) query.set("projectId", projectId);
    if (querySearch) query.set("search", querySearch);
    if (from) query.set("from", isoStart(from));
    if (to) query.set("to", isoEnd(to));

    return query.toString();
  }, [from, page, projectId, querySearch, status, to]);

  const load = useCallback(async () => {
    setError("");

    try {
      const result = await adminApi<ContributionListResponse>(
        "/admin/contributions?" + params,
      );
      setData(result);
    } catch {
      setError("دریافت فهرست مشارکت‌ها ناموفق بود.");
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuerySearch(search.trim());
  }

  function resetFilters() {
    setStatus("");
    setProjectId("");
    setFrom("");
    setTo("");
    setSearch("");
    setQuerySearch("");
    setPage(1);
  }

  return (
    <AdminShell
      title="مشارکت‌ها"
      subtitle="بررسی دستی رسیدها و مدیریت وضعیت مشارکت‌ها"
    >
      <div className={styles.contributionsHeader}>
        <span className={styles.noteBadge}>
          پرداخت‌ها در V1 دستی بررسی می‌شوند
        </span>
        <div>
          <h1>مشارکت‌ها</h1>
          <p>صفحه عملیاتی اصلی برای بررسی و ثبت نتیجه رسیدها</p>
        </div>
      </div>

      <div className={styles.contributionsToolbar}>
        <div className={styles.contributionFilters}>
          <label className={styles.compactFilter}>
            <img
              src="/admin/contributions/calendar.svg"
              alt=""
              width={16}
              height={16}
            />
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              aria-label="از تاریخ"
            />
          </label>

          <label className={styles.compactFilter}>
            <img
              src="/admin/contributions/calendar.svg"
              alt=""
              width={16}
              height={16}
            />
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              aria-label="تا تاریخ"
            />
          </label>

          <label className={styles.compactFilter}>
            <img
              src="/admin/contributions/filter.svg"
              alt=""
              width={16}
              height={16}
            />
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "" | ContributionStatus);
                setPage(1);
              }}
              aria-label="وضعیت"
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="PENDING">در انتظار بررسی</option>
              <option value="APPROVED">تأیید شده</option>
              <option value="REJECTED">رد شده</option>
            </select>
          </label>

          <label className={styles.compactFilter}>
            <img
              src="/admin/contributions/folder.svg"
              alt=""
              width={16}
              height={16}
            />
            <select
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value);
                setPage(1);
              }}
              aria-label="طرح"
            >
              <option value="">همه طرح‌ها</option>
              {(data?.projects ?? []).map((project) => (
                <option value={project.id} key={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </label>

          <form className={styles.contributionSearch} onSubmit={submitSearch}>
            <img
              src="/admin/contributions/search.svg"
              alt=""
              width={16}
              height={16}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جست‌وجوی نام، موبایل یا طرح…"
              aria-label="جست‌وجوی مشارکت"
            />
            <button type="submit">جست‌وجو</button>
          </form>
        </div>

        <div className={styles.filterSummary}>
          <span className={styles.pendingSummary}>
            {faNumber.format(data?.pendingCount ?? 0)} در انتظار
          </span>
          <button type="button" onClick={resetFilters}>
            پاک‌کردن فیلترها
          </button>
        </div>
      </div>

      {error ? <p className={styles.errorBox}>{error}</p> : null}

      <section className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.contributionsTable}`}>
            <thead>
              <tr>
                <th>نام مشارکت‌کننده</th>
                <th>طرح</th>
                <th>مبلغ</th>
                <th>تاریخ</th>
                <th>رسید</th>
                <th>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className={styles.contributorCell}>
                      <strong>{item.contributorName}</strong>
                      <small dir="ltr">{item.contributorPhone}</small>
                    </div>
                  </td>
                  <td>{item.project.title}</td>
                  <td dir="ltr">{formatRial(item.declaredAmountRial)}</td>
                  <td>{faDateTime.format(new Date(item.createdAt))}</td>
                  <td>
                    <button
                      type="button"
                      className={
                        item.status === "PENDING"
                          ? styles.receiptReviewButton
                          : styles.receiptLinkButton
                      }
                      onClick={() => setReviewing(item)}
                    >
                      {item.status === "PENDING" ? (
                        "بررسی رسید"
                      ) : (
                        <>
                          <img
                            src="/admin/contributions/paperclip.svg"
                            alt=""
                            width={15}
                            height={15}
                          />
                          مشاهده رسید
                        </>
                      )}
                    </button>
                  </td>
                  <td>
                    <span className={styles["status" + item.status]}>
                      {statusLabels[item.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {data && data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    مشارکتی با این فیلتر پیدا نشد.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <button
            disabled={!data || data.page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            قبلی
          </button>
          <span>
            صفحه {faNumber.format(data?.page ?? 1)} از{" "}
            {faNumber.format(data?.totalPages ?? 1)}
            {" · "}
            {faNumber.format(data?.total ?? 0)} مشارکت
          </span>
          <button
            disabled={!data || data.page >= data.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            بعدی
          </button>
        </div>
      </section>

      {reviewing ? (
        <ReceiptReviewModal
          item={reviewing}
          canReview={Boolean(data?.capabilities.review)}
          onClose={() => setReviewing(null)}
          onReviewed={async () => {
            setReviewing(null);
            await load();
          }}
        />
      ) : null}
    </AdminShell>
  );
}

function ReceiptReviewModal({
  item,
  canReview,
  onClose,
  onReviewed,
}: {
  item: ContributionItem;
  canReview: boolean;
  onClose: () => void;
  onReviewed: () => Promise<void>;
}) {
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [rejectionReason, setRejectionReason] = useState(
    item.rejectionReason ?? "",
  );
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;

    adminApi<ReceiptAccessResponse>(
      "/admin/contributions/" + item.id + "/receipt-url",
    )
      .then((result) => {
        if (alive) setReceiptUrl(result.url);
      })
      .catch(() => {
        if (alive) setReceiptError("دریافت فایل رسید ناموفق بود.");
      });

    return () => {
      alive = false;
    };
  }, [item.id]);

  async function review(decision: "APPROVE" | "REJECT") {
    if (!canReview || item.status !== "PENDING") return;

    if (decision === "REJECT" && !rejectionReason.trim()) {
      setActionError("برای رد رسید، دلیل رد الزامی است.");
      return;
    }

    setBusy(true);
    setActionError("");

    try {
      await adminApi(
        "/admin/contributions/" + item.id + "/review",
        {
          method: "PATCH",
          body: JSON.stringify({
            decision,
            version: item.version,
            ...(decision === "REJECT"
              ? { rejectionReason: rejectionReason.trim() }
              : {}),
          }),
        },
      );
      await onReviewed();
    } catch (error) {
      if (error instanceof AdminApiError) {
        if (
          error.status === 409 ||
          error.body.code === "CONTRIBUTION_VERSION_CONFLICT" ||
          error.body.code === "CONTRIBUTION_ALREADY_REVIEWED"
        ) {
          setActionError(
            "این مشارکت هم‌زمان توسط کاربر دیگری تغییر کرده است. فهرست را تازه‌سازی کنید.",
          );
        } else if (error.body.code === "REJECTION_REASON_REQUIRED") {
          setActionError("برای رد رسید، دلیل رد الزامی است.");
        } else {
          setActionError(error.body.message ?? "ثبت نتیجه بررسی انجام نشد.");
        }
      } else {
        setActionError("ثبت نتیجه بررسی انجام نشد.");
      }
    } finally {
      setBusy(false);
    }
  }

  const isPending = item.status === "PENDING";
  const isImage = item.receipt.mimeType.startsWith("image/");
  const isPdf = item.receipt.mimeType === "application/pdf";

  return (
    <div
      className={styles.reviewBackdrop}
      role="presentation"
      onMouseDown={() => {
        if (!busy) onClose();
      }}
    >
      <section
        className={styles.reviewPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-review-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.reviewDetails}>
          <header className={styles.reviewHeader}>
            <button
              type="button"
              className={styles.reviewClose}
              onClick={onClose}
              disabled={busy}
              aria-label="بستن پنل"
            >
              <img
                src="/admin/contributions/close.svg"
                alt=""
                width={18}
                height={18}
              />
            </button>
            <div>
              <h2 id="receipt-review-title">بررسی رسید</h2>
              <p>بررسی دستی V1</p>
            </div>
          </header>

          <span className={styles["status" + item.status]}>
            {statusLabels[item.status]}
          </span>

          <dl className={styles.reviewData}>
            <div>
              <dd>{item.contributorName}</dd>
              <dt>نام مشارکت‌کننده</dt>
            </div>
            <div>
              <dd>{item.project.title}</dd>
              <dt>طرح</dt>
            </div>
            <div>
              <dd dir="ltr">{formatRial(item.declaredAmountRial)}</dd>
              <dt>مبلغ اعلام‌شده</dt>
            </div>
            <div>
              <dd>{faDateTime.format(new Date(item.createdAt))}</dd>
              <dt>تاریخ</dt>
            </div>
            <div>
              <dd dir="ltr">{item.contributorPhone}</dd>
              <dt>موبایل</dt>
            </div>
          </dl>

          <div className={styles.reviewNote}>
            <strong>توضیحات</strong>
            <p>{item.contributorNote || "توضیحی ثبت نشده است."}</p>
          </div>

          {isPending && canReview ? (
            <label className={styles.rejectionField}>
              <span>دلیل رد (در صورت رد)</span>
              <input
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="دلیل کوتاه رد"
                maxLength={500}
                disabled={busy}
              />
            </label>
          ) : item.rejectionReason ? (
            <div className={styles.reviewNote}>
              <strong>دلیل رد</strong>
              <p>{item.rejectionReason}</p>
            </div>
          ) : null}

          {item.reviewedBy && item.reviewedAt ? (
            <p className={styles.reviewedMeta}>
              بررسی‌شده توسط {item.reviewedBy.fullName} ·{" "}
              {faDateTime.format(new Date(item.reviewedAt))}
            </p>
          ) : null}

          {actionError ? (
            <p className={styles.formError}>{actionError}</p>
          ) : null}

          {isPending && canReview ? (
            <div className={styles.reviewActions}>
              <button
                type="button"
                className={styles.reviewReject}
                onClick={() => void review("REJECT")}
                disabled={busy}
              >
                رد
              </button>
              <button
                type="button"
                className={styles.reviewApprove}
                onClick={() => void review("APPROVE")}
                disabled={busy}
              >
                {busy ? "در حال ثبت…" : "تأیید"}
              </button>
            </div>
          ) : null}

          {isPending && !canReview ? (
            <p className={styles.helperText}>
              این حساب دسترسی بررسی مالی ندارد و فقط می‌تواند رسید را مشاهده کند.
            </p>
          ) : null}

          <p className={styles.manualReviewNote}>
            هیچ اتصال بانکی وجود ندارد؛ نتیجه پس از بررسی دستی ثبت می‌شود.
          </p>
        </div>

        <aside className={styles.receiptPreview}>
          <div className={styles.receiptPreviewHeader}>
            <span>رسید خصوصی</span>
            <strong>رسید بارگذاری‌شده</strong>
          </div>

          <div className={styles.receiptPaper}>
            {receiptError ? (
              <p className={styles.receiptError}>{receiptError}</p>
            ) : receiptUrl ? (
              isImage ? (
                <img
                  className={styles.receiptImage}
                  src={receiptUrl}
                  alt="رسید بارگذاری‌شده مشارکت"
                />
              ) : isPdf ? (
                <iframe
                  className={styles.receiptPdf}
                  src={receiptUrl}
                  title="فایل PDF رسید"
                />
              ) : (
                <a
                  className={styles.receiptDownload}
                  href={receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  مشاهده فایل رسید
                </a>
              )
            ) : (
              <div className={styles.receiptLoading}>
                <span className={styles.receiptIcon}>
                  <img
                    src="/admin/contributions/receipt.svg"
                    alt=""
                    width={24}
                    height={24}
                  />
                </span>
                <strong>در حال دریافت رسید…</strong>
              </div>
            )}
          </div>

          <div className={styles.receiptSecurityNote}>
            <img
              src="/admin/contributions/alert.svg"
              alt=""
              width={16}
              height={16}
            />
            <p>
              فایل رسید خصوصی است و فقط از طریق دسترسی موقت پنل نمایش داده می‌شود.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
