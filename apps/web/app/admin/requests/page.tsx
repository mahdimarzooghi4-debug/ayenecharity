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

type RequestStatus = "NEW" | "IN_REVIEW" | "RESPONDED" | "CLOSED";
type RequestType =
  | "VOLUNTEER"
  | "ORGANIZATIONAL"
  | "PROJECT_PROPOSAL";

interface CooperationRequestItem {
  id: string;
  fullName: string;
  organizationOrProjectName: string | null;
  phone: string;
  email: string | null;
  requestType: RequestType;
  message: string;
  status: RequestStatus;
  internalNote: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RequestListResponse {
  items: CooperationRequestItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  requestTypes: string[];
  newCount: number;
  capabilities: {
    updateStatus: boolean;
    addInternalNote: boolean;
  };
}

const faNumber = new Intl.NumberFormat("fa-IR");
const faDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "medium",
});
const faDateTime = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "medium",
  timeStyle: "short",
});

const requestTypes: Array<{ value: RequestType; label: string }> = [
  { value: "VOLUNTEER", label: "همکاری داوطلبانه" },
  { value: "ORGANIZATIONAL", label: "همکاری سازمانی" },
  { value: "PROJECT_PROPOSAL", label: "پیشنهاد طرح" },
];

const typeLabels: Record<RequestType, string> = {
  VOLUNTEER: "همکاری داوطلبانه",
  ORGANIZATIONAL: "همکاری سازمانی",
  PROJECT_PROPOSAL: "پیشنهاد طرح",
};

const statusLabels: Record<RequestStatus, string> = {
  NEW: "جدید",
  IN_REVIEW: "در حال بررسی",
  RESPONDED: "پاسخ داده شده",
  CLOSED: "بسته شده",
};

const statusIcon: Record<RequestStatus, string> = {
  NEW: "/admin/requests/status-new.svg",
  IN_REVIEW: "/admin/requests/status-review.svg",
  RESPONDED: "/admin/requests/status-responded.svg",
  CLOSED: "/admin/requests/status-closed.svg",
};

const nextStatus: Partial<Record<RequestStatus, RequestStatus>> = {
  NEW: "IN_REVIEW",
  IN_REVIEW: "RESPONDED",
  RESPONDED: "CLOSED",
};

function isoStart(value: string): string {
  return value ? value + "T00:00:00.000Z" : "";
}

function isoEnd(value: string): string {
  return value ? value + "T23:59:59.999Z" : "";
}

function statusClass(status: RequestStatus): string {
  return styles["requestStatus" + status];
}

