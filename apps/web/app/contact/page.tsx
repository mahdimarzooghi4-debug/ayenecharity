import type { Metadata } from "next";

import { PublicShell } from "../components/public-shell";
import {
  loadSiteSettings,
  publicSetting,
  safeExternalUrl,
} from "../../lib/public-api";
import { ContactForm } from "./contact-form";
import { staticPageMetadata } from "../../lib/seo";
import styles from "./contact.module.css";

export const revalidate = 60;

export const metadata: Metadata = staticPageMetadata({
  title: "تماس و همکاری | مرکز نیکوکاری آینه",
  description:
    "ارسال درخواست همکاری و راه‌های ارتباط با مرکز نیکوکاری آینه.",
  path: "/contact",
});

export default async function ContactPage() {
  const settings = await loadSiteSettings();

  const address = publicSetting(settings, "center.address");
  const phone = publicSetting(settings, "center.phone");
  const email = publicSetting(settings, "center.email");

  const socialLinks = [
    {
      label: "اینستاگرام",
      display: "اینستاگرام",
      href: safeExternalUrl(publicSetting(settings, "social.instagram")),
      icon: "/brand/instagram.svg",
    },
    {
      label: "بله",
      display: "بله",
      href: safeExternalUrl(publicSetting(settings, "social.bale")),
      icon: "/brand/bale.png",
    },
    {
      label: "تلگرام",
      display: "تلگرام",
      href: safeExternalUrl(publicSetting(settings, "social.telegram")),
      icon: "/brand/telegram.png",
    },
  ];

  return (
    <PublicShell settings={settings} contactActive>
      <main id="main-content">
        <section className={styles.hero}>
          <span className={styles.eyebrow}>تماس و همکاری</span>
          <h1>برای همکاری با آینه</h1>
          <p>
            اگر برای بخش نیکوکاری یک طرح به زیرساخت، مجوز یا همکاری اجرایی نیاز
            دارید، با مرکز در ارتباط باشید.
          </p>
        </section>

        <section className={styles.cooperationSection}>
          <aside className={styles.contactCard}>
            <h2>راه‌های ارتباط با مرکز</h2>

            <div className={styles.contactInfo}>
              <span>آدرس</span>
              {address ? <p>{address}</p> : <p>آدرس عمومی ثبت نشده است.</p>}
              {phone ? (
                <a href={"tel:" + phone} dir="ltr">
                  {phone}
                </a>
              ) : null}
              {email ? (
                <a href={"mailto:" + email} dir="ltr">
                  ایمیل: {email}
                </a>
              ) : null}
            </div>

            <div className={styles.socialList}>
              {socialLinks.map((social) =>
                social.href ? (
                  <a
                    className={styles.socialRow}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    key={social.label}
                    aria-label={social.label}
                  >
                    <span>{social.display}</span>
                    <i>
                      <img
                        src={social.icon}
                        alt=""
                        width={16}
                        height={16}
                      />
                    </i>
                  </a>
                ) : null,
              )}

              {!socialLinks.some((social) => Boolean(social.href)) ? (
                <p className={styles.socialEmpty}>
                  لینک شبکه‌های اجتماعی ثبت نشده است.
                </p>
              ) : null}
            </div>
          </aside>

          <div className={styles.formColumn}>
            <ContactForm />
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
