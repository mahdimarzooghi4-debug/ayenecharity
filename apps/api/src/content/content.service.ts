import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  MediaPurpose,
  MediaVisibility,
  Prisma,
} from "@prisma/client";

import type {
  AuthenticatedAdmin,
  RequestContext,
} from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";
import { hasPermissions, Permission } from "../auth/permissions";
import { ObjectStorageService } from "../media/object-storage.service";
import {
  defaultHomeContent,
  homeContentDefinition,
  HOME_CONTENT,
  HOME_CONTENT_KEYS,
  isHomeContentKey,
  type HomeContentKey,
} from "./content.constants";
import type {
  CreateHeroSlideDto,
  ReorderHeroSlidesDto,
  UpdateContentBlockDto,
  UpdateHeroSlideDto,
} from "./content.dto";

const MAX_ACTIVE_HERO_SLIDES = 4;

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
  ) {}

  async getAdminContent(actor: AuthenticatedAdmin) {
    const [slides, rows] = await Promise.all([
      this.prisma.heroSlide.findMany({
        orderBy: [{ displayOrder: "asc" }, { updatedAt: "desc" }],
        include: {
          imageAsset: {
            select: {
              id: true,
              originalName: true,
              storageKey: true,
              visibility: true,
              purpose: true,
            },
          },
        },
      }),
      this.prisma.siteContent.findMany({
        where: { key: { in: [...HOME_CONTENT_KEYS] } },
      }),
    ]);

    const rowMap = new Map(rows.map((row) => [row.key, row.value]));
    const defaults = defaultHomeContent();

    const blocks = Object.entries(HOME_CONTENT).map(
      ([name, definition]) => ({
        name,
        key: definition.key,
        label: definition.label,
        value: this.stringValue(rowMap.get(definition.key)) ??
          defaults[name as keyof typeof defaults],
        maxLength: definition.maxLength,
      }),
    );

    return {
      heroSlides: slides.map((slide) => this.toHeroSlideResponse(slide)),
      blocks,
      capabilities: {
        update: hasPermissions(actor.role, [Permission.CONTENT_UPDATE]),
      },
      limits: {
        maxActiveHeroSlides: MAX_ACTIVE_HERO_SLIDES,
      },
      footer: {
        source: "settings",
        note: "این اطلاعات از تنظیمات عمومی مرکز دریافت می‌شوند.",
      },
    };
  }

  async createHeroSlide(
    dto: CreateHeroSlideDto,
    actor: AuthenticatedAdmin,
    context: RequestContext = {},
  ) {
    await this.assertHeroImage(dto.imageAssetId);

    if (dto.active) {
      await this.assertActiveLimit();
    }

    const slide = await this.prisma.$transaction(async (tx) => {
      const created = await tx.heroSlide.create({
        data: {
          imageAssetId: dto.imageAssetId,
          title: dto.title.trim(),
          description: dto.description.trim(),
          ctaLabel: this.cleanOptional(dto.ctaLabel),
          ctaTarget: this.cleanOptional(dto.ctaTarget),
          displayOrder: dto.displayOrder ?? 0,
          active: dto.active ?? false,
          updatedById: actor.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "HERO_SLIDE_CREATED",
          entityType: "HeroSlide",
          entityId: created.id,
          newValue: {
            title: created.title,
            active: created.active,
            displayOrder: created.displayOrder,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });

      return created;
    });

    return this.getHeroSlide(slide.id);
  }

  async updateHeroSlide(
    id: string,
    dto: UpdateHeroSlideDto,
    actor: AuthenticatedAdmin,
    context: RequestContext = {},
  ) {
    const current = await this.requireHeroSlide(id);

    if (dto.imageAssetId) {
      await this.assertHeroImage(dto.imageAssetId);
    }

    if (dto.active === true && !current.active) {
      await this.assertActiveLimit();
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.heroSlide.update({
        where: { id },
        data: {
          ...(dto.imageAssetId !== undefined
            ? { imageAssetId: dto.imageAssetId }
            : {}),
          ...(dto.title !== undefined
            ? { title: dto.title.trim() }
            : {}),
          ...(dto.description !== undefined
            ? { description: dto.description.trim() }
            : {}),
          ...(dto.ctaLabel !== undefined
            ? { ctaLabel: this.cleanOptional(dto.ctaLabel ?? undefined) }
            : {}),
          ...(dto.ctaTarget !== undefined
            ? { ctaTarget: this.cleanOptional(dto.ctaTarget ?? undefined) }
            : {}),
          ...(dto.displayOrder !== undefined
            ? { displayOrder: dto.displayOrder }
            : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
          updatedById: actor.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "HERO_SLIDE_UPDATED",
          entityType: "HeroSlide",
          entityId: id,
          previousValue: {
            imageAssetId: current.imageAssetId,
            title: current.title,
            description: current.description,
            ctaLabel: current.ctaLabel,
            ctaTarget: current.ctaTarget,
            displayOrder: current.displayOrder,
            active: current.active,
          },
          newValue: {
            imageAssetId: updated.imageAssetId,
            title: updated.title,
            description: updated.description,
            ctaLabel: updated.ctaLabel,
            ctaTarget: updated.ctaTarget,
            displayOrder: updated.displayOrder,
            active: updated.active,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
    });

    return this.getHeroSlide(id);
  }

  async reorderHeroSlides(
    dto: ReorderHeroSlidesDto,
    actor: AuthenticatedAdmin,
    context: RequestContext = {},
  ) {
    const uniqueIds = [...new Set(dto.ids)];

    if (uniqueIds.length !== dto.ids.length) {
      throw new BadRequestException({
        code: "HERO_REORDER_DUPLICATE_IDS",
        message: "Hero slide order contains duplicate ids.",
      });
    }

    const current = await this.prisma.heroSlide.findMany({
      orderBy: [{ displayOrder: "asc" }, { updatedAt: "desc" }],
      select: { id: true, displayOrder: true },
    });

    const currentIds = new Set(current.map((item) => item.id));

    if (
      uniqueIds.length !== current.length ||
      uniqueIds.some((id) => !currentIds.has(id))
    ) {
      throw new BadRequestException({
        code: "HERO_REORDER_INCOMPLETE",
        message: "Hero slide order must contain every current slide exactly once.",
      });
    }

    await this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < uniqueIds.length; index += 1) {
        await tx.heroSlide.update({
          where: { id: uniqueIds[index]! },
          data: {
            displayOrder: index + 1,
            updatedById: actor.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "HERO_SLIDES_REORDERED",
          entityType: "HeroSlideOrder",
          previousValue: current.map((item) => ({
            id: item.id,
            displayOrder: item.displayOrder,
          })),
          newValue: uniqueIds.map((id, index) => ({
            id,
            displayOrder: index + 1,
          })),
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
    });

    return this.getAdminContent(actor);
  }

  async deleteHeroSlide(
    id: string,
    actor: AuthenticatedAdmin,
    context: RequestContext = {},
  ) {
    const current = await this.requireHeroSlide(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.heroSlide.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "HERO_SLIDE_DELETED",
          entityType: "HeroSlide",
          entityId: id,
          previousValue: {
            imageAssetId: current.imageAssetId,
            title: current.title,
            active: current.active,
            displayOrder: current.displayOrder,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
    });

    return {
      id,
      imageAssetId: current.imageAssetId,
    };
  }

  async updateContentBlock(
    key: string,
    dto: UpdateContentBlockDto,
    actor: AuthenticatedAdmin,
    context: RequestContext = {},
  ) {
    if (!isHomeContentKey(key)) {
      throw new BadRequestException({
        code: "CONTENT_KEY_NOT_EDITABLE",
        message: "This content key is not editable in V1.",
      });
    }

    const definition = homeContentDefinition(key);
    const value = dto.value.trim();

    if (value.length > definition.maxLength) {
      throw new BadRequestException({
        code: "CONTENT_VALUE_TOO_LONG",
        message: "Content value is longer than the V1 limit.",
      });
    }

    const current = await this.prisma.siteContent.findUnique({
      where: { key },
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.siteContent.upsert({
        where: { key },
        create: {
          key,
          value,
          updatedById: actor.id,
        },
        update: {
          value,
          updatedById: actor.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "SITE_CONTENT_UPDATED",
          entityType: "SiteContent",
          entityId: row.id,
          previousValue: {
            key,
            value: this.stringValue(current?.value) ??
              definition.defaultValue,
          },
          newValue: { key, value },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });

      return row;
    });

    return {
      key,
      label: definition.label,
      value: this.stringValue(updated.value) ?? value,
      maxLength: definition.maxLength,
    };
  }

  private async getHeroSlide(id: string) {
    const slide = await this.prisma.heroSlide.findUnique({
      where: { id },
      include: {
        imageAsset: {
          select: {
            id: true,
            originalName: true,
            storageKey: true,
            visibility: true,
            purpose: true,
          },
        },
      },
    });

    if (!slide) {
      throw new NotFoundException({
        code: "HERO_SLIDE_NOT_FOUND",
        message: "Hero slide was not found.",
      });
    }

    return this.toHeroSlideResponse(slide);
  }

  private async requireHeroSlide(id: string) {
    const slide = await this.prisma.heroSlide.findUnique({
      where: { id },
    });

    if (!slide) {
      throw new NotFoundException({
        code: "HERO_SLIDE_NOT_FOUND",
        message: "Hero slide was not found.",
      });
    }

    return slide;
  }

  private async assertActiveLimit(): Promise<void> {
    const activeCount = await this.prisma.heroSlide.count({
      where: { active: true },
    });

    if (activeCount >= MAX_ACTIVE_HERO_SLIDES) {
      throw new BadRequestException({
        code: "HERO_ACTIVE_LIMIT",
        message: "At most four hero slides can be active.",
      });
    }
  }

  private async assertHeroImage(id: string): Promise<void> {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id },
      select: {
        purpose: true,
        visibility: true,
      },
    });

    if (
      !asset ||
      asset.purpose !== MediaPurpose.HERO_IMAGE ||
      asset.visibility !== MediaVisibility.PUBLIC
    ) {
      throw new BadRequestException({
        code: "INVALID_HERO_IMAGE",
        message: "imageAssetId must reference a public HERO_IMAGE asset.",
      });
    }
  }

  private toHeroSlideResponse(slide: {
    id: string;
    imageAssetId: string;
    title: string;
    description: string;
    ctaLabel: string | null;
    ctaTarget: string | null;
    displayOrder: number;
    active: boolean;
    updatedById: string | null;
    createdAt: Date;
    updatedAt: Date;
    imageAsset: {
      id: string;
      originalName: string;
      storageKey: string;
      visibility: MediaVisibility;
      purpose: MediaPurpose;
    };
  }) {
    return {
      id: slide.id,
      imageAssetId: slide.imageAssetId,
      imageName: slide.imageAsset.originalName,
      imageUrl:
        slide.imageAsset.visibility === MediaVisibility.PUBLIC &&
        slide.imageAsset.purpose === MediaPurpose.HERO_IMAGE
          ? this.storage.publicUrl(slide.imageAsset.storageKey)
          : null,
      title: slide.title,
      description: slide.description,
      ctaLabel: slide.ctaLabel,
      ctaTarget: slide.ctaTarget,
      displayOrder: slide.displayOrder,
      active: slide.active,
      updatedById: slide.updatedById,
      createdAt: slide.createdAt,
      updatedAt: slide.updatedAt,
    };
  }

  private cleanOptional(value: string | undefined): string | null {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private stringValue(value: Prisma.JsonValue | undefined): string | null {
    return typeof value === "string" && value.trim()
      ? value.trim()
      : null;
  }
}
