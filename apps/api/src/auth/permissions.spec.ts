import assert from "node:assert/strict";
import test from "node:test";

import { AdminRole } from "@prisma/client";

import { hasPermissions, Permission, ROLE_PERMISSIONS } from "./permissions";

test("super admin has every declared permission", () => {
  assert.equal(
    ROLE_PERMISSIONS[AdminRole.SUPER_ADMIN].length,
    Object.values(Permission).length,
  );
});

test("finance can review contributions but cannot update settings", () => {
  assert.equal(
    hasPermissions(AdminRole.FINANCE, [
      Permission.CONTRIBUTIONS_VIEW,
      Permission.CONTRIBUTIONS_REVIEW,
      Permission.CONTRIBUTIONS_APPROVE,
    ]),
    true,
  );
  assert.equal(hasPermissions(AdminRole.FINANCE, [Permission.SETTINGS_UPDATE]), false);
});

test("project manager can manage projects but cannot approve contributions", () => {
  assert.equal(
    hasPermissions(AdminRole.PROJECT_MANAGER, [
      Permission.PROJECTS_CREATE,
      Permission.PROJECTS_UPDATE,
      Permission.PROJECTS_STATUS,
    ]),
    true,
  );
  assert.equal(
    hasPermissions(AdminRole.PROJECT_MANAGER, [Permission.CONTRIBUTIONS_APPROVE]),
    false,
  );
});

test("content manager cannot manage users", () => {
  assert.equal(hasPermissions(AdminRole.CONTENT_MANAGER, [Permission.CONTENT_UPDATE]), true);
  assert.equal(hasPermissions(AdminRole.CONTENT_MANAGER, [Permission.USERS_UPDATE]), false);
});
