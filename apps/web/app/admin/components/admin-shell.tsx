"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { adminApi } from "../../../lib/admin-api";
import styles from "../admin.module.css";

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: "SUPER_ADMIN" | "FINANCE" | "PROJECT_MANAGER" | "CONTENT_MANAGER";
}

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const roleLabels: Record<AdminUser["role"], string> = {
  SUPER_ADMIN: "مدیر کل",
  FINANCE: "مالی",
  PROJECT_MANAGER: "مدیر طرح",
  CONTENT_MANAGER: "محتوا",
};

const navItems = [
  { href: "/admin", label: "داشبورد" },
  { href: "/admin/projects", label: "طرح‌ها" },
  { href: "/admin/contributions", label: "مشارکت‌ها", future: true },
  { href: "/admin/transparency", label: "گزارش و شفافیت", future: true },
  { href: "/admin/requests", label: "درخواست‌ها", future: true },
  { href: "/admin/content", label: "محتوای سایت", future: true },
  { href: "/admin/settings", label: "تنظیمات", future: true },
] as const;

export function AdminShell({ title, subtitle, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    adminApi<{ user: AdminUser }>("/admin/auth/me")
      .then((result) => {
        if (!alive) return;
        setUser(result.user);
        setReady(true);
      })
      .catch(() => {
        if (!alive) return;
        router.replace("/admin/login");
      });

    return () => {
      alive = false;
    };
  }, [router]);

  async function logout() {
    try {
      await adminApi<void>("/admin/auth/logout", { method: "POST" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  if (!ready || !user) {
    return <div className={styles.loading}>در حال بررسی دسترسی…</div>;
  }

  return (
    <div className={styles.adminApp}>
      <main className={styles.mainArea}>
        <header className={styles.topbar}>
          <button className={styles.userButton} type="button" onClick={logout} title="خروج">
            <span className={styles.avatar}>{user.fullName.slice(0, 1)}</span>
            <span className={styles.userMeta}>
              <strong>{user.fullName}</strong>
              <small>{roleLabels[user.role]} · خروج</small>
            </span>
          </button>
          <div className={styles.topbarTitle}>
            <strong>{title}</strong>
            <small>{subtitle}</small>
          </div>
        </header>
        <div className={styles.content}>{children}</div>
      </main>

      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandText}>
            <strong>مرکز نیکوکاری آینه</strong>
            <span>پنل مدیریت · V1</span>
          </div>
          <div className={styles.brandMark}>آ</div>
        </div>
        <div className={styles.divider} />
        <nav className={styles.nav}>
          {navItems.map((item) => {
            const active =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

            if ("future" in item && item.future) {
              return (
                <span className={styles.navItemDisabled} key={item.href} aria-disabled="true">
                  <span>{item.label}</span>
                  <i />
                </span>
              );
            }

            return (
              <Link
                className={active ? styles.navItemActive : styles.navItem}
                href={item.href}
                key={item.href}
              >
                <span>{item.label}</span>
                <i />
                {active ? <b /> : null}
              </Link>
            );
          })}
        </nav>
        <div className={styles.systemStatus}>
          <span><i /> بررسی دستی پرداخت‌ها</span>
          <small>نسخه ۰.۱</small>
        </div>
      </aside>
    </div>
  );
}
