import assert from "node:assert/strict";
import test from "node:test";
import {
  AdminRole,
  MediaPurpose,
  MediaVisibility,
  PublishStatus,
  TransparencyDocumentType,
} from "@prisma/client";
import { BadRequestException, ConflictException } from "@nestjs/common";

import type { AuthenticatedAdmin } from "../auth/auth.types";
import type { PrismaService } from "../database/prisma.service";
import type { ObjectStorageService } from "../media/object-storage.service";
import { TransparencyService } from "./transparency.service";

const actor: AuthenticatedAdmin = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "content@example.invalid",
  fullName: "Content Manager",
  role: AdminRole.CONTENT_MANAGER,
};

const documentId = "22222222-2222-4222-8222-222222222222";
const fileId = "33333333-3333-4333-8333-333333333333";

function storage(): ObjectStorageService {
  return {
    publicUrl(key: string) {
      return "https://cdn.example/" + key;
    },
  } as ObjectStorageService;
}

test("publishing requires file and document date", async () => {
  const prisma = {
    transparencyDocument: {
      async findUnique() {
        return {
          id: documentId,
          title: "گزارش",
          type: TransparencyDocumentType.PERFORMANCE_REPORT,
          description: null,
          projectId: null,
          fileAssetId: null,
          documentDate: null,
          publishStatus: PublishStatus.DRAFT,
          createdById: actor.id,
          updatedById: actor.id,
          publishedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
    },
  } as unknown as PrismaService;

  const service = new TransparencyService(prisma, storage());

  await assert.rejects(
    () => service.publish(documentId, actor),
    (error: unknown) => {
      if (!(error instanceof BadRequestException)) return false;
      const response = error.getResponse() as {
        code?: string;
        fieldErrors?: Record<string, string[]>;
      };
      assert.equal(response.code, "TRANSPARENCY_DOCUMENT_NOT_PUBLISHABLE");
      assert.ok(response.fieldErrors?.fileAssetId);
      assert.ok(response.fieldErrors?.documentDate);
      return true;
    },
  );
});

test("publish makes the file public and audits the state transition", async () => {
  let mediaVisibility: MediaVisibility | undefined;
  let auditData: Record<string, unknown> | undefined;
  let documentUpdate: Record<string, unknown> | undefined;

  const current = {
    id: documentId,
    title: "گزارش عملکرد",
    type: TransparencyDocumentType.PERFORMANCE_REPORT,
    description: "توضیح",
    projectId: null,
    fileAssetId: fileId,
    documentDate: new Date("2026-10-01T00:00:00.000Z"),
    publishStatus: PublishStatus.DRAFT,
    createdById: actor.id,
    updatedById: actor.id,
    publishedAt: null,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z"),
  };

  const tx = {
    mediaAsset: {
      async update(args: { data: { visibility: MediaVisibility } }) {
        mediaVisibility = args.data.visibility;
        return {};
      },
    },
    transparencyDocument: {
      async update(args: { data: Record<string, unknown> }) {
        documentUpdate = args.data;
        return {};
      },
    },
    auditLog: {
      async create(args: { data: Record<string, unknown> }) {
        auditData = args.data;
        return {};
      },
    },
  };

  let findCount = 0;
  const prisma = {
    transparencyDocument: {
      async findUnique(args: { include?: unknown }) {
        findCount += 1;
        if (args.include) {
          return {
            ...current,
            publishStatus: PublishStatus.PUBLISHED,
            publishedAt: new Date("2026-10-04T00:00:00.000Z"),
            project: null,
            file: {
              id: fileId,
              originalName: "report.pdf",
              mimeType: "application/pdf",
              sizeBytes: 1024n,
              visibility: MediaVisibility.PUBLIC,
              storageKey: "transparency/report.pdf",
            },
            createdBy: {
              id: actor.id,
              fullName: actor.fullName,
            },
            updatedBy: {
              id: actor.id,
              fullName: actor.fullName,
            },
          };
        }

        return current;
      },
    },
    mediaAsset: {
      async findUnique() {
        return {
          purpose: MediaPurpose.TRANSPARENCY_DOCUMENT,
          documentFor: [{ id: documentId }],
        };
      },
    },
    async $transaction(callback: (value: typeof tx) => Promise<void>) {
      return callback(tx);
    },
  } as unknown as PrismaService;

  const service = new TransparencyService(prisma, storage());
  const result = await service.publish(
    documentId,
    actor,
    { ipAddress: "127.0.0.1", userAgent: "test" },
  );

  assert.ok(findCount >= 2);
  assert.equal(mediaVisibility, MediaVisibility.PUBLIC);
  assert.equal(documentUpdate?.publishStatus, PublishStatus.PUBLISHED);
  assert.equal(auditData?.action, "TRANSPARENCY_DOCUMENT_PUBLISHED");
  assert.deepEqual(auditData?.previousValue, {
    publishStatus: PublishStatus.DRAFT,
  });
  assert.deepEqual(auditData?.newValue, {
    publishStatus: PublishStatus.PUBLISHED,
  });
  assert.equal(result.file?.publicUrl, "https://cdn.example/transparency/report.pdf");
});

test("unpublish makes the file private and clears publishedAt", async () => {
  let mediaVisibility: MediaVisibility | undefined;
  let documentUpdate: Record<string, unknown> | undefined;

  const current = {
    id: documentId,
    title: "مجوز",
    type: TransparencyDocumentType.LICENSE,
    description: null,
    projectId: null,
    fileAssetId: fileId,
    documentDate: new Date("2026-10-01T00:00:00.000Z"),
    publishStatus: PublishStatus.PUBLISHED,
    createdById: actor.id,
    updatedById: actor.id,
    publishedAt: new Date("2026-10-02T00:00:00.000Z"),
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-02T00:00:00.000Z"),
  };

  const tx = {
    mediaAsset: {
      async update(args: { data: { visibility: MediaVisibility } }) {
        mediaVisibility = args.data.visibility;
        return {};
      },
    },
    transparencyDocument: {
      async update(args: { data: Record<string, unknown> }) {
        documentUpdate = args.data;
        return {};
      },
    },
    auditLog: {
      async create() {
        return {};
      },
    },
  };

  const prisma = {
    transparencyDocument: {
      async findUnique(args: { include?: unknown }) {
        if (args.include) {
          return {
            ...current,
            publishStatus: PublishStatus.DRAFT,
            publishedAt: null,
            project: null,
            file: {
              id: fileId,
              originalName: "license.pdf",
              mimeType: "application/pdf",
              sizeBytes: 1024n,
              visibility: MediaVisibility.PRIVATE,
              storageKey: "transparency/license.pdf",
            },
            createdBy: {
              id: actor.id,
              fullName: actor.fullName,
            },
            updatedBy: {
              id: actor.id,
              fullName: actor.fullName,
            },
          };
        }

        return current;
      },
    },
    async $transaction(callback: (value: typeof tx) => Promise<void>) {
      return callback(tx);
    },
  } as unknown as PrismaService;

  const service = new TransparencyService(prisma, storage());
  const result = await service.unpublish(documentId, actor);

  assert.equal(mediaVisibility, MediaVisibility.PRIVATE);
  assert.equal(documentUpdate?.publishStatus, PublishStatus.DRAFT);
  assert.equal(documentUpdate?.publishedAt, null);
  assert.equal(result.publishStatus, PublishStatus.DRAFT);
  assert.equal(result.file?.publicUrl, null);
});

test("published documents cannot be hard-deleted", async () => {
  const prisma = {
    transparencyDocument: {
      async findUnique() {
        return {
          id: documentId,
          title: "سند مالی",
          type: TransparencyDocumentType.FINANCIAL_DOCUMENT,
          description: null,
          projectId: null,
          fileAssetId: fileId,
          documentDate: new Date(),
          publishStatus: PublishStatus.PUBLISHED,
          createdById: actor.id,
          updatedById: actor.id,
          publishedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
    },
  } as unknown as PrismaService;

  const service = new TransparencyService(prisma, storage());

  await assert.rejects(
    () => service.remove(documentId, actor),
    ConflictException,
  );
});
