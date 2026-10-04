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

type DocumentType =
  | "PERFORMANCE_REPORT"
  | "LICENSE"
  | "FINANCIAL_DOCUMENT";
type PublishStatus = "DRAFT" | "PUBLISHED";

interface ProjectOption {
  id: string;
  title: string;
}

interface TransparencyDocument {
  id: string;
  title: string;
  type: DocumentType;
  description: string | null;
  projectId: string | null;
  project: ProjectOption | null;
  fileAssetId: string | null;
  file: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: string;
    visibility: "PUBLIC" | "PRIVATE";
    publicUrl: string | null;
  } | null;
  documentDate: string | null;
  publishStatus: PublishStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    fullName: string;
  };
  updatedBy: {
    id: string;
    fullName: string;
  } | null;
}

interface TransparencyListResponse {
  items: TransparencyDocument[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  projects: ProjectOption[];
  capabilities: {
    create: boolean;
    update: boolean;
    publish: boolean;
    delete: boolean;
  };
}

interface MediaUploadResponse {
  id: string;
}

interface MediaAccessResponse {
  url: string;
  expiresInSeconds: number | null;
}

const faNumber = new Intl.NumberFormat("fa-IR");
const faDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "medium",
});
const faDateTime = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "medium",
  timeStyle: "short",
});

const typeLabels: Record<DocumentType, string> = {
  PERFORMANCE_REPORT: "گزارش عملکرد",
  LICENSE: "مجوزها",
  FINANCIAL_DOCUMENT: "اسناد مالی",
};

const typeTabs: Array<{ value: DocumentType; label: string }> = [
  { value: "PERFORMANCE_REPORT", label: "گزارش عملکرد" },
  { value: "LICENSE", label: "مجوزها" },
  { value: "FINANCIAL_DOCUMENT", label: "اسناد مالی" },
];

function toDateInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toIsoDate(value: FormDataEntryValue | null): string | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  return new Date(text + "T00:00:00.000Z").toISOString();
}

