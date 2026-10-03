import type { AdminRole } from "@prisma/client";

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
}

export interface AdminHttpRequest {
  headers: {
    cookie?: string;
    "user-agent"?: string;
    [key: string]: string | string[] | undefined;
  };
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
  adminUser?: AuthenticatedAdmin;
}

export interface CookieResponse {
  cookie(
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: "lax";
      path: string;
      maxAge: number;
    },
  ): void;
  clearCookie(
    name: string,
    options: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: "lax";
      path: string;
    },
  ): void;
}

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}
