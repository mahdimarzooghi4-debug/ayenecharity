"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { AdminApiError, adminApi } from "../../../lib/admin-api";
import styles from "../admin.module.css";
import { AdminShell } from "../components/admin-shell";

type ProjectStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";

interface Project {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  mainImageAssetId: string | null;
  mainImageUrl: string | null;
  status: ProjectStatus;
  visibility: boolean;
  displayOrder: number;
  contributionCount: number;
  updatedAt: string;
  createdAt: string;
  publishedAt: string | null;
}

interface ProjectListResponse {
  items: Project[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const faNumber = new Intl.NumberFormat("fa-IR");
const faDate = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" });

const statusLabels: Record<ProjectStatus, string> = {
  DRAFT: "پیش‌نویس",
  ACTIVE: "فعال",
  INACTIVE: "غیرفعال",
  ARCHIVED: "بایگانی",
};

export default function AdminProjectsPage() {
  const [data, setData] = useState<ProjectListResponse | null>(null);
  const [status, setStatus] = useState<"" | ProjectStatus>("");
  const [search, setSearch] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState<{ mode: "create" } | { mode: "edit"; project: Project } | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const params = useMemo(() => {
    const q = new URLSearchParams({
      page: String(page),
      pageSize: "25",
      sort: "updatedAt",
      order: "desc",
    });
    if (status) q.set("status", status);
    if (querySearch) q.set("search", querySearch);
    return q.toString();
  }, [page, querySearch, status]);

  const load = useCallback(() => {
    setError("");
    return adminApi<ProjectListResponse>("/admin/projects?" + params)
      .then(setData)
      .catch(() => setError("دریافت فهرست طرح‌ها ناموفق بود."));
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuerySearch(search.trim());
  }

  async function changeState(project: Project, next: ProjectStatus, visibility?: boolean) {
    setBusyId(project.id);
    setError("");
    try {
      await adminApi("/admin/projects/" + project.id + "/state", {
        method: "PATCH",
        body: JSON.stringify({ status: next, visibility }),
      });
      await load();
    } catch (err) {
      setError(
        err instanceof AdminApiError && err.body.code === "PROJECT_NOT_PUBLISHABLE"
          ? "برای فعال‌سازی، عنوان، slug، توضیح کوتاه، توضیح کامل و تصویر اصلی باید تکمیل شوند."
          : "تغییر وضعیت طرح انجام نشد.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell title="طرح‌ها" subtitle="مدیریت فهرست و نحوه نمایش طرح‌ها">
      <div className={styles.pageHeader}>
        <button className={styles.primaryButton} onClick={() => setDrawer({ mode: "create" })}>
          ایجاد طرح جدید
        </button>
        <div>
          <h1>طرح‌ها</h1>
          <p>فهرست فشرده طرح‌های مرکز و تنظیمات انتشار</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filterTabs}>
          {[
            ["", "همه"],
            ["ACTIVE", "فعال"],
            ["INACTIVE", "غیرفعال"],
            ["DRAFT", "پیش‌نویس"],
            ["ARCHIVED", "بایگانی"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={status === value ? styles.filterActive : styles.filterButton}
              onClick={() => {
                setStatus(value as "" | ProjectStatus);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <form className={styles.searchForm} onSubmit={submitSearch}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جست‌وجوی نام یا slug"
          />
          <button type="submit">جست‌وجو</button>
        </form>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <section className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>نام طرح</th>
                <th>وضعیت</th>
                <th>مشارکت‌ها</th>
                <th>آخرین بروزرسانی</th>
                <th>نمایش در سایت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((project) => (
                <tr key={project.id}>
                  <td>
                    <div className={styles.projectName}>
                      <strong>{project.title}</strong>
                      <small dir="ltr">{project.slug}</small>
                    </div>
                  </td>
                  <td><ProjectBadge status={project.status} /></td>
                  <td>{faNumber.format(project.contributionCount)}</td>
                  <td>{faDate.format(new Date(project.updatedAt))}</td>
                  <td>
                    {project.status === "ACTIVE" ? (
                      <button
                        type="button"
                        className={project.visibility ? styles.visibilityOn : styles.visibilityOff}
                        disabled={busyId === project.id}
                        onClick={() => changeState(project, "ACTIVE", !project.visibility)}
                      >
                        {project.visibility ? "نمایش" : "مخفی"}
                      </button>
                    ) : (
                      <span className={styles.visibilityOff}>مخفی</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button onClick={() => setDrawer({ mode: "edit", project })}>ویرایش</button>
                      {project.status === "ACTIVE" ? (
                        <button
                          className={styles.dangerText}
                          disabled={busyId === project.id}
                          onClick={() => changeState(project, "INACTIVE", false)}
                        >
                          غیرفعال
                        </button>
                      ) : project.status !== "ARCHIVED" ? (
                        <button
                          disabled={busyId === project.id}
                          onClick={() => changeState(project, "ACTIVE", true)}
                        >
                          فعال‌سازی
                        </button>
                      ) : null}
                      {project.status !== "ARCHIVED" ? (
                        <button
                          className={styles.mutedText}
                          disabled={busyId === project.id}
                          onClick={() => changeState(project, "ARCHIVED", false)}
                        >
                          بایگانی
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {data && data.items.length === 0 ? (
                <tr><td colSpan={6} className={styles.emptyCell}>طرحی با این فیلتر پیدا نشد.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <button disabled={!data || data.page <= 1} onClick={() => setPage((value) => value - 1)}>
            قبلی
          </button>
          <span>
            صفحه {faNumber.format(data?.page ?? 1)} از {faNumber.format(data?.totalPages ?? 1)}
            {" · "}
            {faNumber.format(data?.total ?? 0)} طرح
          </span>
          <button
            disabled={!data || data.page >= data.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            بعدی
          </button>
        </div>
      </section>

      {drawer ? (
        <ProjectDrawer
          value={drawer.mode === "edit" ? drawer.project : null}
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

function ProjectDrawer({
  value,
  onClose,
  onSaved,
}: {
  value: Project | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      let mainImageAssetId = value?.mainImageAssetId ?? undefined;

      if (file) {
        const upload = new FormData();
        upload.set("purpose", "PROJECT_IMAGE");
        upload.set("file", file);
        const media = await adminApi<{ id: string }>("/admin/media", {
          method: "POST",
          body: upload,
        });
        mainImageAssetId = media.id;
      }

      const payload = {
        title: String(form.get("title") ?? ""),
        slug: String(form.get("slug") ?? "") || undefined,
        shortDescription: String(form.get("shortDescription") ?? "") || undefined,
        description: String(form.get("description") ?? "") || undefined,
        displayOrder: Number(form.get("displayOrder") ?? 0),
        ...(mainImageAssetId ? { mainImageAssetId } : {}),
      };

      if (value) {
        await adminApi("/admin/projects/" + value.id, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await adminApi("/admin/projects", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await onSaved();
    } catch (err) {
      if (err instanceof AdminApiError) {
        if (err.body.code === "PROJECT_SLUG_CONFLICT") {
          setError("این slug قبلاً استفاده شده است.");
        } else if (err.body.code === "INVALID_MEDIA_UPLOAD") {
          setError("نوع یا حجم تصویر معتبر نیست.");
        } else {
          setError(err.body.message ?? "ذخیره طرح انجام نشد.");
        }
      } else {
        setError("ذخیره طرح انجام نشد.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.drawerBackdrop} onMouseDown={onClose}>
      <aside className={styles.drawer} onMouseDown={(event) => event.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <button type="button" onClick={onClose}>بستن</button>
          <div>
            <h2>{value ? "ویرایش طرح" : "ایجاد طرح جدید"}</h2>
            <p>اطلاعات انتشار و نمایش طرح</p>
          </div>
        </div>
        <form className={styles.drawerForm} onSubmit={submit}>
          <label>
            عنوان طرح
            <input name="title" defaultValue={value?.title ?? ""} required minLength={2} />
          </label>
          <label>
            Slug
            <input
              name="slug"
              dir="ltr"
              defaultValue={value?.slug.startsWith("draft-") ? "" : value?.slug ?? ""}
              placeholder="example-project"
            />
          </label>
          <label>
            توضیح کوتاه
            <textarea name="shortDescription" rows={3} defaultValue={value?.shortDescription ?? ""} />
          </label>
          <label>
            توضیح کامل
            <textarea name="description" rows={7} defaultValue={value?.description ?? ""} />
          </label>
          <div className={styles.formRow}>
            <label>
              ترتیب نمایش
              <input name="displayOrder" type="number" min={0} defaultValue={value?.displayOrder ?? 0} />
            </label>
            <label>
              تصویر اصلی
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          {value?.mainImageUrl ? (
            <img className={styles.drawerPreview} src={value.mainImageUrl} alt="" />
          ) : null}
          <p className={styles.helperText}>
            پیش‌نویس می‌تواند ناقص باشد. برای فعال‌سازی، slug، توضیحات و تصویر اصلی الزامی‌اند.
          </p>
          {error ? <p className={styles.formError}>{error}</p> : null}
          <div className={styles.drawerActions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose}>انصراف</button>
            <button type="submit" className={styles.primaryButton} disabled={busy}>
              {busy ? "در حال ذخیره…" : value ? "ذخیره تغییرات" : "ایجاد پیش‌نویس"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function ProjectBadge({ status }: { status: ProjectStatus }) {
  return <span className={styles["projectStatus" + status]}>{statusLabels[status]}</span>;
}
