import { AdminRole } from "@prisma/client";

export enum Permission {
  PROJECTS_VIEW = "projects:view",
  PROJECTS_CREATE = "projects:create",
  PROJECTS_UPDATE = "projects:update",
  PROJECTS_STATUS = "projects:status",

  CONTRIBUTIONS_VIEW = "contributions:view",
  CONTRIBUTIONS_REVIEW = "contributions:review",
  CONTRIBUTIONS_APPROVE = "contributions:approve",
  CONTRIBUTIONS_REJECT = "contributions:reject",

  TRANSPARENCY_VIEW = "transparency:view",
  TRANSPARENCY_CREATE = "transparency:create",
  TRANSPARENCY_UPDATE = "transparency:update",
  TRANSPARENCY_PUBLISH = "transparency:publish",
  TRANSPARENCY_DELETE = "transparency:delete",

  REQUESTS_VIEW = "requests:view",
  REQUESTS_UPDATE_STATUS = "requests:update-status",
  REQUESTS_ADD_INTERNAL_NOTE = "requests:add-internal-note",

  CONTENT_VIEW = "content:view",
  CONTENT_UPDATE = "content:update",

  SETTINGS_VIEW = "settings:view",
  SETTINGS_UPDATE = "settings:update",

  USERS_VIEW = "users:view",
  USERS_CREATE = "users:create",
  USERS_UPDATE = "users:update",
  USERS_DEACTIVATE = "users:deactivate",
}

const ALL_PERMISSIONS = Object.values(Permission);

export const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  [AdminRole.SUPER_ADMIN]: ALL_PERMISSIONS,
  [AdminRole.FINANCE]: [
    Permission.CONTRIBUTIONS_VIEW,
    Permission.CONTRIBUTIONS_REVIEW,
    Permission.CONTRIBUTIONS_APPROVE,
    Permission.CONTRIBUTIONS_REJECT,
    Permission.TRANSPARENCY_VIEW,
    Permission.TRANSPARENCY_CREATE,
    Permission.TRANSPARENCY_UPDATE,
    Permission.TRANSPARENCY_PUBLISH,
  ],
  [AdminRole.PROJECT_MANAGER]: [
    Permission.PROJECTS_VIEW,
    Permission.PROJECTS_CREATE,
    Permission.PROJECTS_UPDATE,
    Permission.PROJECTS_STATUS,
    Permission.CONTRIBUTIONS_VIEW,
    Permission.TRANSPARENCY_VIEW,
    Permission.REQUESTS_VIEW,
  ],
  [AdminRole.CONTENT_MANAGER]: [
    Permission.PROJECTS_VIEW,
    Permission.TRANSPARENCY_VIEW,
    Permission.TRANSPARENCY_CREATE,
    Permission.TRANSPARENCY_UPDATE,
    Permission.TRANSPARENCY_PUBLISH,
    Permission.TRANSPARENCY_DELETE,
    Permission.REQUESTS_VIEW,
    Permission.REQUESTS_UPDATE_STATUS,
    Permission.REQUESTS_ADD_INTERNAL_NOTE,
    Permission.CONTENT_VIEW,
    Permission.CONTENT_UPDATE,
  ],
};

export function hasPermissions(role: AdminRole, required: readonly Permission[]): boolean {
  const allowed = new Set(ROLE_PERMISSIONS[role]);
  return required.every((permission) => allowed.has(permission));
}
