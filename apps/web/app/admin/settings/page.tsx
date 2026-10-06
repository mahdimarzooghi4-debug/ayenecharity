"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AdminApiError,
  adminApi,
} from "../../../lib/admin-api";
import styles from "../admin.module.css";
import { AdminShell } from "../components/admin-shell";

type AdminRole =
  | "SUPER_ADMIN"
  | "FINANCE"
  | "PROJECT_MANAGER"
  | "CONTENT_MANAGER";
type AdminUserStatus = "ACTIVE" | "DISABLED";

interface SettingsData {
  center: {
    name: string;
    parentOrganization: string;
    address: string;
    phone: string;
    email: string;
  };
  contribution: {
    cardNumber: string;
    accountHolderName: string;
  };
  social: {
    instagram: string;
    bale: string;
    telegram: string;
  };
}

interface AdminUserItem {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: AdminRole;
  status: AdminUserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UsersResponse {
  items: AdminUserItem[];
}

const roleLabels: Record<AdminRole, string> = {
  SUPER_ADMIN: "مدیر کل",
  FINANCE: "مالی",
  PROJECT_MANAGER: "مدیر طرح",
  CONTENT_MANAGER: "محتوا",
};

const roleOptions: Array<{ value: AdminRole; label: string }> = [
  { value: "SUPER_ADMIN", label: "مدیر کل" },
  { value: "FINANCE", label: "مالی" },
  { value: "PROJECT_MANAGER", label: "مدیر طرح" },
  { value: "CONTENT_MANAGER", label: "محتوا" },
];

function makeInitialPassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    (value) => alphabet[value % alphabet.length]!,
  ).join("");
}

function apiMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof AdminApiError) {
    switch (error.body.code) {
      case "INVALID_CARD_NUMBER":
        return "شماره کارت باید دقیقاً ۱۶ رقم باشد.";
      case "INCOMPLETE_CONTRIBUTION_SETTINGS":
        return "شماره کارت و نام صاحب حساب باید با هم ثبت شوند.";
      case "PLACEHOLDER_SOCIAL_URL":
        return "لینک Placeholder یا آزمایشی قابل ذخیره نیست.";
      case "INVALID_SOCIAL_URL":
        return "لینک شبکه اجتماعی معتبر نیست.";
      case "ADMIN_USERNAME_CONFLICT":
        return "این نام کاربری قبلاً ثبت شده است.";
      case "ADMIN_EMAIL_CONFLICT":
        return "این ایمیل قبلاً برای کاربر دیگری ثبت شده است.";
      case "SELF_DISABLE_NOT_ALLOWED":
        return "امکان غیرفعال‌کردن حساب خودتان وجود ندارد.";
      case "SELF_ROLE_CHANGE_NOT_ALLOWED":
        return "امکان تغییر نقش حساب خودتان وجود ندارد.";
      case "LAST_ACTIVE_SUPER_ADMIN":
        return "حداقل یک مدیر کل فعال باید در سامانه باقی بماند.";
      default:
        return error.body.message ?? fallback;
    }
  }

  return fallback;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [drawer, setDrawer] = useState<AdminUserItem | "create" | null>(
    null,
  );
  const [pageError, setPageError] = useState("");
  const [busySection, setBusySection] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [oneTimePassword, setOneTimePassword] = useState<{
    username: string;
    password: string;
  } | null>(null);

  const load = useCallback(async () => {
    setPageError("");

    try {
      const [settingsResult, usersResult] = await Promise.all([
        adminApi<SettingsData>("/admin/settings"),
        adminApi<UsersResponse>("/admin/users"),
      ]);

      setSettings(settingsResult);
      setUsers(usersResult.items);
    } catch (error) {
      setPageError(
        apiMessage(
          error,
          "دریافت تنظیمات یا کاربران ناموفق بود.",
        ),
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveCenter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await saveSettings(
      "center",
      {
        name: String(form.get("name") ?? "").trim(),
        parentOrganization: String(
          form.get("parentOrganization") ?? "",
        ).trim(),
        address: String(form.get("address") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
      },
    );
  }

  async function saveContribution(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await saveSettings(
      "contribution",
      {
        cardNumber: String(form.get("cardNumber") ?? "").trim(),
        accountHolderName: String(
          form.get("accountHolderName") ?? "",
        ).trim(),
      },
    );
  }

  async function saveSocial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await saveSettings(
      "social",
      {
        instagram: String(form.get("instagram") ?? "").trim(),
        bale: String(form.get("bale") ?? "").trim(),
        telegram: String(form.get("telegram") ?? "").trim(),
      },
    );
  }

  async function saveSettings(
    section: "center" | "contribution" | "social",
    payload: Record<string, string>,
  ) {
    setBusySection(section);
    setPageError("");

    try {
      const result = await adminApi<SettingsData>(
        "/admin/settings/" + section,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
      setSettings(result);
    } catch (error) {
      setPageError(
        apiMessage(error, "ذخیره تنظیمات انجام نشد."),
      );
    } finally {
      setBusySection(null);
    }
  }

  async function toggleUser(user: AdminUserItem) {
    const nextStatus: AdminUserStatus =
      user.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    const verb =
      nextStatus === "DISABLED" ? "غیرفعال" : "فعال";

    if (
      !window.confirm(
        `حساب ${user.fullName} ${verb} شود؟`,
      )
    ) {
      return;
    }

    setBusyUserId(user.id);
    setPageError("");

    try {
      await adminApi(
        "/admin/users/" + user.id + "/status",
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      await load();
    } catch (error) {
      setPageError(
        apiMessage(error, "تغییر وضعیت کاربر انجام نشد."),
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function copyInitialPassword() {
    if (!oneTimePassword) return;

    try {
      await navigator.clipboard.writeText(
        oneTimePassword.password,
      );
    } catch {
      setPageError(
        "کپی خودکار ممکن نشد؛ رمز را به‌صورت دستی کپی کنید.",
      );
    }
  }

  return (
    <AdminShell
      title="تنظیمات"
      subtitle="تنظیمات عمومی و اطلاعات پایه مرکز"
    >
      <div className={styles.settingsHeader}>
        <span className={styles.noteBadge}>
          مقادیر حساس فقط برای مدیر کل قابل ویرایش‌اند
        </span>

        <div>
          <h1>تنظیمات</h1>
          <p>تنظیمات عمومی و اطلاعات پایه مرکز</p>
        </div>
      </div>

      {pageError ? (
        <p className={styles.errorBox}>{pageError}</p>
      ) : null}

      {settings ? (
        <div className={styles.settingsCards}>
          <form
            className={styles.centerSettingsCard}
            onSubmit={saveCenter}
          >
            <SettingsCardHeader
              title="اطلاعات مرکز"
              subtitle="مشخصات پایه مجموعه"
              busy={busySection === "center"}
            />

            <div className={styles.settingsFieldRow}>
              <SettingsField
                label="نام مرکز"
                name="name"
                defaultValue={settings.center.name}
                maxLength={160}
                required
              />
              <SettingsField
                label="نام مجموعه مادر"
                name="parentOrganization"
                defaultValue={settings.center.parentOrganization}
                maxLength={160}
                required
              />
            </div>

            <SettingsField
              label="آدرس"
              name="address"
              defaultValue={settings.center.address}
              maxLength={500}
              placeholder="[آدرس مرکز]"
            />

            <div className={styles.settingsFieldRow}>
              <SettingsField
                label="شماره تماس"
                name="phone"
                defaultValue={settings.center.phone}
                maxLength={40}
                placeholder="[شماره تماس]"
                ltr
              />
              <SettingsField
                label="ایمیل"
                name="email"
                type="email"
                defaultValue={settings.center.email}
                maxLength={254}
                placeholder="[ایمیل مرکز]"
                ltr
              />
            </div>
          </form>

          <div className={styles.settingsRightStack}>
            <form
              className={styles.compactSettingsCard}
              onSubmit={saveContribution}
            >
              <SettingsCardHeader
                title="اطلاعات مشارکت"
                subtitle="منبع مرکزی اطلاعات واریز"
                busy={busySection === "contribution"}
              />

              <div className={styles.settingsFieldRowCompact}>
                <SettingsField
                  label="شماره کارت"
                  name="cardNumber"
                  defaultValue={settings.contribution.cardNumber}
                  maxLength={40}
                  placeholder="[شماره کارت]"
                  ltr
                />
                <SettingsField
                  label="نام صاحب حساب"
                  name="accountHolderName"
                  defaultValue={
                    settings.contribution.accountHolderName
                  }
                  maxLength={160}
                  placeholder="[نام صاحب حساب]"
                />
              </div>

              <div className={styles.contributionSettingsNote}>
                <p>
                  این اطلاعات به‌صورت پیش‌فرض در همه طرح‌ها استفاده
                  می‌شود.
                </p>
                <img
                  src="/admin/settings/info.svg"
                  alt=""
                  width={16}
                  height={16}
                />
              </div>
            </form>

            <form
              className={styles.compactSettingsCard}
              onSubmit={saveSocial}
            >
              <SettingsCardHeader
                title="شبکه‌های اجتماعی"
                busy={busySection === "social"}
              />

              <SettingsField
                label="Instagram"
                name="instagram"
                defaultValue={settings.social.instagram}
                maxLength={500}
                placeholder="[لینک Instagram]"
                ltr
              />

              <div className={styles.settingsFieldRowCompact}>
                <SettingsField
                  label="Telegram"
                  name="telegram"
                  defaultValue={settings.social.telegram}
                  maxLength={500}
                  placeholder="[لینک Telegram]"
                  ltr
                />
                <SettingsField
                  label="Bale"
                  name="bale"
                  defaultValue={settings.social.bale}
                  maxLength={500}
                  placeholder="[لینک Bale]"
                  ltr
                />
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <section className={styles.usersPanel}>
        <header className={styles.usersPanelHeader}>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => setDrawer("create")}
          >
            افزودن کاربر
          </button>
          <div>
            <h2>کاربران و دسترسی</h2>
            <p>مدیریت نقش و وضعیت کاربران پنل</p>
          </div>
        </header>

        {oneTimePassword ? (
          <div className={styles.initialPasswordNotice}>
            <div>
              <strong>رمز اولیه کاربر جدید</strong>
              <span dir="ltr">{oneTimePassword.username}</span>
              <code dir="ltr">{oneTimePassword.password}</code>
              <small>
                این مقدار از API برنمی‌گردد و فقط همین‌جا در حافظه مرورگر
                نمایش داده می‌شود.
              </small>
            </div>
            <div>
              <button type="button" onClick={copyInitialPassword}>
                کپی رمز
              </button>
              <button
                type="button"
                onClick={() => setOneTimePassword(null)}
              >
                بستن
              </button>
            </div>
          </div>
        ) : null}

        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.usersTable}`}>
            <thead>
              <tr>
                <th>نام</th>
                <th>نام کاربری</th>
                <th>ایمیل</th>
                <th>نقش</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong className={styles.settingsUserName}>
                      {user.fullName}
                    </strong>
                  </td>
                  <td dir="ltr">{user.username}</td>
                  <td dir="ltr">{user.email}</td>
                  <td>{roleLabels[user.role]}</td>
                  <td>
                    <span
                      className={
                        user.status === "ACTIVE"
                          ? styles.settingsUserActive
                          : styles.settingsUserDisabled
                      }
                    >
                      {user.status === "ACTIVE"
                        ? "فعال"
                        : "غیرفعال"}
                      <img
                        src={
                          user.status === "ACTIVE"
                            ? "/admin/settings/status-active.svg"
                            : "/admin/settings/status-inactive.svg"
                        }
                        alt=""
                        width={6}
                        height={6}
                      />
                    </span>
                  </td>
                  <td>
                    <div className={styles.settingsUserActions}>
                      <button
                        type="button"
                        onClick={() => setDrawer(user)}
                      >
                        ویرایش
                      </button>
                      <button
                        type="button"
                        className={
                          user.status === "ACTIVE"
                            ? styles.dangerText
                            : styles.mutedAction
                        }
                        disabled={busyUserId === user.id}
                        onClick={() => void toggleUser(user)}
                      >
                        {user.status === "ACTIVE"
                          ? "غیرفعال"
                          : "فعال"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    کاربری برای نمایش وجود ندارد.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className={styles.usersGuide}>
          نقش‌های V1: مدیر کل، مالی، مدیر طرح و محتوا. افزودن و ویرایش
          در Drawer بسته انجام می‌شود.
        </div>
      </section>

      {drawer ? (
        <AdminUserDrawer
          value={drawer === "create" ? null : drawer}
          onClose={() => setDrawer(null)}
          onSaved={async (created) => {
            setDrawer(null);
            if (created) {
              setOneTimePassword(created);
            }
            await load();
          }}
        />
      ) : null}
    </AdminShell>
  );
}

function SettingsCardHeader({
  title,
  subtitle,
  busy,
}: {
  title: string;
  subtitle?: string;
  busy: boolean;
}) {
  return (
    <div className={styles.settingsCardHeader}>
      <button type="submit" disabled={busy}>
        {busy ? "در حال ذخیره…" : "ذخیره"}
      </button>
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </div>
  );
}

function SettingsField({
  label,
  name,
  defaultValue,
  type = "text",
  maxLength,
  placeholder,
  required = false,
  ltr = false,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  maxLength: number;
  placeholder?: string;
  required?: boolean;
  ltr?: boolean;
}) {
  return (
    <label className={styles.settingsField}>
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        dir={ltr ? "ltr" : "rtl"}
      />
    </label>
  );
}

function AdminUserDrawer({
  value,
  onClose,
  onSaved,
}: {
  value: AdminUserItem | null;
  onClose: () => void;
  onSaved: (
    created: { username: string; password: string } | null,
  ) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "").trim().toLowerCase();
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    const role = String(form.get("role") ?? "") as AdminRole;
    const status = String(
      form.get("status") ?? "",
    ) as AdminUserStatus;

    try {
      if (!value) {
        const initialPassword = makeInitialPassword();

        await adminApi<AdminUserItem>("/admin/users", {
          method: "POST",
          body: JSON.stringify({
            username,
            fullName,
            email,
            role,
            status,
            initialPassword,
          }),
        });

        await onSaved({ username, password: initialPassword });
        return;
      }

      const identityChanged =
        username !== value.username ||
        fullName !== value.fullName ||
        email !== value.email ||
        role !== value.role;

      if (identityChanged) {
        await adminApi<AdminUserItem>(
          "/admin/users/" + value.id,
          {
            method: "PATCH",
            body: JSON.stringify({
              username,
              fullName,
              email,
              role,
            }),
          },
        );
      }

      if (status !== value.status) {
        await adminApi<AdminUserItem>(
          "/admin/users/" + value.id + "/status",
          {
            method: "PATCH",
            body: JSON.stringify({ status }),
          },
        );
      }

      await onSaved(null);
    } catch (error) {
      setError(
        apiMessage(error, "ذخیره کاربر انجام نشد."),
      );
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
        className={styles.settingsUserDrawer}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.settingsUserDrawerHeader}>
          <div>
            <h2>افزودن یا ویرایش کاربر</h2>
            <p>اطلاعات پایه دسترسی V1</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="بستن"
          >
            <img
              src="/admin/settings/close.svg"
              alt=""
              width={18}
              height={18}
            />
          </button>
        </header>

        <form
          className={styles.settingsUserForm}
          onSubmit={submit}
        >
          <label>
            نام کاربری
            <input
              name="username"
              defaultValue={value?.username ?? ""}
              minLength={3}
              maxLength={64}
              pattern="[a-zA-Z0-9._-]+"
              dir="ltr"
              required
            />
          </label>

          <label>
            نام
            <input
              name="fullName"
              defaultValue={value?.fullName ?? ""}
              minLength={2}
              maxLength={120}
              required
            />
          </label>

          <label>
            ایمیل
            <input
              name="email"
              type="email"
              defaultValue={value?.email ?? ""}
              maxLength={254}
              dir="ltr"
              required
            />
          </label>

          <label>
            نقش
            <select
              name="role"
              defaultValue={value?.role ?? "CONTENT_MANAGER"}
            >
              {roleOptions.map((role) => (
                <option value={role.value} key={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            وضعیت
            <select
              name="status"
              defaultValue={value?.status ?? "ACTIVE"}
            >
              <option value="ACTIVE">فعال</option>
              <option value="DISABLED">غیرفعال</option>
            </select>
          </label>

          <div className={styles.userAccessGuide}>
            {value
              ? "در V1 فقط نقش انتخاب می‌شود و Permission Matrix پیچیده وجود ندارد."
              : "برای کاربر جدید یک رمز اولیه امن در مرورگر ساخته می‌شود و پس از ثبت فقط یک‌بار نمایش داده خواهد شد."}
          </div>

          <div className={styles.settingsUserDrawerSpacer} />

          {error ? <p className={styles.formError}>{error}</p> : null}

          <button
            className={styles.settingsUserSave}
            type="submit"
            disabled={busy}
          >
            {busy ? "در حال ذخیره…" : "ذخیره تغییرات"}
          </button>
        </form>
      </aside>
    </div>
  );
}