export default function AdminRequestsPage() {
  const [data, setData] = useState<RequestListResponse | null>(null);
  const [status, setStatus] = useState<"" | RequestStatus>("");
  const [requestType, setRequestType] = useState<"" | RequestType>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] =
    useState<CooperationRequestItem | null>(null);
  const [error, setError] = useState("");

  const params = useMemo(() => {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: "25",
    });

    if (status) query.set("status", status);
    if (requestType) query.set("requestType", requestType);
    if (querySearch) query.set("search", querySearch);
    if (from) query.set("from", isoStart(from));
    if (to) query.set("to", isoEnd(to));

    return query.toString();
  }, [from, page, querySearch, requestType, status, to]);

  const load = useCallback(async () => {
    setError("");

    try {
      const result = await adminApi<RequestListResponse>(
        "/admin/requests?" + params,
      );
      setData(result);
    } catch {
      setError("دریافت فهرست درخواست‌ها ناموفق بود.");
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
    setRequestType("");
    setFrom("");
    setTo("");
    setSearch("");
    setQuerySearch("");
    setPage(1);
  }

  return (
    <AdminShell
      title="درخواست‌ها"
      subtitle="درخواست‌های همکاری ارسال‌شده از سایت"
    >
      <div className={styles.requestsHeader}>
        <span className={styles.noteBadge}>
          داده‌های واقعی ثبت‌شده در سایت
        </span>
        <div>
          <h1>درخواست‌ها</h1>
          <p>درخواست‌های همکاری ارسال‌شده از سایت</p>
        </div>
      </div>

      <div className={styles.requestsToolbar}>
        <div className={styles.requestFilters}>
          <details className={styles.dateRangeFilter}>
            <summary>
              <img
                src="/admin/requests/calendar.svg"
                alt=""
                width={16}
                height={16}
              />
              <span>{from || to ? "بازه انتخاب‌شده" : "بازه زمانی"}</span>
            </summary>
            <div className={styles.dateRangePanel}>
              <label>
                از تاریخ
                <input
                  type="date"
                  value={from}
                  onChange={(event) => {
                    setFrom(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label>
                تا تاریخ
                <input
                  type="date"
                  value={to}
                  onChange={(event) => {
                    setTo(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
            </div>
          </details>

          <label className={styles.requestTypeFilter}>
            <img
              src="/admin/requests/tags.svg"
              alt=""
              width={16}
              height={16}
            />
            <select
              value={requestType}
              onChange={(event) => {
                setRequestType(event.target.value as "" | RequestType);
                setPage(1);
              }}
              aria-label="نوع درخواست"
            >
              <option value="">همه انواع درخواست</option>
              {requestTypes.map((item) => (
                <option value={item.value} key={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.requestStatusFilter}>
            <img
              src="/admin/requests/list-filter.svg"
              alt=""
              width={16}
              height={16}
            />
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "" | RequestStatus);
                setPage(1);
              }}
              aria-label="وضعیت درخواست"
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="NEW">جدید</option>
              <option value="IN_REVIEW">در حال بررسی</option>
              <option value="RESPONDED">پاسخ داده شده</option>
              <option value="CLOSED">بسته شده</option>
            </select>
          </label>

          <form className={styles.requestSearch} onSubmit={submitSearch}>
            <img
              src="/admin/requests/search.svg"
              alt=""
              width={16}
              height={16}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جست‌وجوی نام، تماس یا مجموعه…"
              aria-label="جست‌وجوی درخواست"
            />
            <button type="submit">جست‌وجو</button>
          </form>
        </div>

        <div className={styles.filterSummary}>
          <span className={styles.pendingSummary}>
            {faNumber.format(data?.newCount ?? 0)} جدید
          </span>
          <button type="button" onClick={resetFilters}>
            پاک‌کردن فیلترها
          </button>
        </div>
      </div>

      {error ? <p className={styles.errorBox}>{error}</p> : null}

      <section className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.requestsTable}`}>
            <thead>
              <tr>
                <th>نام درخواست‌دهنده</th>
                <th>مجموعه / طرح</th>
                <th>نوع درخواست</th>
                <th>شماره تماس</th>
                <th>تاریخ</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong className={styles.requestPerson}>
                      {item.fullName}
                    </strong>
                  </td>
                  <td>{item.organizationOrProjectName ?? "—"}</td>
                  <td>{typeLabels[item.requestType]}</td>
                  <td dir="ltr">{item.phone}</td>
                  <td>{faDate.format(new Date(item.createdAt))}</td>
                  <td>
                    <span className={statusClass(item.status)}>
                      {statusLabels[item.status]}
                      <img
                        src={statusIcon[item.status]}
                        alt=""
                        width={6}
                        height={6}
                      />
                    </span>
                  </td>
                  <td>
                    <button
                      className={styles.requestViewButton}
                      type="button"
                      onClick={() => setSelected(item)}
                    >
                      مشاهده
                    </button>
                  </td>
                </tr>
              ))}

              {data && data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    درخواستی با این فیلتر پیدا نشد.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className={styles.requestsTableFooter}>
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
              {faNumber.format(data?.total ?? 0)} درخواست
            </span>
            <button
              disabled={!data || data.page >= data.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              بعدی
            </button>
          </div>

          <p>
            Drawer جزئیات در حالت پایه بسته است؛ این صفحه CRM کامل نیست.
          </p>
        </div>
      </section>

      {selected && data ? (
        <RequestDetailDrawer
          item={selected}
          capabilities={data.capabilities}
          onClose={() => setSelected(null)}
          onSaved={async () => {
            setSelected(null);
            await load();
          }}
        />
      ) : null}
    </AdminShell>
  );
}

function RequestDetailDrawer({
  item,
  capabilities,
  onClose,
  onSaved,
}: {
  item: CooperationRequestItem;
  capabilities: RequestListResponse["capabilities"];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [status, setStatus] = useState<RequestStatus>(item.status);
  const [internalNote, setInternalNote] = useState(
    item.internalNote ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const next = nextStatus[item.status];
  const statusOptions = next ? [item.status, next] : [item.status];
  const canSave =
    capabilities.updateStatus || capabilities.addInternalNote;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const statusChanged = status !== item.status;
    const noteValue = internalNote.trim();
    const originalNote = item.internalNote?.trim() ?? "";
    const noteChanged = noteValue !== originalNote;

    if (!statusChanged && !noteChanged) {
      onClose();
      return;
    }

    setBusy(true);
    setError("");

    try {
      await adminApi<CooperationRequestItem>(
        "/admin/requests/" + item.id,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...(statusChanged ? { status } : {}),
            ...(noteChanged
              ? { internalNote: noteValue || null }
              : {}),
          }),
        },
      );

      await onSaved();
    } catch (err) {
      if (err instanceof AdminApiError) {
        if (err.body.code === "INVALID_REQUEST_STATUS_TRANSITION") {
          setError(
            "این تغییر وضعیت مطابق مسیر پیگیری درخواست مجاز نیست.",
          );
        } else {
          setError(err.body.message ?? "ذخیره تغییرات انجام نشد.");
        }
      } else {
        setError("ذخیره تغییرات انجام نشد.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={styles.drawerBackdrop}
      onMouseDown={() => {
        if (!busy) onClose();
      }}
    >
      <aside
        className={styles.requestDrawer}
        aria-label="جزئیات درخواست"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.requestDrawerHeader}>
          <div>
            <h2>جزئیات درخواست</h2>
            <p>مرور و مدیریت یک درخواست همکاری</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="بستن"
          >
            <img
              src="/admin/requests/close.svg"
              alt=""
              width={18}
              height={18}
            />
          </button>
        </header>

        <form className={styles.requestDrawerBody} onSubmit={save}>
          <div className={styles.requestReadonlyGroup}>
            <ReadOnlyField
              label="نام و نام خانوادگی"
              value={item.fullName}
            />
            <ReadOnlyField
              label="نام مجموعه / طرح"
              value={item.organizationOrProjectName ?? "—"}
            />
            <ReadOnlyField
              label="شماره تماس"
              value={item.phone}
              ltr
            />
            <ReadOnlyField
              label="ایمیل"
              value={item.email ?? "—"}
              ltr={Boolean(item.email)}
            />
            <ReadOnlyField
              label="نوع درخواست"
              value={typeLabels[item.requestType]}
            />
            <ReadOnlyField
              label="متن کامل درخواست"
              value={item.message}
              multiline
            />
            <ReadOnlyField
              label="تاریخ ثبت"
              value={faDateTime.format(new Date(item.createdAt))}
            />
          </div>

          <div className={styles.requestManagement}>
            <h3>مدیریت</h3>

            <label>
              <span>تغییر وضعیت</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as RequestStatus)
                }
                disabled={!capabilities.updateStatus || busy}
              >
                {statusOptions.map((value) => (
                  <option value={value} key={value}>
                    {statusLabels[value]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>یادداشت داخلی</span>
              <textarea
                value={internalNote}
                onChange={(event) =>
                  setInternalNote(event.target.value)
                }
                maxLength={2000}
                rows={3}
                placeholder="یادداشت داخلی برای پیگیری"
                disabled={!capabilities.addInternalNote || busy}
              />
              <small>این یادداشت فقط در پنل مدیریت نمایش داده می‌شود.</small>
            </label>
          </div>

          <div className={styles.requestDrawerSpacer} />

          {error ? <p className={styles.formError}>{error}</p> : null}

          {canSave ? (
            <button
              className={styles.requestSave}
              type="submit"
              disabled={busy}
            >
              {busy ? "در حال ذخیره…" : "ذخیره تغییرات"}
            </button>
          ) : (
            <p className={styles.helperText}>
              این حساب فقط دسترسی مشاهده درخواست را دارد.
            </p>
          )}
        </form>
      </aside>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  multiline = false,
  ltr = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  ltr?: boolean;
}) {
  return (
    <div className={styles.requestReadOnlyField}>
      <span>{label}</span>
      <div
        className={
          multiline
            ? styles.requestReadOnlyMultiline
            : styles.requestReadOnlyValue
        }
        dir={ltr ? "ltr" : "rtl"}
      >
        {value}
      </div>
    </div>
  );
}
