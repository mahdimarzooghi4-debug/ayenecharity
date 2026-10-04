import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";
import {
  ContributionStatus,
  MediaPurpose,
  MediaVisibility,
  ProjectStatus,
} from "@prisma/client";

import type { PrismaService } from "../database/prisma.service";
import type { MediaService } from "../media/media.service";
import type { UploadedMemoryFile } from "../media/media.types";
import { ContributionsService } from "./contributions.service";

const receiptFile: UploadedMemoryFile = {
  originalname: "receipt.jpg",
  mimetype: "image/jpeg",
  size: 4,
  buffer: Buffer.from("test"),
};

test("new contribution is stored as pending with rial bigint and a private receipt reference", async () => {
  let projectWhere: unknown;
  let createData: Record<string, unknown> | undefined;
  let storedReceiptProjectId: string | undefined;

  const prisma = {
    project: {
      async findFirst(args: { where: unknown }) {
        projectWhere = args.where;
        return { id: "11111111-1111-4111-8111-111111111111" };
      },
    },
    contribution: {
      async create(args: { data: Record<string, unknown> }) {
        createData = args.data;
        return {
          id: "22222222-2222-4222-8222-222222222222",
          status: ContributionStatus.PENDING,
          createdAt: new Date("2026-10-04T00:00:00.000Z"),
        };
      },
    },
  } as unknown as PrismaService;

  const media = {
    async storeReceipt(params: { projectId: string }) {
      storedReceiptProjectId = params.projectId;
      return {
        id: "33333333-3333-4333-8333-333333333333",
        originalName: "receipt.jpg",
        mimeType: "image/jpeg",
        sizeBytes: "4",
        purpose: MediaPurpose.RECEIPT,
        visibility: MediaVisibility.PRIVATE,
        publicUrl: null,
      };
    },
  } as unknown as MediaService;

  const service = new ContributionsService(prisma, media);
  const result = await service.submit(
    {
      projectId: "11111111-1111-4111-8111-111111111111",
      contributorName: "علی رضایی",
      contributorPhone: "09123456789",
      amountRial: "1250000",
    },
    receiptFile,
  );

  assert.deepEqual(projectWhere, {
    id: "11111111-1111-4111-8111-111111111111",
    status: ProjectStatus.ACTIVE,
    visibility: true,
  });
  assert.equal(storedReceiptProjectId, "11111111-1111-4111-8111-111111111111");
  assert.equal(createData?.declaredAmountRial, 1_250_000n);
  assert.equal(createData?.status, ContributionStatus.PENDING);
  assert.equal(createData?.receiptAssetId, "33333333-3333-4333-8333-333333333333");
  assert.deepEqual(result, {
    id: "22222222-2222-4222-8222-222222222222",
    status: ContributionStatus.PENDING,
    submittedAt: new Date("2026-10-04T00:00:00.000Z"),
  });
  assert.equal("storageKey" in result, false);
});

test("hidden or inactive projects cannot receive public contributions", async () => {
  const prisma = {
    project: {
      async findFirst() {
        return null;
      },
    },
  } as unknown as PrismaService;

  const media = {} as MediaService;
  const service = new ContributionsService(prisma, media);

  await assert.rejects(
    () =>
      service.submit(
        {
          projectId: "11111111-1111-4111-8111-111111111111",
          contributorName: "علی رضایی",
          contributorPhone: "09123456789",
          amountRial: "1000",
        },
        receiptFile,
      ),
    NotFoundException,
  );
});

test("failed contribution creation removes the just-uploaded receipt asset", async () => {
  let discardedId: string | undefined;

  const prisma = {
    project: {
      async findFirst() {
        return { id: "11111111-1111-4111-8111-111111111111" };
      },
    },
    contribution: {
      async create() {
        throw new Error("database failed");
      },
    },
  } as unknown as PrismaService;

  const media = {
    async storeReceipt() {
      return {
        id: "33333333-3333-4333-8333-333333333333",
        originalName: "receipt.jpg",
        mimeType: "image/jpeg",
        sizeBytes: "4",
        purpose: MediaPurpose.RECEIPT,
        visibility: MediaVisibility.PRIVATE,
        publicUrl: null,
      };
    },
    async discardUnreferencedReceipt(id: string) {
      discardedId = id;
    },
  } as unknown as MediaService;

  const service = new ContributionsService(prisma, media);

  await assert.rejects(() =>
    service.submit(
      {
        projectId: "11111111-1111-4111-8111-111111111111",
        contributorName: "علی رضایی",
        contributorPhone: "09123456789",
        amountRial: "1000",
      },
      receiptFile,
    ),
  );

  assert.equal(discardedId, "33333333-3333-4333-8333-333333333333");
});
