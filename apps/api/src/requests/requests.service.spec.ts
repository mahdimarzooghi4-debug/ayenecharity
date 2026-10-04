import assert from "node:assert/strict";
import test from "node:test";
import {
  AdminRole,
  CooperationRequestStatus,
} from "@prisma/client";
import { BadRequestException } from "@nestjs/common";

import type { AuthenticatedAdmin } from "../auth/auth.types";
import type { PrismaService } from "../database/prisma.service";
import { RequestsService } from "./requests.service";

const contentManager: AuthenticatedAdmin = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "content@example.invalid",
  fullName: "Content Manager",
  role: AdminRole.CONTENT_MANAGER,
};

test("public submit always creates NEW request and returns no internal note", async () => {
  let createData: Record<string, unknown> | undefined;

  const prisma = {
    cooperationRequest: {
      async create(args: {
        data: Record<string, unknown>;
        select: Record<string, boolean>;
      }) {
        createData = args.data;
        return {
          id: "22222222-2222-4222-8222-222222222222",
          status: CooperationRequestStatus.NEW,
          createdAt: new Date("2026-10-04T00:00:00.000Z"),
        };
      },
    },
  } as unknown as PrismaService;

  const service = new RequestsService(prisma);
  const result = await service.submit({
    fullName: "درخواست‌دهنده",
    organizationOrProjectName: "مجموعه",
    phone: "09123456789",
    email: "person@example.invalid",
    requestType: "VOLUNTEER",
    message: "این متن یک درخواست معتبر برای همکاری است.",
  });

  assert.equal(createData?.status, CooperationRequestStatus.NEW);
  assert.equal(result.status, CooperationRequestStatus.NEW);
  assert.deepEqual(Object.keys(result).sort(), [
    "id",
    "status",
    "submittedAt",
  ]);
});

test("status change is audited without exposing internal note", async () => {
  let updateData: Record<string, unknown> | undefined;
  let auditData: Record<string, unknown> | undefined;

  const current = {
    id: "22222222-2222-4222-8222-222222222222",
    fullName: "درخواست‌دهنده",
    organizationOrProjectName: null,
    phone: "09123456789",
    email: null,
    requestType: "VOLUNTEER",
    message: "متن درخواست همکاری",
    status: CooperationRequestStatus.NEW,
    internalNote: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tx = {
    cooperationRequest: {
      async update(args: {
        data: Record<string, unknown>;
      }) {
        updateData = args.data;
        return {
          ...current,
          ...args.data,
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
    cooperationRequest: {
      async findUnique() {
        return current;
      },
    },
    async $transaction(callback: (value: typeof tx) => Promise<unknown>) {
      return callback(tx);
    },
  } as unknown as PrismaService;

  const service = new RequestsService(prisma);
  const result = await service.update(
    current.id,
    {
      status: CooperationRequestStatus.IN_REVIEW,
      internalNote: "یادداشت فقط برای پنل",
    },
    contentManager,
    { ipAddress: "127.0.0.1", userAgent: "test" },
  );

  assert.equal(
    updateData?.status,
    CooperationRequestStatus.IN_REVIEW,
  );
  assert.equal(updateData?.internalNote, "یادداشت فقط برای پنل");
  assert.equal(
    auditData?.action,
    "COOPERATION_REQUEST_STATUS_CHANGED",
  );
  assert.deepEqual(auditData?.previousValue, {
    status: CooperationRequestStatus.NEW,
  });
  assert.deepEqual(auditData?.newValue, {
    status: CooperationRequestStatus.IN_REVIEW,
  });
  assert.equal(result.status, CooperationRequestStatus.IN_REVIEW);
});

test("workflow does not allow skipping directly from NEW to RESPONDED", async () => {
  const prisma = {
    cooperationRequest: {
      async findUnique() {
        return {
          id: "22222222-2222-4222-8222-222222222222",
          fullName: "درخواست‌دهنده",
          organizationOrProjectName: null,
          phone: "09123456789",
          email: null,
          requestType: "VOLUNTEER",
          message: "متن درخواست همکاری",
          status: CooperationRequestStatus.NEW,
          internalNote: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
    },
  } as unknown as PrismaService;

  const service = new RequestsService(prisma);

  await assert.rejects(
    () =>
      service.update(
        "22222222-2222-4222-8222-222222222222",
        { status: CooperationRequestStatus.RESPONDED },
        contentManager,
      ),
    BadRequestException,
  );
});

test("list supports status/type/date/search filters and pagination", async () => {
  let capturedWhere: unknown;

  const prisma = {
    async $transaction(queries: Array<Promise<unknown>>) {
      return Promise.all(queries);
    },
    cooperationRequest: {
      async count(args: { where?: unknown }) {
        if (args.where && Object.keys(args.where as object).length === 1) {
          return 2;
        }
        capturedWhere = args.where;
        return 1;
      },
      async findMany(args: {
        where?: unknown;
        select?: unknown;
      }) {
        if (args.select) {
          return [
            { requestType: "VOLUNTEER" },
            { requestType: "PROJECT_PROPOSAL" },
          ];
        }
        return [];
      },
    },
  } as unknown as PrismaService;

  const service = new RequestsService(prisma);
  const result = await service.list(
    {
      page: 1,
      pageSize: 25,
      search: "آینه",
      status: CooperationRequestStatus.NEW,
      requestType: "VOLUNTEER",
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-05T23:59:59.999Z",
    },
    contentManager,
  );

  assert.ok(capturedWhere);
  assert.equal(result.page, 1);
  assert.deepEqual(result.requestTypes, [
    "VOLUNTEER",
    "PROJECT_PROPOSAL",
  ]);
  assert.equal(result.capabilities.updateStatus, true);
  assert.equal(result.capabilities.addInternalNote, true);
});
