import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import type {
  AuthenticatedAdmin,
  RequestContext,
} from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";
import {
  SETTING_KEYS,
  SETTINGS,
  settingsDefaults,
  type SettingName,
} from "./settings.constants";
import type {
  UpdateCenterSettingsDto,
  UpdateContributionSettingsDto,
  UpdateSocialSettingsDto,
} from "./settings.dto";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminSettings() {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: [...SETTING_KEYS] } },
      select: { key: true, value: true },
    });

    const values = this.resolveValues(rows);

    return {
      center: {
        name: values.centerName,
        parentOrganization: values.parentOrganization,
        address: values.centerAddress,
        phone: values.centerPhone,
        email: values.centerEmail,
      },
      contribution: {
        cardNumber: values.cardNumber,
        accountHolderName: values.accountHolderName,
      },
      social: {
        instagram: values.instagram,
        bale: values.bale,
        telegram: values.telegram,
      },
    };
  }

  async updateCenter(
    dto: UpdateCenterSettingsDto,
    actor: AuthenticatedAdmin,
    context: RequestContext = {},
  ) {
    return this.updateSection(
      "center",
      {
        centerName: dto.name,
        parentOrganization: dto.parentOrganization,
        centerAddress: dto.address,
        centerPhone: dto.phone,
        centerEmail: dto.email.toLowerCase(),
      },
      actor,
      context,
    );
  }

  async updateContribution(
    dto: UpdateContributionSettingsDto,
    actor: AuthenticatedAdmin,
    context: RequestContext = {},
  ) {
    const cardNumber = this.normalizeCardNumber(dto.cardNumber);

    if (cardNumber && !/^\d{16}$/.test(cardNumber)) {
      throw new BadRequestException({
        code: "INVALID_CARD_NUMBER",
        message: "Card number must contain exactly 16 digits.",
      });
    }

    if (Boolean(cardNumber) !== Boolean(dto.accountHolderName.trim())) {
      throw new BadRequestException({
        code: "INCOMPLETE_CONTRIBUTION_SETTINGS",
        message: "Card number and account holder name must be provided together.",
      });
    }

    return this.updateSection(
      "contribution",
      {
        cardNumber,
        accountHolderName: dto.accountHolderName,
      },
      actor,
      context,
    );
  }

  async updateSocial(
    dto: UpdateSocialSettingsDto,
    actor: AuthenticatedAdmin,
    context: RequestContext = {},
  ) {
    const instagram = this.validatePublicUrl(dto.instagram);
    const bale = this.validatePublicUrl(dto.bale);
    const telegram = this.validatePublicUrl(dto.telegram);

    return this.updateSection(
      "social",
      { instagram, bale, telegram },
      actor,
      context,
    );
  }

  private async updateSection(
    section: "center" | "contribution" | "social",
    values: Partial<Record<SettingName, string>>,
    actor: AuthenticatedAdmin,
    context: RequestContext,
  ) {
    const definitions = Object.entries(SETTINGS).filter(
      ([name, definition]) =>
        definition.section === section && values[name as SettingName] !== undefined,
    );

    const keys = definitions.map(([, definition]) => definition.key);
    const currentRows = await this.prisma.setting.findMany({
      where: { key: { in: keys } },
      select: { key: true, value: true },
    });
    const currentMap = new Map(
      currentRows.map((row) => [row.key, this.stringValue(row.value)]),
    );

    await this.prisma.$transaction(async (tx) => {
      for (const [name, definition] of definitions) {
        const value = values[name as SettingName] ?? "";

        await tx.setting.upsert({
          where: { key: definition.key },
          create: {
            key: definition.key,
            value,
            isPublic: definition.public,
            updatedById: actor.id,
          },
          update: {
            value,
            isPublic: definition.public,
            updatedById: actor.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "SETTINGS_UPDATED",
          entityType: "Setting",
          entityId: section,
          previousValue: Object.fromEntries(
            definitions.map(([, definition]) => [
              definition.key,
              currentMap.get(definition.key) ?? definition.defaultValue,
            ]),
          ),
          newValue: Object.fromEntries(
            definitions.map(([name, definition]) => [
              definition.key,
              values[name as SettingName] ?? "",
            ]),
          ),
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
    });

    return this.getAdminSettings();
  }

  private resolveValues(
    rows: Array<{ key: string; value: Prisma.JsonValue }>,
  ): Record<SettingName, string> {
    const defaults = settingsDefaults();
    const byKey = new Map(
      rows.map((row) => [row.key, this.stringValue(row.value)]),
    );

    return Object.fromEntries(
      Object.entries(SETTINGS).map(([name, definition]) => [
        name,
        byKey.get(definition.key) ?? defaults[name as SettingName],
      ]),
    ) as Record<SettingName, string>;
  }

  private normalizeCardNumber(value: string): string {
    const persian = "۰۱۲۳۴۵۶۷۸۹";
    const arabic = "٠١٢٣٤٥٦٧٨٩";

    return value
      .trim()
      .split("")
      .map((char) => {
        const pi = persian.indexOf(char);
        if (pi >= 0) return String(pi);

        const ai = arabic.indexOf(char);
        if (ai >= 0) return String(ai);

        return char;
      })
      .join("")
      .replace(/[^0-9]/g, "");
  }

  private validatePublicUrl(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return "";

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new BadRequestException({
        code: "INVALID_SOCIAL_URL",
        message: "Social links must be valid HTTP or HTTPS URLs.",
      });
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new BadRequestException({
        code: "INVALID_SOCIAL_URL",
        message: "Social links must use HTTP or HTTPS.",
      });
    }

    const host = parsed.hostname.toLowerCase();
    const reserved =
      host === "localhost" ||
      host.endsWith(".test") ||
      host.endsWith(".example") ||
      host.endsWith(".invalid") ||
      host === "example.com" ||
      host.endsWith(".example.com");

    if (reserved) {
      throw new BadRequestException({
        code: "PLACEHOLDER_SOCIAL_URL",
        message: "Placeholder social URLs are not allowed.",
      });
    }

    return parsed.toString();
  }

  private stringValue(value: Prisma.JsonValue | undefined): string | null {
    return typeof value === "string" ? value : null;
  }
}
