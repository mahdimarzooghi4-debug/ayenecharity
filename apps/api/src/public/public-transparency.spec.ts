import assert from "node:assert/strict";
import test from "node:test";
import {
  MediaPurpose,
  MediaVisibility,
  PublishStatus,
  TransparencyDocumentType,
} from "@prisma/client";

import type { PrismaService } from "../database/prisma.service";
import type { ObjectStorageService } from "../media/object-storage.service";
import { PublicService } from "./public.service";

test("public transparency queries only published documents and groups real data", async () => {
  let capturedWhere: unknown;

  const prisma = {
    transparencyDocument: {
      async findMany(args: { where: unknown }) {
        capturedWhere = args.where;
        return [
          {
            id: "doc-1",
            title: "گزارش واقعی",
            type: TransparencyDocumentType.PERFORMANCE_REPORT,
            description: "توضیح گزارش",
            documentDate: new Date("2026-09-01T00:00:00.000Z"),
            publishedAt: new Date("2026-09-02T00:00:00.000Z"),
            project: {
              id: "project-1",
              slug: "mah",
              title: "ماه",
            },
            file: {
              storageKey: "reports/report.pdf",
              visibility: MediaVisibility.PUBLIC,
              purpose: MediaPurpose.TRANSPARENCY_DOCUMENT,
            },
          },
        ];
      },
    },
  } as unknown as PrismaService;

  const storage = {
    publicUrl(key: string) {
      return "https://cdn.example/" + key;
    },
  } as ObjectStorageService;

  const service = new PublicService(prisma, storage);
  const result = await service.listTransparency();

  assert.deepEqual(capturedWhere, {
    publishStatus: PublishStatus.PUBLISHED,
  });
  assert.equal(result.categories[0]?.documents.length, 1);
  assert.equal(
    result.categories[0]?.documents[0]?.fileUrl,
    "https://cdn.example/reports/report.pdf",
  );
  assert.equal(result.categories[1]?.documents.length, 0);
  assert.equal(result.categories[2]?.documents.length, 0);
});
