"use client";

import { FormEvent, useState } from "react";

import styles from "./contact.module.css";

type RequestType =
  | "VOLUNTEER"
  | "ORGANIZATIONAL"
  | "PROJECT_PROPOSAL";

const requestTypes: Array<{ value: RequestType; label: string }> = [
  { value: "VOLUNTEER", label: "همکاری داوطلبانه" },
  { value: "ORGANIZATIONAL", label: "همکاری سازمانی" },
  { value: "PROJECT_PROPOSAL", label: "پیشنهاد طرح" },
];

function normalizeDigits(value: string): string {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";

  return value
    .split("")
    .map((char) => {
      const pi = persian.indexOf(char);
      if (pi >= 0) return String(pi);

      const ai = arabic.indexOf(char);
      if (ai >= 0) return String(ai);

      return char;
    })
    .join("");
}

function validatePhone(value: string): boolean {
  const normalized = normalizeDigits(value).trim();
  const hasPlus = normalized.startsWith("+");
  const digits = normalized.replace(/[^0-9]/g, "");
  const compact = (hasPlus ? "+" : "") + digits;
  return /^\+?[0-9]{8,15}$/.test(compact);
}

function errorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const message = (payload as { message?: unknown }).message;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (Array.isArray(message)) {
    const first = message.find(
      (item): item is string => typeof item === "string",
    );
    return first ?? null;
  }

  return null;
}

export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    const form = event.currentTarget;
    const data = new FormData(form);

    const fullName = String(data.get("fullName") ?? "").trim();
    const organizationOrProjectName = String(
      data.get("organizationOrProjectName") ?? "",
    ).trim();
    const phone = String(data.get("phone") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const requestType = String(data.get("requestType") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    if (fullName.length < 2) {
      setError("نام و نام خانوادگی را کامل وارد کنید.");
      return;
    }

    if (!validatePhone(phone)) {
      setError("شماره تماس معتبر وارد کنید.");
      return;
    }

    if (!requestTypes.some((item) => item.value === requestType)) {
      setError("نوع درخواست را انتخاب کنید.");
      return;
    }

    if (message.length < 10) {
      setError("توضیحات درخواست را کمی کامل‌تر بنویسید.");
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/cooperation-requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          fullName,
          organizationOrProjectName:
            organizationOrProjectName || undefined,
          phone,
          email: email || undefined,
          requestType,
          message,
        }),
      });

      let payload: unknown = null;
      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        payload = await response.json();
      }

      if (!response.ok) {
        if (response.status === 429) {
          setError(
            "تعداد ارسال‌ها زیاد بوده است. لطفاً کمی بعد دوباره تلاش کنید.",
          );
          return;
        }

        setError(
          errorMessage(payload) ??
            "ارسال درخواست انجام نشد. اطلاعات را بررسی کنید و دوباره تلاش کنید.",
        );
        return;
      }

      form.reset();
      setSuccess(true);
    } catch {
      setError("ارتباط با سامانه برقرار نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.formCard} onSubmit={submit} noValidate>
      <div className={styles.formHeading}>
        <h2>ارسال درخواست همکاری</h2>
        <p>
          اطلاعات اولیه را وارد کنید تا امکان بررسی و پیگیری درخواست فراهم شود.
        </p>
      </div>

      <div className={styles.formRow}>
        <label className={styles.field}>
          <span>نام و نام خانوادگی</span>
          <input
            name="fullName"
            type="text"
            autoComplete="name"
            minLength={2}
            maxLength={120}
            placeholder="نام خود را وارد کنید"
            required
          />
        </label>

        <label className={styles.field}>
          <span>نام مجموعه یا طرح</span>
          <input
            name="organizationOrProjectName"
            type="text"
            maxLength={160}
            placeholder="نام مجموعه یا طرح"
          />
        </label>
      </div>

      <div className={styles.formRow}>
        <label className={styles.field}>
          <span>شماره تماس</span>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={24}
            placeholder="شماره تماس"
            required
          />
        </label>

        <label className={styles.field}>
          <span>ایمیل</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            placeholder="ایمیل"
          />
        </label>
      </div>

      <label className={styles.field}>
        <span>نوع درخواست</span>
        <select name="requestType" defaultValue="" required>
          <option value="" disabled>
            انتخاب کنید
          </option>
          {requestTypes.map((item) => (
            <option value={item.value} key={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>توضیحات</span>
        <textarea
          name="message"
          rows={5}
          minLength={10}
          maxLength={3000}
          placeholder="توضیح کوتاهی درباره درخواست خود بنویسید"
          required
        />
      </label>

      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className={styles.formSuccess} role="status">
          درخواست شما ثبت شد و برای بررسی در اختیار مرکز قرار گرفت.
        </p>
      ) : null}

      <button className={styles.submitButton} type="submit" disabled={busy}>
        {busy ? "در حال ارسال…" : "ارسال درخواست"}
      </button>
    </form>
  );
}
