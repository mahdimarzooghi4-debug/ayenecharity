import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import {
  AdminRole,
  MediaPurpose,
  MediaVisibility,
} from "@prisma/client";

import type { AuthenticatedAdmin } from "../auth/auth.types";
import type { PrismaService } from "../database/prisma.service";
import type { ObjectStorageService } from "../media/object-storage.service";
import { ContentService } from "./content.service";

const actor: AuthenticatedAdmin = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "content@example.invalid",
  fullName: "Content Manager",
  role: AdminRole.CONTENT_MANAGER,
};

const storage = {
  publicUrl(key: string) {
    return "https://cdn.example.invalid/" + key;
  },
} as unknown as ObjectStorageService;

test("does not allow more than four active hero slides", async () => {
  const prisma = {
    mediaAsset: {
      async findUnique() {
        return {
          purpose: MediaPurpose.HERO_IMAGE,
          visibility: MediaVisibility.PUBLIC,
        };
      },
    },
    heroSlide: {
      async count() {
        return 4;
      },
    },
  } as unknown as PrismaService;

  const service = new ContentService(prisma, storage);

  await assert.rejects(
    () =>
      service.createHeroSlide(
        {
          imageAssetId: "22222222-2222-4222-8222-222222222222",
          title: "اسلاید",
          description: "توضیح معتبر برای اسلاید",
          active: true,
        },
        actor,
      ),
    BadRequestException,
  );
});

test("content block update is audited with previous and new value", async () => {
  let auditData: Record<string, unknown> | undefined;

  const current = {
    id: "33333333-3333-4333-8333-333333333333",
    key: "home.hero.title",
    value: "عنوان قبلی",
    updatedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const updated = {
    ...current,
    value: "عنوان تازه",
    updatedById: actor.id,
  };

  const tx = {
    siteContent: {
      async upsert() {
        return updated;
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
    siteContent: {
      async findUnique() {
        return current;
      },
    },
    async $transaction(callback: (value: typeof tx) => Promise<unknown>) {
      return callback(tx);
    },
  } as unknown as PrismaService;

  const service = new ContentService(prisma, storage);
  const result = await service.updateContentBlock(
    "home.hero.title",
    { value: "عنوان تازه" },
    actor,
  );

  assert.equal(result.value, "عنوان تازه");
  assert.equal(auditData?.action, "SITE_CONTENT_UPDATED");
  assert.deepEqual(auditData?.previousValue, {
    key: "home.hero.title",
    value: "عنوان قبلی",
  });
  assert.deepEqual(auditData?.newValue, {
    key: "home.hero.title",
    value: "عنوان تازه",
  });
});

test("rejects CMS keys outside the frozen V1 content scope", async () => {
  const prisma = {} as PrismaService;
  const service = new ContentService(prisma, storage);

  await assert.rejects(
    () =>
      service.updateContentBlock(
        "footer.address",
        { value: "نباید در CMS ذخیره شود" },
        actor,
      ),
    BadRequestException,
  );
});

test("reorder requires every current hero slide exactly once and audits order", async () => {
  const ids = [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
  ];
  const updates: Array<{ id: string; displayOrder: number }> = [];
  let auditData: Record<string, unknown> | undefined;

  const tx = {
    heroSlide: {
      async update(args: {
        where: { id: string };
        data: { displayOrder: number };
      }) {
        updates.push({
          id: args.where.id,
          displayOrder: args.data.displayOrder,
        });
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

  const prisma = {
    heroSlide: {
      async findMany(args?: { include?: unknown }) {
        if (args?.include) {
          return ids.map((id, index) => ({
            id,
            imageAssetId: "33333333-3333-4333-8333-333333333333",
            title: "اسلاید",
            description: "توضیح",
            ctaLabel: null,
            ctaTarget: null,
            displayOrder: index + 1,
            active: false,
            updatedById: actor.id,
            createdAt: new Date(),
            updatedAt: new Date(),
            imageAsset: {
              id: "33333333-3333-4333-8333-333333333333",
              originalName: "hero.webp",
              storageKey: "hero/hero.webp",
              visibility: MediaVisibility.PUBLIC,
              purpose: MediaPurpose.HERO_IMAGE,
            },
          }));
        }

        return ids.map((id, index) => ({
          id,
          displayOrder: index + 1,
        }));
      },
    },
    siteContent: {
      async findMany() {
        return [];
      },
    },
    async $transaction(callback: (value: typeof tx) => Promise<unknown>) {
      return callback(tx);
    },
  } as unknown as PrismaService;

  const service = new ContentService(prisma, storage);
  await service.reorderHeroSlides(
    { ids: [ids[1]!, ids[0]!] },
    actor,
  );

  assert.deepEqual(updates, [
    { id: ids[1], displayOrder: 1 },
    { id: ids[0], displayOrder: 2 },
  ]);
  assert.equal(auditData?.action, "HERO_SLIDES_REORDERED");
});
