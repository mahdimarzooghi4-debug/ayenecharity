import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import {
  AdminRole,
  AdminUserStatus,
} from "@prisma/client";

import type { AuthenticatedAdmin } from "../auth/auth.types";
import type { PrismaService } from "../database/prisma.service";
import { UsersService } from "./users.service";

const actor: AuthenticatedAdmin = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "owner@ayene.invalid",
  fullName: "Owner",
  role: AdminRole.SUPER_ADMIN,
};

test("create user never returns or audits password hash", async () => {
  let createdData: Record<string, unknown> | undefined;
  let auditData: Record<string, unknown> | undefined;

  const tx = {
    adminUser: {
      async create(args: {
        data: Record<string, unknown>;
        select: Record<string, boolean>;
      }) {
        createdData = args.data;
        return {
          id: "22222222-2222-4222-8222-222222222222",
          email: "new@ayene.invalid",
          fullName: "New Admin",
          role: AdminRole.CONTENT_MANAGER,
          status: AdminUserStatus.ACTIVE,
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
    },
    auditLog: {
      async create(args: { data: Record<string, unknown> }) {
        auditData = args.data;
        return {};
      },
    },
  };

  const prisma = {
    async $transaction(callback: (value: typeof tx) => Promise<unknown>) {
      return callback(tx);
    },
  } as unknown as PrismaService;

  const service = new UsersService(prisma);
  const result = await service.create(
    {
      fullName: "New Admin",
      email: "new@ayene.invalid",
      role: AdminRole.CONTENT_MANAGER,
      status: AdminUserStatus.ACTIVE,
      initialPassword: "LongSecurePassword#123",
    },
    actor,
  );

  assert.notEqual(
    createdData?.passwordHash,
    "LongSecurePassword#123",
  );
  assert.ok(
    typeof createdData?.passwordHash === "string" &&
      String(createdData.passwordHash).length > 20,
  );
  assert.equal("passwordHash" in result, false);
  assert.equal(
    JSON.stringify(auditData).includes("password"),
    false,
  );
});

test("disabling an admin revokes active sessions and audits status", async () => {
  let sessionUpdate: Record<string, unknown> | undefined;
  let auditData: Record<string, unknown> | undefined;

  const current = {
    id: "22222222-2222-4222-8222-222222222222",
    email: "finance@ayene.invalid",
    passwordHash: "hash",
    fullName: "Finance",
    role: AdminRole.FINANCE,
    status: AdminUserStatus.ACTIVE,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tx = {
    adminUser: {
      async update() {
        return {
          id: current.id,
          email: current.email,
          fullName: current.fullName,
          role: current.role,
          status: AdminUserStatus.DISABLED,
          lastLoginAt: null,
          createdAt: current.createdAt,
          updatedAt: new Date(),
        };
      },
    },
    adminSession: {
      async updateMany(args: Record<string, unknown>) {
        sessionUpdate = args;
        return { count: 2 };
      },
    },
    auditLog: {
      async create(args: { data: Record<string, unknown> }) {
        auditData = args.data;
        return {};
      },
    },
  };

  const prisma = {
    adminUser: {
      async findUnique() {
        return current;
      },
    },
    async $transaction(callback: (value: typeof tx) => Promise<unknown>) {
      return callback(tx);
    },
  } as unknown as PrismaService;

  const service = new UsersService(prisma);
  const result = await service.updateStatus(
    current.id,
    { status: AdminUserStatus.DISABLED },
    actor,
  );

  assert.equal(result.status, AdminUserStatus.DISABLED);
  assert.ok(sessionUpdate);
  assert.equal(auditData?.action, "ADMIN_USER_DISABLED");
});

test("the last active super admin cannot be disabled", async () => {
  const current = {
    id: "22222222-2222-4222-8222-222222222222",
    email: "other-owner@ayene.invalid",
    passwordHash: "hash",
    fullName: "Other Owner",
    role: AdminRole.SUPER_ADMIN,
    status: AdminUserStatus.ACTIVE,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const prisma = {
    adminUser: {
      async findUnique() {
        return current;
      },
      async count() {
        return 0;
      },
    },
  } as unknown as PrismaService;

  const service = new UsersService(prisma);

  await assert.rejects(
    () =>
      service.updateStatus(
        current.id,
        { status: AdminUserStatus.DISABLED },
        actor,
      ),
    BadRequestException,
  );
});

test("role changes revoke active sessions", async () => {
  let revoked = false;

  const current = {
    id: "22222222-2222-4222-8222-222222222222",
    email: "project@ayene.invalid",
    passwordHash: "hash",
    fullName: "Project",
    role: AdminRole.PROJECT_MANAGER,
    status: AdminUserStatus.ACTIVE,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tx = {
    adminUser: {
      async update() {
        return {
          id: current.id,
          email: current.email,
          fullName: current.fullName,
          role: AdminRole.CONTENT_MANAGER,
          status: current.status,
          lastLoginAt: null,
          createdAt: current.createdAt,
          updatedAt: new Date(),
        };
      },
    },
    adminSession: {
      async updateMany() {
        revoked = true;
        return { count: 1 };
      },
    },
    auditLog: {
      async create() {
        return {};
      },
    },
  };

  const prisma = {
    adminUser: {
      async findUnique() {
        return current;
      },
    },
    async $transaction(callback: (value: typeof tx) => Promise<unknown>) {
      return callback(tx);
    },
  } as unknown as PrismaService;

  const service = new UsersService(prisma);
  await service.update(
    current.id,
    { role: AdminRole.CONTENT_MANAGER },
    actor,
  );

  assert.equal(revoked, true);
});
