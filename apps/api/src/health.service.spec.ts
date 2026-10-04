import assert from "node:assert/strict";
import test from "node:test";
import { ServiceUnavailableException } from "@nestjs/common";

import type { PrismaService } from "./database/prisma.service";
import { HealthService } from "./health.service";
import type { ObjectStorageService } from "./media/object-storage.service";

test("readiness checks both database and object storage", async () => {
  let databaseChecked = false;
  let storageChecked = false;

  const prisma = {
    async $queryRaw() {
      databaseChecked = true;
      return [{ "?column?": 1 }];
    },
  } as unknown as PrismaService;

  const storage = {
    async healthCheck() {
      storageChecked = true;
      return { status: "ok" as const };
    },
  } as unknown as ObjectStorageService;

  const service = new HealthService(prisma, storage);
  const result = await service.ready();

  assert.equal(databaseChecked, true);
  assert.equal(storageChecked, true);
  assert.deepEqual(result, {
    status: "ok",
    dependencies: {
      database: { status: "ok" },
      objectStorage: { status: "ok" },
    },
  });
});

test("readiness returns 503 when a key dependency is unavailable", async () => {
  const prisma = {
    async $queryRaw() {
      return [{ "?column?": 1 }];
    },
  } as unknown as PrismaService;

  const storage = {
    async healthCheck() {
      return { status: "unavailable" as const };
    },
  } as unknown as ObjectStorageService;

  const service = new HealthService(prisma, storage);

  await assert.rejects(
    () => service.ready(),
    ServiceUnavailableException,
  );
});
