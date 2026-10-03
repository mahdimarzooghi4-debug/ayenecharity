import Link from "next/link";
import type { ReactNode } from "react";

import {
  publicSetting,
  safeExternalUrl,
  type PublicSettings,
} from "../../lib/public-api";
import styles from "../home.module.css";

export function PublicShell({
  settings,
  children,
}: {
  settings: PublicSettings;
  children: ReactNode;
}) {
  const address = publicSetting(settings, "center.address");
  const phone = publicSetting(settings, "center.phone");
  const email = publicSetting(settings, "center.email");

  const socialLinks = [
    {
      label: "اینستاگرام",
      href: safeExternalUrl(publicSetting(settings, "social.instagram")),
      icon: "/brand/instagram.svg",
    },
    {
      label: "بله",
      href: safeExternalUrl(publicSetting(settings, "social.bale")),
      icon: "/brand/bale.png",
    },
    {
      label: "تلگرام",
      href: safeExternalUrl(publicSetting(settings, "social.telegram")),
      icon: "/brand/telegram.png",
    },
  ];

  const hasSocialLinks = socialLinks.some((item) => Boolean(item.href));

  return (
    <div className={styles.page}>
      <header className={styles.siteHeader}>
        <div className={styles.headerTop}>
          <Link className={styles.brand} href="/" aria-label="مرکز نیکوکاری آینه">
            <img src="/brand/logo.png" alt="" width={64} height={64} />
            <strong>مرکز نیکوکاری آینه</strong>
          </Link>

          <Link
            className={`${styles.primaryButton} ${styles.headerContact}`}
            href="/contact"
          >
            ارتباط با ما
          </Link>
        </div>

        <nav className={styles.nav} aria-label="ناوبری اصلی">
          <Link href="/services">خدمات</Link>
          <Link href="/projects">طرح‌ها</Link>
          <Link href="/transparency">گزارش‌ها</Link>
          <Link href="/about">درباره ما</Link>
        </nav>
      </header>

      {children}

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <img src="/brand/logo.png" alt="" width={62} height={62} />
          <div className={styles.footerBrandText}>
            <strong>مرکز نیکوکاری آینه</strong>
            <span>خانه خلاق آینه</span>
          </div>
        </div>

        <div className={styles.footerInfo}>
          <section className={styles.footerBlock} aria-labelledby="contact-title">
            <h3 id="contact-title">اطلاعات تماس</h3>
            {address || phone || email ? (
              <div className={styles.contactDetails}>
                {address ? <p>{address}</p> : null}
                {phone ? (
                  <a href={"tel:" + phone} dir="ltr">
                    {phone}
                  </a>
                ) : null}
                {email ? (
                  <a href={"mailto:" + email} dir="ltr">
                    {email}
                  </a>
                ) : null}
              </div>
            ) : (
              <p className={styles.contactEmpty}>اطلاعات تماس ثبت نشده است.</p>
            )}
          </section>

          <section className={styles.footerBlock} aria-labelledby="social-title">
            <h3 id="social-title">شبکه‌های اجتماعی</h3>
            {hasSocialLinks ? (
              <div className={styles.socials}>
                {socialLinks.map((social) =>
                  social.href ? (
                    <a
                      className={styles.socialLink}
                      href={social.href}
                      key={social.label}
                      aria-label={social.label}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img src={social.icon} alt="" width={16} height={16} />
                    </a>
                  ) : null,
                )}
              </div>
            ) : (
              <p className={styles.socialEmpty}>لینک شبکه‌های اجتماعی ثبت نشده است.</p>
            )}
          </section>
        </div>
      </footer>
    </div>
  );
}
