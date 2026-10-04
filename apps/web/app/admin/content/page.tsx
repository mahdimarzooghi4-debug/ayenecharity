"use client";

import {
  DragEvent,
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

interface HeroSlide {
  id: string;
  imageAssetId: string;
  imageName: string;
  imageUrl: string | null;
  title: string;
  description: string;
  ctaLabel: string | null;
  ctaTarget: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ContentBlock {
  name: string;
  key: string;
  label: string;
  value: string;
  maxLength: number;
}

interface ContentResponse {
  heroSlides: HeroSlide[];
  blocks: ContentBlock[];
  capabilities: {
    update: boolean;
  };
  limits: {
    maxActiveHeroSlides: number;
  };
  footer: {
    source: "settings";
    note: string;
  };
}

interface MediaUploadResponse {
  id: string;
  originalName: string;
  publicUrl: string | null;
}

type DrawerState =
  | { kind: "hero"; value: HeroSlide | null }
  | { kind: "block"; value: ContentBlock }
  | null;

const faNumber = new Intl.NumberFormat("fa-IR");

function moveItem<T>(items: T[], from: number, to: number): T[] {
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  if (item === undefined) return items;
  copy.splice(to, 0, item);
  return copy;
}

export default function AdminContentPage() {
  const [data, setData] = useState<ContentResponse | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<HeroSlide | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");

    try {
      const result = await adminApi<ContentResponse>("/admin/content");
      setData(result);
    } catch {
      setError("دریافت محتوای سایت ناموفق بود.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeCount = useMemo(
    () => data?.heroSlides.filter((slide) => slide.active).length ?? 0,
    [data],
  );

  async function reorder(targetId: string) {
    if (!data?.capabilities.update || !dragId || dragId === targetId) {
      setDragId(null);
      return;
    }

    const from = data.heroSlides.findIndex(
      (slide) => slide.id === dragId,
    );
    const to = data.heroSlides.findIndex(
      (slide) => slide.id === targetId,
    );

    if (from < 0 || to < 0) {
      setDragId(null);
      return;
    }

    const next = moveItem(data.heroSlides, from, to);
    setData({ ...data, heroSlides: next });
    setDragId(null);
    setError("");

    try {
      const updated = await adminApi<ContentResponse>(
        "/admin/content/hero-slides/reorder/all",
        {
          method: "PUT",
          body: JSON.stringify({
            ids: next.map((slide) => slide.id),
          }),
        },
      );
      setData(updated);
    } catch {
      setError("ذخیره ترتیب اسلایدها انجام نشد.");
      await load();
    }
  }

  async function removeSlide(slide: HeroSlide) {
    if (!data?.capabilities.update) return;

    setBusyId(slide.id);
    setError("");

    try {
      const result = await adminApi<{
        id: string;
        imageAssetId: string;
      }>("/admin/content/hero-slides/" + slide.id, {
        method: "DELETE",
      });

      await adminApi<void>(
        "/admin/media/" + result.imageAssetId,
        { method: "DELETE" },
      ).catch(() => undefined);

      setDeleteTarget(null);
      await load();
    } catch {
      setError("حذف اسلاید انجام نشد.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell
      title="محتوای سایت"
      subtitle="مدیریت بخش‌های قابل تغییر سایت عمومی"
    >
      <div className={styles.contentHeader}>
        {data?.capabilities.update ? (
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => setDrawer({ kind: "hero", value: null })}
          >
            افزودن اسلاید
          </button>
        ) : (
          <span />
        )}

        <div>
          <h1>محتوای سایت</h1>
          <p>مدیریت بخش‌های قابل تغییر سایت عمومی</p>
        </div>
      </div>

      {error ? <p className={styles.errorBox}>{error}</p> : null}

      <section className={styles.heroManager}>
        <div className={styles.heroManagerHeader}>
          <span>
            {data
              ? `${faNumber.format(activeCount)} از ${faNumber.format(data.limits.maxActiveHeroSlides)} اسلاید فعال`
              : "مدیریت اسلایدها"}
          </span>
          <div>
            <h2>اسلایدر هیرو</h2>
            <p>تصویر، متن، CTA و ترتیب نمایش اسلایدها</p>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.heroSlidesTable}`}>
            <thead>
              <tr>
                <th>تصویر</th>
                <th>عنوان و توضیح</th>
                <th>CTA</th>
                <th>ترتیب</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {(data?.heroSlides ?? []).map((slide) => (
                <tr
                  key={slide.id}
                  draggable={Boolean(data?.capabilities.update)}
                  onDragStart={() => setDragId(slide.id)}
                  onDragOver={(event: DragEvent<HTMLTableRowElement>) => {
                    if (data?.capabilities.update) {
                      event.preventDefault();
                    }
                  }}
                  onDrop={() => void reorder(slide.id)}
                  onDragEnd={() => setDragId(null)}
                  className={
                    dragId === slide.id
                      ? styles.heroSlideDragging
                      : undefined
                  }
                >
                  <td>
                    {slide.imageUrl ? (
                      <img
                        className={styles.heroSlidePreview}
                        src={slide.imageUrl}
                        alt=""
                        width={112}
                        height={52}
                      />
                    ) : (
                      <div className={styles.heroSlidePreviewEmpty}>
                        بدون تصویر
                      </div>
                    )}
                  </td>
                  <td>
                    <div className={styles.heroSlideCopy}>
                      <strong>{slide.title}</strong>
                      <span>{slide.description}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.heroSlideCta}>
                      <span>{slide.ctaLabel ?? "—"}</span>
                      {slide.ctaTarget ? (
                        <small dir="ltr">{slide.ctaTarget}</small>
                      ) : null}
                    </div>
                  </td>
                  <td>{faNumber.format(slide.displayOrder)}</td>
                  <td>
                    <span
                      className={
                        slide.active
                          ? styles.heroStatusActive
                          : styles.heroStatusInactive
                      }
                    >
                      {slide.active ? "فعال" : "غیرفعال"}
                      <img
                        src={
                          slide.active
                            ? "/admin/content/status-active.svg"
                            : "/admin/content/status-inactive.svg"
                        }
                        alt=""
                        width={6}
                        height={6}
                      />
                    </span>
                  </td>
                  <td>
                    <div className={styles.heroSlideActions}>
                      {data?.capabilities.update ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setDrawer({ kind: "hero", value: slide })
                            }
                          >
                            ویرایش
                          </button>
                          <button
                            type="button"
                            className={styles.dangerText}
                            disabled={busyId === slide.id}
                            onClick={() => setDeleteTarget(slide)}
                          >
                            حذف
                          </button>
                          <span
                            className={styles.heroDragHandle}
                            title="برای تغییر ترتیب بکشید"
                          >
                            <img
                              src="/admin/content/grip.svg"
                              alt=""
                              width={16}
                              height={16}
                            />
                          </span>
                        </>
                      ) : (
                        <span className={styles.mutedText}>
                          فقط مشاهده
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {data && data.heroSlides.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    هنوز اسلایدی ثبت نشده است.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className={styles.contentLowerGrid}>
        <section className={styles.homeContentBlocks}>
          <div className={styles.contentSectionTitle}>
            <div>
              <h2>متن‌های صفحه اصلی</h2>
              <p>Content Blockهای قابل ویرایش</p>
            </div>
          </div>

          <div className={styles.contentBlocksList}>
            {(data?.blocks ?? []).map((block) => (
              <div className={styles.contentBlockRow} key={block.key}>
                {data?.capabilities.update ? (
                  <button
                    type="button"
                    onClick={() =>
                      setDrawer({ kind: "block", value: block })
                    }
                  >
                    ویرایش
                  </button>
                ) : (
                  <span className={styles.mutedText}>فقط مشاهده</span>
                )}
                <div>
                  <strong>{block.label}</strong>
                  <span>{block.value}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.footerSourceCard}>
          <div className={styles.contentSectionTitle}>
            <div>
              <h2>پابرگ</h2>
              <p>اطلاعات تماس و شبکه‌های اجتماعی</p>
            </div>
          </div>

          <p className={styles.footerSourceNote}>
            {data?.footer.note ??
              "این اطلاعات از تنظیمات عمومی مرکز دریافت می‌شوند."}
          </p>
        </section>
      </div>

      {drawer && data ? (
        drawer.kind === "hero" ? (
          <HeroDrawer
            value={drawer.value}
            activeCount={activeCount}
            maxActive={data.limits.maxActiveHeroSlides}
            onClose={() => setDrawer(null)}
            onSaved={async () => {
              setDrawer(null);
              await load();
            }}
          />
        ) : (
          <ContentBlockDrawer
            value={drawer.value}
            onClose={() => setDrawer(null)}
            onSaved={async () => {
              setDrawer(null);
              await load();
            }}
          />
        )
      ) : null}

      {deleteTarget ? (
        <DeleteHeroModal
          value={deleteTarget}
          busy={busyId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void removeSlide(deleteTarget)}
        />
      ) : null}
    </AdminShell>
  );
}

function HeroDrawer({
  value,
  activeCount,
  maxActive,
  onClose,
  onSaved,
}: {
  value: HeroSlide | null;
  activeCount: number;
  maxActive: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [active, setActive] = useState(value?.active ?? false);

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : value?.imageUrl ?? null),
    [file, value?.imageUrl],
  );

  useEffect(() => {
    return () => {
      if (file && previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file, previewUrl]);

  const activationBlocked =
    !value?.active && activeCount >= maxActive;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const ctaLabel = String(form.get("ctaLabel") ?? "").trim();
    const ctaTarget = String(form.get("ctaTarget") ?? "").trim();
    const displayOrder = Number(form.get("displayOrder") ?? 0);

    if (!value && !file) {
      setError("برای اسلاید جدید، تصویر Hero الزامی است.");
      setBusy(false);
      return;
    }

    if (active && activationBlocked) {
      setError("حداکثر چهار اسلاید می‌توانند هم‌زمان فعال باشند.");
      setBusy(false);
      return;
    }

    let uploadedAssetId: string | null = null;

    try {
      let imageAssetId = value?.imageAssetId;

      if (file) {
        const upload = new FormData();
        upload.set("purpose", "HERO_IMAGE");
        upload.set("file", file);

        const media = await adminApi<MediaUploadResponse>(
          "/admin/media",
          {
            method: "POST",
            body: upload,
          },
        );
        uploadedAssetId = media.id;
        imageAssetId = media.id;
      }

      const payload = {
        imageAssetId,
        title,
        description,
        ctaLabel: ctaLabel || null,
        ctaTarget: ctaTarget || null,
        displayOrder:
          Number.isFinite(displayOrder) && displayOrder >= 0
            ? displayOrder
            : 0,
        active,
      };

      if (value) {
        await adminApi<HeroSlide>(
          "/admin/content/hero-slides/" + value.id,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
        );
      } else {
        await adminApi<HeroSlide>(
          "/admin/content/hero-slides",
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );
      }

      if (
        uploadedAssetId &&
        value?.imageAssetId &&
        value.imageAssetId !== uploadedAssetId
      ) {
        await adminApi<void>(
          "/admin/media/" + value.imageAssetId,
          { method: "DELETE" },
        ).catch(() => undefined);
      }

      await onSaved();
    } catch (err) {
      if (uploadedAssetId) {
        await adminApi<void>(
          "/admin/media/" + uploadedAssetId,
          { method: "DELETE" },
        ).catch(() => undefined);
      }

      if (err instanceof AdminApiError) {
        if (err.body.code === "HERO_ACTIVE_LIMIT") {
          setError("حداکثر چهار اسلاید می‌توانند هم‌زمان فعال باشند.");
        } else if (err.body.code === "INVALID_HERO_IMAGE") {
          setError("تصویر انتخاب‌شده برای اسلایدر معتبر نیست.");
        } else {
          setError(err.body.message ?? "ذخیره اسلاید انجام نشد.");
        }
      } else {
        setError("ذخیره اسلاید انجام نشد.");
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
        className={styles.contentDrawer}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.contentDrawerHeader}>
          <div>
            <h2>{value ? "ویرایش محتوا" : "افزودن اسلاید"}</h2>
            <p>ویرایش اسلاید یا Content Block</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="بستن"
          >
            <img
              src="/admin/content/close.svg"
              alt=""
              width={18}
              height={18}
            />
          </button>
        </header>

        <form className={styles.contentDrawerForm} onSubmit={submit}>
          <label>
            عنوان
            <input
              name="title"
              defaultValue={value?.title ?? ""}
              minLength={2}
              maxLength={180}
              required
            />
          </label>

          <label>
            توضیح
            <textarea
              name="description"
              defaultValue={value?.description ?? ""}
              minLength={2}
              maxLength={500}
              rows={4}
              required
            />
          </label>

          <label>
            CTA
            <input
              name="ctaLabel"
              defaultValue={value?.ctaLabel ?? ""}
              maxLength={80}
              placeholder="متن CTA"
            />
          </label>

          <label>
            مقصد CTA
            <input
              name="ctaTarget"
              defaultValue={value?.ctaTarget ?? ""}
              maxLength={300}
              placeholder="/projects"
              dir="ltr"
            />
            <small>فقط مسیر داخلی سایت، مانند /projects</small>
          </label>

          <label>
            تصویر
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                setFile(event.target.files?.[0] ?? null)
              }
            />
            <small>JPEG، PNG یا WebP تا ۸ مگابایت</small>
          </label>

          {previewUrl ? (
            <img
              className={styles.contentHeroPreview}
              src={previewUrl}
              alt=""
            />
          ) : null}

          <label>
            ترتیب نمایش
            <input
              name="displayOrder"
              type="number"
              min={0}
              max={100000}
              defaultValue={value?.displayOrder ?? 0}
            />
          </label>

          <label>
            وضعیت
            <select
              value={active ? "active" : "inactive"}
              onChange={(event) =>
                setActive(event.target.value === "active")
              }
            >
              <option value="inactive">غیرفعال</option>
              <option
                value="active"
                disabled={activationBlocked && !active}
              >
                فعال
              </option>
            </select>
            {activationBlocked && !active ? (
              <small>
                سقف چهار اسلاید فعال پر شده است؛ ابتدا یکی را غیرفعال کنید.
              </small>
            ) : null}
          </label>

          <div className={styles.contentDrawerSpacer} />

          {error ? <p className={styles.formError}>{error}</p> : null}

          <button
            type="submit"
            className={styles.contentSave}
            disabled={busy}
          >
            {busy ? "در حال ذخیره…" : "ذخیره تغییرات"}
          </button>
        </form>
      </aside>
    </div>
  );
}

function ContentBlockDrawer({
  value,
  onClose,
  onSaved,
}: {
  value: ContentBlock;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const content = String(form.get("value") ?? "").trim();

    try {
      await adminApi(
        "/admin/content/blocks/" + encodeURIComponent(value.key),
        {
          method: "PATCH",
          body: JSON.stringify({ value: content }),
        },
      );
      await onSaved();
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.body.message ?? "ذخیره محتوا انجام نشد.");
      } else {
        setError("ذخیره محتوا انجام نشد.");
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
        className={styles.contentDrawer}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.contentDrawerHeader}>
          <div>
            <h2>ویرایش محتوا</h2>
            <p>{value.label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="بستن"
          >
            <img
              src="/admin/content/close.svg"
              alt=""
              width={18}
              height={18}
            />
          </button>
        </header>

        <form className={styles.contentDrawerForm} onSubmit={submit}>
          <label>
            {value.label}
            <textarea
              name="value"
              defaultValue={value.value}
              minLength={2}
              maxLength={value.maxLength}
              rows={5}
              required
            />
            <small>
              حداکثر {faNumber.format(value.maxLength)} نویسه
            </small>
          </label>

          <div className={styles.contentDrawerSpacer} />

          {error ? <p className={styles.formError}>{error}</p> : null}

          <button
            type="submit"
            className={styles.contentSave}
            disabled={busy}
          >
            {busy ? "در حال ذخیره…" : "ذخیره تغییرات"}
          </button>
        </form>
      </aside>
    </div>
  );
}

function DeleteHeroModal({
  value,
  busy,
  onCancel,
  onConfirm,
}: {
  value: HeroSlide;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className={styles.contentModalBackdrop}
      onMouseDown={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        className={styles.contentDeleteModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-hero-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div>
          <h2 id="delete-hero-title">حذف اسلاید؟</h2>
          <p>
            اسلاید «{value.title}» از اسلایدر هیرو حذف می‌شود.
          </p>
        </div>
        <div className={styles.contentDeleteActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onCancel}
            disabled={busy}
          >
            لغو
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "در حال حذف…" : "حذف"}
          </button>
        </div>
      </div>
    </div>
  );
}
