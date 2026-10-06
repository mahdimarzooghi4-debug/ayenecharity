import assert from "node:assert/strict";
import test from "node:test";
import {
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import {
  AdminRole,
  ContributionStatus,
} from "@prisma/client";

import type { AuthenticatedAdmin } from "../auth/auth.types";
import type { PrismaService } from "../database/prisma.service";
import type { MediaService } from "../media/media.service";
import { AdminContributionsService } from "./admin-contributions.service";

const finance: AuthenticatedAdmin = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "finance",
  email: "finance@example.invalid",
  fullName: "Finance Reviewer",
  role: AdminRole.FINANCE,
};

function baseContribution() {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    contributorName: "مشارکت‌کننده",
    contributorPhone: "09123456789",
    contributorEmail: null,
    declaredAmountRial: 1_500_000n,
    contributorNote: "یادداشت",
    status: ContributionStatus.PENDING,
    rejectionReason: null,
    reviewedAt: null,
    version: 1,
    createdAt: new Date("2026-10-04T00:00:00.000Z"),
    updatedAt: new Date("2026-10-04T00:00:00.000Z"),
    project: {
      id: "33333333-3333-4333-8333-333333333333",
      title: "طرح آزمون",
    },
    receipt: {
      originalName: "receipt.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1024n,
    },
    reviewedBy: null,
  };
}

test("admin list maps bigint safely and reports review capability", async () => {
  const contribution = baseContribution();
  const prisma = {
    $transaction: async (queries: Array<Promise<unknown>>) =>
      Promise.all(queries),
    contribution: {
      async count(args: { where?: { status?: ContributionStatus } }) {
        return args.where?.status === ContributionStatus.PENDING ? 1 : 1;
      },
      async findMany() {
        return [contribution];
      },
    },
    project: {
      async findMany() {
        return [contribution.project];
      },
    },
  } as unknown as PrismaService;

  const service = new AdminContributionsService(
    prisma,
    {} as MediaService,
  );

  const result = await service.list(
    {
      page: 1,
      pageSize: 25,
      sort: "createdAt",
      order: "desc",
    },
    finance,
  );

  assert.equal(result.items[0]?.declaredAmountRial, "1500000");
  assert.equal(result.items[0]?.receipt.sizeBytes, "1024");
  assert.equal(result.capabilities.review, true);
  assert.equal(result.pendingCount, 1);
});

test("approval uses version guard, reviewer fields and an audit event", async () => {
  const contribution = baseContribution();
  let updateWhere: unknown;
  let updateData: Record<string, unknown> | undefined;
  let auditData: Record<string, unknown> | undefined;

  const tx = {
    contribution: {
      async updateMany(args: {
        where: unknown;
        data: Record<string, unknown>;
      }) {
        updateWhere = args.where;
        updateData = args.data;
        return { count: 1 };
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
    contribution: {
      async findUnique(args: { include?: unknown }) {
        if (args.include) {
          return {
            ...contribution,
            status: ContributionStatus.APPROVED,
            reviewedAt: new Date("2026-10-04T01:00:00.000Z"),
            reviewedBy: {
              id: finance.id,
              fullName: finance.fullName,
            },
            version: 2,
          };
        }
        return {
          id: contribution.id,
          status: ContributionStatus.PENDING,
          version: 1,
        };
      },
    },
    async $transaction(callback: (value: typeof tx) => Promise<void>) {
      return callback(tx);
    },
  } as unknown as PrismaService;

  const service = new AdminContributionsService(
    prisma,
    {} as MediaService,
  );

  const result = await service.review(
    contribution.id,
    { decision: "APPROVE", version: 1 },
    finance,
    { ipAddress: "127.0.0.1", userAgent: "test" },
  );

  assert.deepEqual(updateWhere, {
    id: contribution.id,
    status: ContributionStatus.PENDING,
    version: 1,
  });
  assert.equal(updateData?.status, ContributionStatus.APPROVED);
  assert.equal(updateData?.reviewedById, finance.id);
  assert.deepEqual(updateData?.version, { increment: 1 });
  assert.equal(auditData?.action, "CONTRIBUTION_APPROVED");
  assert.equal(auditData?.entityId, contribution.id);
  assert.equal(result.status, ContributionStatus.APPROVED);
  assert.equal(result.version, 2);
});

test("reject requires a reason", async () => {
  const prisma = {
    contribution: {
      async findUnique() {
        return {
          id: "22222222-2222-4222-8222-222222222222",
          status: ContributionStatus.PENDING,
          version: 1,
        };
      },
    },
  } as unknown as PrismaService;

  const service = new AdminContributionsService(
    prisma,
    {} as MediaService,
  );

  await assert.rejects(
    () =>
      service.review(
        "22222222-2222-4222-8222-222222222222",
        { decision: "REJECT", version: 1 },
        finance,
      ),
    BadRequestException,
  );
});

test("stale version returns conflict before update", async () => {
  const prisma = {
    contribution: {
      async findUnique() {
        return {
          id: "22222222-2222-4222-8222-222222222222",
          status: ContributionStatus.PENDING,
          version: 2,
        };
      },
    },
  } as unknown as PrismaService;

  const service = new AdminContributionsService(
    prisma,
    {} as MediaService,
  );

  await assert.rejects(
    () =>
      service.review(
        "22222222-2222-4222-8222-222222222222",
        { decision: "APPROVE", version: 1 },
        finance,
      ),
    ConflictException,
  );
});
