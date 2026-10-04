import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { AdminRole } from "@prisma/client";

import type { AuthenticatedAdmin } from "../auth/auth.types";
import type { PrismaService } from "../database/prisma.service";
import { SettingsService } from "./settings.service";

const actor: AuthenticatedAdmin = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "admin@ayene.invalid",
  fullName: "Admin",
  role: AdminRole.SUPER_ADMIN,
};

test("admin settings use approved brand defaults without fake contact data", async () => {
  const prisma = {
    setting: {
      async findMany() {
        return [];
      },
    },
  } as unknown as PrismaService;

  const service = new SettingsService(prisma);
  const result = await service.getAdminSettings();

  assert.equal(result.center.name, "مرکز نیکوکاری آینه");
  assert.equal(result.center.parentOrganization, "خانه خلاق آینه");
  assert.equal(result.center.address, "");
  assert.equal(result.center.phone, "");
  assert.equal(result.center.email, "");
  assert.equal(result.contribution.cardNumber, "");
  assert.equal(result.social.instagram, "");
});

test("contribution settings normalize card digits and audit one canonical source", async () => {
  const upserts: Array<Record<string, unknown>> = [];
  let auditData: Record<string, unknown> | undefined;

  const tx = {
    setting: {
      async upsert(args: { create: Record<string, unknown> }) {
        upserts.push(args.create);
        return args.create;
      },
    },
    auditLog: {
      async create(args: { data: Record<string, unknown> }) {
        auditData = args.data;
        return {};
      },
    },
  };

  let reads = 0;
  const prisma = {
    setting: {
      async findMany() {
        reads += 1;
        if (reads === 1) return [];
        return [
          {
            key: "contribution.cardNumber",
            value: "6037997512345678",
          },
          {
            key: "contribution.accountHolderName",
            value: "نام صاحب حساب",
          },
        ];
      },
    },
    async $transaction(callback: (value: typeof tx) => Promise<unknown>) {
      return callback(tx);
    },
  } as unknown as PrismaService;

  const service = new SettingsService(prisma);
  const result = await service.updateContribution(
    {
      cardNumber: "۶۰۳۷-۹۹۷۵-۱۲۳۴-۵۶۷۸",
      accountHolderName: "نام صاحب حساب",
    },
    actor,
  );

  assert.equal(
    upserts.find((item) => item.key === "contribution.cardNumber")?.value,
    "6037997512345678",
  );
  assert.equal(result.contribution.cardNumber, "6037997512345678");
  assert.equal(auditData?.action, "SETTINGS_UPDATED");
  assert.equal(auditData?.entityId, "contribution");
});

test("placeholder social URLs are rejected", async () => {
  const prisma = {} as PrismaService;
  const service = new SettingsService(prisma);

  await assert.rejects(
    () =>
      service.updateSocial(
        {
          instagram: "https://example.test/ayene",
          bale: "",
          telegram: "",
        },
        actor,
      ),
    BadRequestException,
  );
});
