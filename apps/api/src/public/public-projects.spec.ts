import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";
import {
  MediaPurpose,
  MediaVisibility,
  ProjectStatus,
  PublishStatus,
  TransparencyDocumentType,
} from "@prisma/client";

import type { PrismaService } from "../database/prisma.service";
import type { ObjectStorageService } from "../media/object-storage.service";
import { PublicService } from "./public.service";

function makeService(projectDelegate: Record<string, unknown>) {
  const prisma = {
    project: projectDelegate,
  } as unknown as PrismaService;

  const storage = {
    publicUrl(key: string) {
      return "https://cdn.example/" + key;
    },
  } as unknown as ObjectStorageService;

  return new PublicService(prisma, storage);
}

test("public projects are queried as active + visible and ordered by displayOrder", async () => {
  let captured: Record<string, unknown> | undefined;

  const service = makeService({
    async findMany(args: Record<string, unknown>) {
      captured = args;
      return [
        {
          id: "project-1",
          slug: "mah",
          title: "ماه",
          shortDescription: "توضیح کوتاه",
          mainImage: {
            storageKey: "projects/mah.jpg",
            visibility: MediaVisibility.PUBLIC,
            purpose: MediaPurpose.PROJECT_IMAGE,
          },
        },
      ];
    },
  });

  const result = await service.listProjects();

  assert.deepEqual(captured?.where, {
    status: ProjectStatus.ACTIVE,
    visibility: true,
  });
  assert.deepEqual(captured?.orderBy, [
    { displayOrder: "asc" },
    { publishedAt: "desc" },
  ]);
  assert.deepEqual(result.items, [
    {
      id: "project-1",
      slug: "mah",
      title: "ماه",
      shortDescription: "توضیح کوتاه",
      imageUrl: "https://cdn.example/projects/mah.jpg",
    },
  ]);
});

test("project detail requires a public project and only queries published related documents", async () => {
  let captured: Record<string, any> | undefined;

  const service = makeService({
    async findFirst(args: Record<string, any>) {
      captured = args;
      return {
        id: "project-1",
        slug: "mah",
        title: "ماه",
        shortDescription: "توضیح کوتاه",
        description: "توضیح کامل",
        publishedAt: new Date("2026-09-01T00:00:00.000Z"),
        mainImage: {
          storageKey: "projects/mah.jpg",
          visibility: MediaVisibility.PUBLIC,
          purpose: MediaPurpose.PROJECT_IMAGE,
        },
        transparencyDocuments: [
          {
            id: "doc-1",
            title: "گزارش فعالیت",
            type: TransparencyDocumentType.PERFORMANCE_REPORT,
            description: null,
            documentDate: new Date("2026-09-02T00:00:00.000Z"),
            publishedAt: new Date("2026-09-03T00:00:00.000Z"),
            file: {
              storageKey: "reports/activity.pdf",
              visibility: MediaVisibility.PUBLIC,
              purpose: MediaPurpose.TRANSPARENCY_DOCUMENT,
            },
          },
          {
            id: "doc-2",
            title: "گزارش بدون فایل عمومی",
            type: TransparencyDocumentType.FINANCIAL_DOCUMENT,
            description: null,
            documentDate: null,
            publishedAt: new Date("2026-09-04T00:00:00.000Z"),
            file: {
              storageKey: "reports/private.pdf",
              visibility: MediaVisibility.PRIVATE,
              purpose: MediaPurpose.TRANSPARENCY_DOCUMENT,
            },
          },
        ],
      };
    },
  });

  const result = await service.getProjectBySlug("mah");

  assert.deepEqual(captured?.where, {
    slug: "mah",
    status: ProjectStatus.ACTIVE,
    visibility: true,
  });
  assert.deepEqual(captured?.select.transparencyDocuments.where, {
    publishStatus: PublishStatus.PUBLISHED,
  });
  assert.equal(result.imageUrl, "https://cdn.example/projects/mah.jpg");
  assert.equal(result.reports[0]?.fileUrl, "https://cdn.example/reports/activity.pdf");
  assert.equal(result.reports[1]?.fileUrl, null);
});

test("invalid, hidden, draft, inactive or archived public slugs resolve as standard not found", async () => {
  const service = makeService({
    async findFirst() {
      return null;
    },
  });

  await assert.rejects(
    () => service.getProjectBySlug("missing"),
    (error: unknown) => {
      if (!(error instanceof NotFoundException)) return false;
      assert.deepEqual(error.getResponse(), {
        code: "PROJECT_NOT_FOUND",
        message: "Project was not found.",
      });
      return true;
    },
  );
});
