import { Injectable } from "@nestjs/common";
import {
  MediaPurpose,
  MediaVisibility,
  ProjectStatus,
  PublishStatus,
  TransparencyDocumentType,
} from "@prisma/client";

import { PrismaService } from "../database/prisma.service";
import { ObjectStorageService } from "../media/object-storage.service";
import { normalizePublicSettings, PUBLIC_SETTING_KEYS } from "./public-content";

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
  ) {}

  async getPublicSettings() {
    const rows = await this.prisma.setting.findMany({
      where: {
        isPublic: true,
        key: { in: [...PUBLIC_SETTING_KEYS] },
      },
      select: {
        key: true,
        value: true,
      },
    });

    return normalizePublicSettings(rows);
  }

  async getHome() {
    const [heroSlides, projects, settings, transparencyGroups] = await Promise.all([
      this.prisma.heroSlide.findMany({
        where: {
          active: true,
          imageAsset: {
            visibility: MediaVisibility.PUBLIC,
            purpose: MediaPurpose.HERO_IMAGE,
          },
        },
        take: 4,
        orderBy: [{ displayOrder: "asc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          title: true,
          description: true,
          ctaLabel: true,
          ctaTarget: true,
          displayOrder: true,
          imageAsset: {
            select: { storageKey: true },
          },
        },
      }),
      this.prisma.project.findMany({
        where: {
          status: ProjectStatus.ACTIVE,
          visibility: true,
        },
        take: 4,
        orderBy: [{ displayOrder: "asc" }, { publishedAt: "desc" }],
        select: {
          id: true,
          slug: true,
          title: true,
          shortDescription: true,
          mainImage: {
            select: {
              storageKey: true,
              visibility: true,
            },
          },
        },
      }),
      this.getPublicSettings(),
      this.prisma.transparencyDocument.groupBy({
        by: ["type"],
        where: { publishStatus: PublishStatus.PUBLISHED },
        _count: { _all: true },
      }),
    ]);

    const transparencyCounts: Record<TransparencyDocumentType, number> = {
      [TransparencyDocumentType.PERFORMANCE_REPORT]: 0,
      [TransparencyDocumentType.LICENSE]: 0,
      [TransparencyDocumentType.FINANCIAL_DOCUMENT]: 0,
    };

    for (const group of transparencyGroups) {
      transparencyCounts[group.type] = group._count._all;
    }

    return {
      heroSlides: heroSlides
        .map((slide) => ({
          id: slide.id,
          title: slide.title,
          description: slide.description,
          ctaLabel: slide.ctaLabel,
          ctaTarget: slide.ctaTarget,
          displayOrder: slide.displayOrder,
          imageUrl: this.storage.publicUrl(slide.imageAsset.storageKey),
        }))
        .filter((slide) => Boolean(slide.imageUrl)),
      projects: projects.map((project) => ({
        id: project.id,
        slug: project.slug,
        title: project.title,
        shortDescription: project.shortDescription,
        imageUrl:
          project.mainImage?.visibility === MediaVisibility.PUBLIC
            ? this.storage.publicUrl(project.mainImage.storageKey)
            : null,
      })),
      transparency: [
        {
          type: TransparencyDocumentType.PERFORMANCE_REPORT,
          label: "گزارش عملکرد",
          count: transparencyCounts[TransparencyDocumentType.PERFORMANCE_REPORT],
        },
        {
          type: TransparencyDocumentType.LICENSE,
          label: "مجوزها",
          count: transparencyCounts[TransparencyDocumentType.LICENSE],
        },
        {
          type: TransparencyDocumentType.FINANCIAL_DOCUMENT,
          label: "اسناد مالی",
          count: transparencyCounts[TransparencyDocumentType.FINANCIAL_DOCUMENT],
        },
      ],
      settings,
    };
  }
}