export default function AdminTransparencyPage() {
  const [data, setData] = useState<TransparencyListResponse | null>(null);
  const [type, setType] = useState<DocumentType>("PERFORMANCE_REPORT");
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState<
    | { mode: "create"; type: DocumentType }
    | { mode: "edit"; document: TransparencyDocument }
    | null
  >(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const params = useMemo(() => {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: "25",
      type,
      sort: "updatedAt",
      order: "desc",
    });
    return query.toString();
  }, [page, type]);

  const load = useCallback(async () => {
    setError("");
    try {
      const result = await adminApi<TransparencyListResponse>(
        "/admin/transparency?" + params,
      );
      setData(result);
    } catch {
      setError("دریافت فهرست گزارش‌ها و اسناد ناموفق بود.");
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openFile(document: TransparencyDocument) {
    if (!document.fileAssetId) return;

    setBusyId(document.id);
    setError("");
    try {
      const result = await adminApi<MediaAccessResponse>(
        "/admin/media/" + document.fileAssetId + "/access-url",
      );
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("دریافت فایل سند ناموفق بود.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(document: TransparencyDocument) {
    if (
      !data?.capabilities.delete ||
      document.publishStatus === "PUBLISHED"
    ) {
      return;
    }

    if (!window.confirm("این پیش‌نویس حذف شود؟")) return;

    setBusyId(document.id);
    setError("");
    try {
      await adminApi<void>("/admin/transparency/" + document.id, {
        method: "DELETE",
      });

      if (document.fileAssetId) {
        await adminApi<void>(
          "/admin/media/" + document.fileAssetId,
          { method: "DELETE" },
        ).catch(() => undefined);
      }

      await load();
    } catch {
      setError("حذف پیش‌نویس انجام نشد.");
    } finally {
      setBusyId(null);
    }
  }

  const capabilities = data?.capabilities;

  return (
    <AdminShell
      title="گزارش و شفافیت"
      subtitle="مدیریت گزارش‌های عملکرد، مجوزها و اسناد مالی مرکز"
    >
      <div className={styles.transparencyHeader}>
        {capabilities?.create ? (
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => setDrawer({ mode: "create", type })}
          >
            افزودن مورد جدید
          </button>
        ) : (
          <span />
        )}

        <div>
          <h1>گزارش و شفافیت</h1>
          <p>مدیریت گزارش‌های عملکرد، مجوزها و اسناد مالی مرکز</p>
        </div>
      </div>

      <div className={styles.transparencyTabsRow}>
        <span className={styles.noteBadge}>
          فقط داده‌های ثبت‌شده در سامانه نمایش داده می‌شوند
        </span>

        <div className={styles.transparencyTabs}>
          {typeTabs.map((tab) => (
            <button
              type="button"
              key={tab.value}
              className={
                type === tab.value
                  ? styles.transparencyTabActive
                  : styles.transparencyTab
              }
              onClick={() => {
                setType(tab.value);
                setPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className={styles.errorBox}>{error}</p> : null}

      <section className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.transparencyTable}`}>
            <thead>
              <tr>
                <th>عنوان</th>
                <th>مرتبط با طرح</th>
                <th>تاریخ</th>
                <th>وضعیت انتشار</th>
                <th>فایل</th>
                <th>آخرین بروزرسانی</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((document) => (
                <tr key={document.id}>
                  <td>
                    <strong className={styles.transparencyTitle}>
                      {document.title}
                    </strong>
                  </td>
                  <td>{document.project?.title ?? "—"}</td>
                  <td>
                    {document.documentDate
                      ? faDate.format(new Date(document.documentDate))
                      : "—"}
                  </td>
                  <td>
                    <span
                      className={
                        document.publishStatus === "PUBLISHED"
                          ? styles.transparencyPublished
                          : styles.transparencyDraft
                      }
                    >
                      {document.publishStatus === "PUBLISHED"
                        ? "منتشر شده"
                        : "پیش‌نویس"}
                    </span>
                  </td>
                  <td>
                    {document.file ? (
                      <button
                        type="button"
                        className={styles.transparencyFile}
                        disabled={busyId === document.id}
                        onClick={() => void openFile(document)}
                      >
                        <img
                          src="/admin/transparency/paperclip.svg"
                          alt=""
                          width={14}
                          height={14}
                        />
                        <span>{document.file.originalName}</span>
                      </button>
                    ) : (
                      <span className={styles.mutedText}>بدون فایل</span>
                    )}
                  </td>
                  <td>{faDateTime.format(new Date(document.updatedAt))}</td>
                  <td>
                    <div className={styles.rowActions}>
                      {capabilities?.update ? (
                        <button
                          type="button"
                          onClick={() =>
                            setDrawer({ mode: "edit", document })
                          }
                        >
                          ویرایش
                        </button>
                      ) : null}

                      {capabilities?.delete &&
                      document.publishStatus === "DRAFT" ? (
                        <button
                          type="button"
                          className={styles.dangerText}
                          disabled={busyId === document.id}
                          onClick={() => void remove(document)}
                        >
                          حذف
                        </button>
                      ) : null}

                      {!capabilities?.update &&
                      !(
                        capabilities?.delete &&
                        document.publishStatus === "DRAFT"
                      ) ? (
                        <span className={styles.mutedText}>فقط مشاهده</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}

              {data && data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    موردی در این دسته ثبت نشده است.
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
            {faNumber.format(data?.total ?? 0)} مورد
          </span>
          <button
            disabled={!data || data.page >= data.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            بعدی
          </button>
        </div>
      </section>

      {drawer && data ? (
        <TransparencyDrawer
          value={drawer.mode === "edit" ? drawer.document : null}
          initialType={
            drawer.mode === "create" ? drawer.type : drawer.document.type
          }
          projects={data.projects}
          capabilities={data.capabilities}
          onClose={() => setDrawer(null)}
          onSaved={async () => {
            setDrawer(null);
            await load();
          }}
        />
      ) : null}
    </AdminShell>
  );
}

function TransparencyDrawer({
  value,
  initialType,
  projects,
  capabilities,
  onClose,
  onSaved,
}: {
  value: TransparencyDocument | null;
  initialType: DocumentType;
  projects: ProjectOption[];
  capabilities: TransparencyListResponse["capabilities"];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [desiredStatus, setDesiredStatus] = useState<PublishStatus>(
    value?.publishStatus ?? "DRAFT",
  );
  const [persistedId, setPersistedId] = useState<string | null>(
    value?.id ?? null,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const type = String(form.get("type") ?? initialType) as DocumentType;
    const projectId = String(form.get("projectId") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const documentDate = toIsoDate(form.get("documentDate"));

    if (
      desiredStatus === "PUBLISHED" &&
      (!documentDate || (!file && !value?.fileAssetId))
    ) {
      setError("برای انتشار، تاریخ و فایل سند الزامی هستند.");
      setBusy(false);
      return;
    }

    let uploadedAssetId: string | null = null;
    let savedId = persistedId;

    try {
      if (
        value?.publishStatus === "PUBLISHED" &&
        desiredStatus === "DRAFT" &&
        value.id
      ) {
        await adminApi(
          "/admin/transparency/" + value.id + "/unpublish",
          { method: "PATCH" },
        );
      }

      let fileAssetId = value?.fileAssetId ?? undefined;

      if (file) {
        const upload = new FormData();
        upload.set("purpose", "TRANSPARENCY_DOCUMENT");
        upload.set("file", file);

        const media = await adminApi<MediaUploadResponse>(
          "/admin/media",
          {
            method: "POST",
            body: upload,
          },
        );

        uploadedAssetId = media.id;
        fileAssetId = media.id;
      }

      const payload = {
        title,
        type,
        description: description || undefined,
        projectId: projectId || null,
        documentDate: documentDate ?? null,
        ...(fileAssetId ? { fileAssetId } : {}),
      };

      let saved: TransparencyDocument;

      if (savedId) {
        saved = await adminApi<TransparencyDocument>(
          "/admin/transparency/" + savedId,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
        );
      } else {
        saved = await adminApi<TransparencyDocument>(
          "/admin/transparency",
          {
            method: "POST",
            body: JSON.stringify({
              ...payload,
              projectId: projectId || undefined,
              documentDate: documentDate ?? undefined,
            }),
          },
        );
        savedId = saved.id;
        setPersistedId(saved.id);
      }

      if (
        desiredStatus === "PUBLISHED" &&
        saved.publishStatus !== "PUBLISHED"
      ) {
        saved = await adminApi<TransparencyDocument>(
          "/admin/transparency/" + saved.id + "/publish",
          { method: "PATCH" },
        );
      }

      if (
        desiredStatus === "DRAFT" &&
        saved.publishStatus === "PUBLISHED"
      ) {
        saved = await adminApi<TransparencyDocument>(
          "/admin/transparency/" + saved.id + "/unpublish",
          { method: "PATCH" },
        );
      }

      if (
        uploadedAssetId &&
        value?.fileAssetId &&
        value.fileAssetId !== uploadedAssetId
      ) {
        await adminApi<void>(
          "/admin/media/" + value.fileAssetId,
          { method: "DELETE" },
        ).catch(() => undefined);
      }

      await onSaved();
    } catch (err) {
      if (
        uploadedAssetId &&
        (!savedId || uploadedAssetId !== value?.fileAssetId)
      ) {
        await adminApi<void>(
          "/admin/media/" + uploadedAssetId,
          { method: "DELETE" },
        ).catch(() => undefined);
      }

      if (err instanceof AdminApiError) {
        if (
          err.body.code === "TRANSPARENCY_DOCUMENT_NOT_PUBLISHABLE"
        ) {
          setError("برای انتشار، عنوان، تاریخ و فایل معتبر الزامی هستند.");
        } else if (
          err.body.code === "TRANSPARENCY_FILE_ALREADY_USED"
        ) {
          setError("این فایل قبلاً به سند دیگری متصل شده است.");
        } else {
          setError(err.body.message ?? "ذخیره مورد انجام نشد.");
        }
      } else {
        setError("ذخیره مورد انجام نشد.");
      }
    } finally {
      setBusy(false);
    }
  }

  const canEdit = value ? capabilities.update : capabilities.create;

  return (
    <div
      className={styles.drawerBackdrop}
      onMouseDown={() => {
        if (!busy) onClose();
      }}
    >
      <aside
        className={styles.transparencyDrawer}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.transparencyDrawerHeader}>
          <div>
            <h2>افزودن یا ویرایش مورد</h2>
            <p>اطلاعات گزارش، مجوز یا سند</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="بستن"
          >
            <img
              src="/admin/transparency/close.svg"
              alt=""
              width={18}
              height={18}
            />
          </button>
        </div>

        <form className={styles.transparencyForm} onSubmit={submit}>
          <label>
            عنوان
            <input
              name="title"
              defaultValue={value?.title ?? ""}
              required
              minLength={2}
              maxLength={240}
              disabled={!canEdit}
            />
          </label>

          <label>
            دسته
            <select
              name="type"
              defaultValue={value?.type ?? initialType}
              disabled={!canEdit}
            >
              {typeTabs.map((tab) => (
                <option value={tab.value} key={tab.value}>
                  {tab.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            طرح مرتبط (اختیاری)
            <select
              name="projectId"
              defaultValue={value?.projectId ?? ""}
              disabled={!canEdit}
            >
              <option value="">بدون طرح مشخص</option>
              {projects.map((project) => (
                <option value={project.id} key={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            تاریخ
            <input
              name="documentDate"
              type="date"
              defaultValue={toDateInput(value?.documentDate ?? null)}
              disabled={!canEdit}
            />
          </label>

          <label>
            توضیح کوتاه
            <textarea
              name="description"
              rows={3}
              maxLength={2000}
              defaultValue={value?.description ?? ""}
              disabled={!canEdit}
            />
          </label>

          <label>
            Upload فایل
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) =>
                setFile(event.target.files?.[0] ?? null)
              }
              disabled={!canEdit}
            />
            <small>
              JPEG، PNG، WebP یا PDF تا ۱۵ مگابایت
              {value?.file ? " · فایل فعلی: " + value.file.originalName : ""}
            </small>
          </label>

          <label>
            وضعیت انتشار
            <select
              value={desiredStatus}
              onChange={(event) =>
                setDesiredStatus(event.target.value as PublishStatus)
              }
              disabled={!capabilities.publish}
            >
              <option value="DRAFT">پیش‌نویس</option>
              <option value="PUBLISHED">منتشر شده</option>
            </select>
          </label>

          <div className={styles.transparencyDrawerSpacer} />

          {error ? <p className={styles.formError}>{error}</p> : null}

          {canEdit || capabilities.publish ? (
            <button
              type="submit"
              className={styles.transparencySave}
              disabled={busy}
            >
              {busy ? "در حال ذخیره…" : "ذخیره"}
            </button>
          ) : null}
        </form>
      </aside>
    </div>
  );
}
