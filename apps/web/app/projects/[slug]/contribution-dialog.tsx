"use client";

import { useId, useRef, useState, type FormEvent } from "react";

import styles from "../projects.module.css";

type Step = "card" | "receipt" | "success";

interface ContributionDialogButtonProps {
  projectId: string;
  projectTitle: string;
  cardNumber: string | null;
  cardHolder: string | null;
  variant: "primary" | "secondary";
}

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function apiErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const message = (payload as { message?: unknown }).message;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (Array.isArray(message)) {
    const first = message.find((item): item is string => typeof item === "string");
    return first ?? null;
  }

  return null;
}

export function ContributionDialogButton({
  projectId,
  projectTitle,
  cardNumber,
  cardHolder,
  variant,
}: ContributionDialogButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [step, setStep] = useState<Step>("card");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasCard = Boolean(cardNumber);
  const triggerClass =
    variant === "primary" ? styles.detailPrimaryAction : styles.participationButton;

  function openDialog() {
    setStep("card");
    setCopyStatus(null);
    setSubmitError(null);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (submitting) return;
    dialogRef.current?.close();
  }

  async function copyCardNumber() {
    if (!cardNumber) return;

    try {
      await navigator.clipboard.writeText(cardNumber);
      setCopyStatus("شماره کارت کپی شد.");
    } catch {
      setCopyStatus("کپی خودکار ممکن نشد؛ شماره کارت را دستی کپی کنید.");
    }
  }

  async function submitReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const receipt = formData.get("receipt");

    if (!(receipt instanceof File) || receipt.size <= 0) {
      setSubmitError("فایل رسید را انتخاب کنید.");
      return;
    }

    if (!ALLOWED_RECEIPT_TYPES.has(receipt.type)) {
      setSubmitError("فرمت رسید باید JPG، PNG، WebP یا PDF باشد.");
      return;
    }

    if (receipt.size > MAX_RECEIPT_BYTES) {
      setSubmitError("حجم فایل رسید نباید بیشتر از ۵ مگابایت باشد.");
      return;
    }

    formData.set("projectId", projectId);
    setSubmitting(true);

    try {
      const response = await fetch("/api/contributions", {
        method: "POST",
        body: formData,
        headers: {
          accept: "application/json",
        },
      });

      let payload: unknown = null;
      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        payload = await response.json();
      }

      if (!response.ok) {
        if (response.status === 429) {
          setSubmitError("تعداد تلاش‌ها زیاد بوده است. لطفاً کمی بعد دوباره تلاش کنید.");
          return;
        }

        setSubmitError(
          apiErrorMessage(payload) ??
            "ثبت رسید انجام نشد. اطلاعات را بررسی کنید و دوباره تلاش کنید.",
        );
        return;
      }

      form.reset();
      setStep("success");
    } catch {
      setSubmitError("ارتباط با سامانه برقرار نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button className={triggerClass} type="button" onClick={openDialog}>
        مشارکت در طرح
      </button>

      <dialog
        ref={dialogRef}
        className={styles.contributionDialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        onCancel={(event) => {
          if (submitting) event.preventDefault();
        }}
      >
        <div className={styles.contributionPanel} dir="rtl">
          <header className={styles.contributionHeader}>
            <button
              className={styles.contributionClose}
              type="button"
              onClick={closeDialog}
              aria-label="بستن"
              disabled={submitting}
            >
              <span aria-hidden="true">×</span>
            </button>
            <h2 id={titleId}>مشارکت در طرح {projectTitle}</h2>
          </header>

          {step === "card" ? (
            <>
              <p className={styles.contributionGuide}>
                پس از واریز، در صورت نیاز می‌توانید رسید خود را برای مرکز ارسال کنید.
              </p>

              <div className={styles.cardBox}>
                <span>شماره کارت</span>
                {cardNumber ? (
                  <strong dir="ltr">{cardNumber}</strong>
                ) : (
                  <strong>اطلاعات کارت هنوز منتشر نشده است.</strong>
                )}
                {cardHolder ? <small>نام صاحب حساب: {cardHolder}</small> : null}
              </div>

              {copyStatus ? (
                <p className={styles.contributionFeedback} role="status">
                  {copyStatus}
                </p>
              ) : null}

              <div className={styles.contributionActions}>
                <button
                  className={styles.contributionSecondary}
                  type="button"
                  onClick={copyCardNumber}
                  disabled={!cardNumber}
                >
                  کپی شماره کارت
                </button>
                <button
                  className={styles.contributionPrimary}
                  type="button"
                  onClick={() => setStep("receipt")}
                  disabled={!hasCard}
                >
                  ارسال رسید
                </button>
              </div>
            </>
          ) : null}

          {step === "receipt" ? (
            <form className={styles.receiptForm} onSubmit={submitReceipt}>
              <p className={styles.contributionGuide}>
                اطلاعات واریز و تصویر یا فایل رسید را ثبت کنید. رسید پس از بررسی مرکز
                تعیین وضعیت می‌شود.
              </p>

              <label className={styles.formField}>
                <span>نام و نام خانوادگی</span>
                <input
                  name="contributorName"
                  type="text"
                  autoComplete="name"
                  minLength={2}
                  maxLength={120}
                  required
                />
              </label>

              <label className={styles.formField}>
                <span>شماره موبایل</span>
                <input
                  name="contributorPhone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="09xxxxxxxxx"
                  required
                />
              </label>

              <label className={styles.formField}>
                <span>مبلغ واریزی (ریال)</span>
                <input
                  name="amountRial"
                  type="text"
                  inputMode="numeric"
                  placeholder="مثلاً ۱٬۰۰۰٬۰۰۰"
                  required
                />
              </label>

              <label className={styles.formField}>
                <span>فایل رسید</span>
                <input
                  name="receipt"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  required
                />
                <small>JPG، PNG، WebP یا PDF تا ۵ مگابایت</small>
              </label>

              <label className={styles.formField}>
                <span>توضیحات (اختیاری)</span>
                <textarea name="contributorNote" rows={3} maxLength={1000} />
              </label>

              {submitError ? (
                <p className={styles.contributionError} role="alert">
                  {submitError}
                </p>
              ) : null}

              <div className={styles.contributionActions}>
                <button
                  className={styles.contributionSecondary}
                  type="button"
                  onClick={() => setStep("card")}
                  disabled={submitting}
                >
                  بازگشت
                </button>
                <button
                  className={styles.contributionPrimary}
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "در حال ثبت..." : "ثبت رسید"}
                </button>
              </div>
            </form>
          ) : null}

          {step === "success" ? (
            <div className={styles.contributionSuccess}>
              <strong>رسید شما ثبت شد.</strong>
              <p>
                رسید در انتظار بررسی مرکز است. ثبت رسید به معنی تأیید بانکی پرداخت
                نیست.
              </p>
              <button
                className={styles.contributionPrimary}
                type="button"
                onClick={closeDialog}
              >
                بستن
              </button>
            </div>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
