"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { adminApi } from "../../../lib/admin-api";
import styles from "../admin.module.css";

interface AdminUser {
  id: string;
  username: string;
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

interface NavItem {
  href: string;
  label: string;
  icon: string;
  future?: boolean;
  roles?: readonly AdminUser["role"][];
}

const navItems: readonly NavItem[] = [
  { href: "/admin", label: "داشبورد", icon: "/brand/activity.svg" },
  {
    href: "/admin/projects",
    label: "طرح‌ها",
    icon: "/brand/workflow.svg",
    roles: ["SUPER_ADMIN", "PROJECT_MANAGER", "CONTENT_MANAGER"],
  },
  {
    href: "/admin/contributions",
    label: "مشارکت‌ها",
    icon: "/brand/wallet.svg",
    roles: ["SUPER_ADMIN", "FINANCE", "PROJECT_MANAGER"],
  },
  {
    href: "/admin/transparency",
    label: "گزارش و شفافیت",
    icon: "/brand/file-check.svg",
    roles: ["SUPER_ADMIN", "FINANCE", "PROJECT_MANAGER", "CONTENT_MANAGER"],
  },
  {
    href: "/admin/requests",
    label: "درخواست‌ها",
    icon: "/brand/users.svg",
    roles: ["SUPER_ADMIN", "PROJECT_MANAGER", "CONTENT_MANAGER"],
  },
  {
    href: "/admin/content",
    label: "محتوای سایت",
    icon: "/brand/file-text.svg",
    roles: ["SUPER_ADMIN", "CONTENT_MANAGER"],
  },
  {
    href: "/admin/settings",
    label: "تنظیمات",
    icon: "/brand/shield.svg",
    roles: ["SUPER_ADMIN"],
  },
];

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
              <small>{roleLabels[user.role]} · @{user.username} · خروج</small>
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
            <span>پنل مدیریت</span>
          </div>
          <div className={styles.brandMark}>
            <img src="/brand/logo.png" alt="" width={28} height={28} />
          </div>
        </div>
        <div className={styles.divider} />
        <nav className={styles.nav}>
          {navItems.map((item) => {
            const active =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

            const unavailable =
              item.future ||
              (item.roles ? !item.roles.includes(user.role) : false);

            if (unavailable) {
              return (
                <span className={styles.navItemDisabled} key={item.href} aria-disabled="true">
                  <span>{item.label}</span>
                  <img className={styles.navIcon} src={item.icon} alt="" width={18} height={18} />
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
                <img className={styles.navIcon} src={item.icon} alt="" width={18} height={18} />
                {active ? <b /> : null}
              </Link>
            );
          })}
        </nav>
        <div className={styles.systemStatus}>
          <span><i /> سامانه عملیاتی است</span>
          <small>پرداخت‌ها با بررسی انسانی تأیید می‌شوند</small>
        </div>
      </aside>
    </div>
  );
}
