"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AdminApiError, adminApi } from "../../../lib/admin-api";
import styles from "../admin.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = new FormData(event.currentTarget);

    try {
      await adminApi("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof AdminApiError
          ? err.status === 429
            ? "تعداد تلاش‌های ورود زیاد بوده است. کمی بعد دوباره تلاش کنید."
            : "ایمیل یا رمز عبور صحیح نیست."
          : "ارتباط با سرور برقرار نشد.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <form className={styles.loginCard} onSubmit={submit}>
        <div className={styles.loginBrand}>
          <div className={styles.brandMark}>آ</div>
          <div>
            <strong>مرکز نیکوکاری آینه</strong>
            <span>ورود به پنل مدیریت</span>
          </div>
        </div>
        <label>
          ایمیل
          <input dir="ltr" name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          رمز عبور
          <input
            dir="ltr"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            required
          />
        </label>
        {error ? <p className={styles.formError}>{error}</p> : null}
        <button className={styles.primaryButton} disabled={busy} type="submit">
          {busy ? "در حال ورود…" : "ورود"}
        </button>
      </form>
    </main>
  );
}
