import Link from "next/link";
import type { ReactNode } from "react";

import {
  publicSetting,
  safeExternalUrl,
  type PublicSettings,
} from "../../lib/public-api";
import styles from "../home.module.css";

type ActiveNav = "services" | "projects" | "transparency" | "about";

const navItems: Array<{ href: string; label: string; key: ActiveNav }> = [
  { href: "/services", label: "خدمات", key: "services" },
  { href: "/projects", label: "طرح‌ها", key: "projects" },
  { href: "/transparency", label: "گزارش‌ها", key: "transparency" },
  { href: "/about", label: "درباره ما", key: "about" },
];

export function PublicShell({
  settings,
  children,
  activeNav,
  contactActive = false,
}: {
  settings: PublicSettings;
  children: ReactNode;
  activeNav?: ActiveNav;
  contactActive?: boolean;
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

  const renderNav = (className: string | undefined) => (
    <nav className={className} aria-label="ناوبری اصلی">
      {navItems.map((item) => (
        <Link
          href={item.href}
          key={item.key}
          className={activeNav === item.key ? styles.navActive : undefined}
          aria-current={activeNav === item.key ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className={styles.page}>
      <header className={styles.siteHeader}>
        <div className={styles.headerTop}>
          <Link className={styles.brand} href="/" aria-label="مرکز نیکوکاری آینه">
            <img src="/brand/logo.png" alt="" width={56} height={56} />
            <strong>مرکز نیکوکاری آینه</strong>
          </Link>

          <Link
            className={`${contactActive ? styles.secondaryButton : styles.primaryButton} ${styles.headerContact}`}
            href="/contact"
          >
            ارتباط با ما
          </Link>
        </div>

        {renderNav(styles.nav)}

        <details className={styles.mobileMenu}>
          <summary className={styles.mobileMenuButton} aria-label="باز کردن منو">
            <img src="/brand/menu.svg" alt="" width={20} height={20} />
          </summary>
          {renderNav(styles.mobileMenuPanel)}
          <Link className={styles.mobileMenuContact} href="/contact">
            ارتباط با ما
          </Link>
        </details>
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
