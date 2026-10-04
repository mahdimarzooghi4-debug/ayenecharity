import { Injectable, NotFoundException } from "@nestjs/common";
import {
  MediaPurpose,
  MediaVisibility,
  ProjectStatus,
  PublishStatus,
  TransparencyDocumentType,
} from "@prisma/client";

import { PrismaService } from "../database/prisma.service";
import {
  defaultHomeContent,
  HOME_CONTENT,
  HOME_CONTENT_KEYS,
} from "../content/content.constants";
import { ObjectStorageService } from "../media/object-storage.service";
import {
  normalizePublicSettings,
  PUBLIC_HOME_SETTING_KEYS,
  PUBLIC_SETTING_KEYS,
} from "./public-content";

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
  ) {}

  async getPublicSettings() {
    return this.getSettingsByKeys(PUBLIC_SETTING_KEYS);
  }

  async getSiteSettings() {
    return this.getSettingsByKeys(PUBLIC_HOME_SETTING_KEYS);
  }

  private async getSettingsByKeys(keys: readonly string[]) {
    const rows = await this.prisma.setting.findMany({
      where: {
        isPublic: true,
        key: { in: [...keys] },
      },
      select: {
        key: true,
        value: true,
      },
    });

    return normalizePublicSettings(rows, keys);
  }

  async getHome() {
    const [heroSlides, projects, settings, transparencyGroups, contentRows] = await Promise.all([
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
              purpose: true,
            },
          },
        },
      }),
      this.getSiteSettings(),
      this.prisma.transparencyDocument.groupBy({
        by: ["type"],
        where: { publishStatus: PublishStatus.PUBLISHED },
        _count: { _all: true },
      }),
      this.prisma.siteContent.findMany({
        where: { key: { in: [...HOME_CONTENT_KEYS] } },
        select: { key: true, value: true },
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

    const contentMap = new Map(
      contentRows.map((row) => [row.key, row.value]),
    );
    const contentDefaults = defaultHomeContent();
    const content = Object.fromEntries(
      Object.entries(HOME_CONTENT).map(([name, definition]) => {
        const stored = contentMap.get(definition.key);
        const value =
          typeof stored === "string" && stored.trim()
            ? stored.trim()
            : contentDefaults[name as keyof typeof contentDefaults];
        return [name, value];
      }),
    );

    return {
      content,
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
      projects: projects.map((project) => this.toProjectPreview(project)),
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

  async listTransparency() {
    const documents = await this.prisma.transparencyDocument.findMany({
      where: {
        publishStatus: PublishStatus.PUBLISHED,
      },
      orderBy: [
        { type: "asc" },
        { documentDate: "desc" },
        { publishedAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
        type: true,
        description: true,
        documentDate: true,
        publishedAt: true,
        project: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
        file: {
          select: {
            storageKey: true,
            visibility: true,
            purpose: true,
          },
        },
      },
    });

    const grouped = {
      [TransparencyDocumentType.PERFORMANCE_REPORT]: [],
      [TransparencyDocumentType.LICENSE]: [],
      [TransparencyDocumentType.FINANCIAL_DOCUMENT]: [],
    } as Record<
      TransparencyDocumentType,
      Array<{
        id: string;
        title: string;
        description: string | null;
        documentDate: Date | null;
        publishedAt: Date | null;
        project: { id: string; slug: string; title: string } | null;
        fileUrl: string | null;
      }>
    >;

    for (const document of documents) {
      grouped[document.type].push({
        id: document.id,
        title: document.title,
        description: document.description,
        documentDate: document.documentDate,
        publishedAt: document.publishedAt,
        project: document.project,
        fileUrl:
          document.file?.visibility === MediaVisibility.PUBLIC &&
          document.file.purpose === MediaPurpose.TRANSPARENCY_DOCUMENT
            ? this.storage.publicUrl(document.file.storageKey)
            : null,
      });
    }

    return {
      categories: [
        {
          type: TransparencyDocumentType.PERFORMANCE_REPORT,
          label: "گزارش عملکرد",
          description: "گزارش فعالیت‌ها و نتیجه اجرای طرح‌ها",
          documents: grouped[TransparencyDocumentType.PERFORMANCE_REPORT],
        },
        {
          type: TransparencyDocumentType.LICENSE,
          label: "مجوزها",
          description: "مجوزها و اطلاعات رسمی مرکز",
          documents: grouped[TransparencyDocumentType.LICENSE],
        },
        {
          type: TransparencyDocumentType.FINANCIAL_DOCUMENT,
          label: "اسناد مالی",
          description: "اسناد و مدارک مالی مرتبط با فعالیت‌های نیکوکاری",
          documents: grouped[TransparencyDocumentType.FINANCIAL_DOCUMENT],
        },
      ],
    };
  }

  async listProjects() {
    const projects = await this.prisma.project.findMany({
      where: {
        status: ProjectStatus.ACTIVE,
        visibility: true,
      },
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
            purpose: true,
          },
        },
      },
    });

    return {
      items: projects.map((project) => this.toProjectPreview(project)),
    };
  }

  async getProjectBySlug(slug: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        slug,
        status: ProjectStatus.ACTIVE,
        visibility: true,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        description: true,
        publishedAt: true,
        mainImage: {
          select: {
            storageKey: true,
            visibility: true,
            purpose: true,
          },
        },
        transparencyDocuments: {
          where: {
            publishStatus: PublishStatus.PUBLISHED,
          },
          orderBy: [{ documentDate: "desc" }, { publishedAt: "desc" }],
          select: {
            id: true,
            title: true,
            type: true,
            description: true,
            documentDate: true,
            publishedAt: true,
            file: {
              select: {
                storageKey: true,
                visibility: true,
                purpose: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException({
        code: "PROJECT_NOT_FOUND",
        message: "Project was not found.",
      });
    }

    return {
      id: project.id,
      slug: project.slug,
      title: project.title,
      shortDescription: project.shortDescription,
      description: project.description,
      publishedAt: project.publishedAt,
      imageUrl: this.publicProjectImageUrl(project.mainImage),
      reports: project.transparencyDocuments.map((document) => ({
        id: document.id,
        title: document.title,
        type: document.type,
        description: document.description,
        documentDate: document.documentDate,
        publishedAt: document.publishedAt,
        fileUrl:
          document.file?.visibility === MediaVisibility.PUBLIC &&
          document.file.purpose === MediaPurpose.TRANSPARENCY_DOCUMENT
            ? this.storage.publicUrl(document.file.storageKey)
            : null,
      })),
    };
  }

  private toProjectPreview(project: {
    id: string;
    slug: string;
    title: string;
    shortDescription: string | null;
    mainImage: {
      storageKey: string;
      visibility: MediaVisibility;
      purpose: MediaPurpose;
    } | null;
  }) {
    return {
      id: project.id,
      slug: project.slug,
      title: project.title,
      shortDescription: project.shortDescription,
      imageUrl: this.publicProjectImageUrl(project.mainImage),
    };
  }

  private publicProjectImageUrl(
    asset: {
      storageKey: string;
      visibility: MediaVisibility;
      purpose: MediaPurpose;
    } | null,
  ): string | null {
    if (
      !asset ||
      asset.visibility !== MediaVisibility.PUBLIC ||
      asset.purpose !== MediaPurpose.PROJECT_IMAGE
    ) {
      return null;
    }

    return this.storage.publicUrl(asset.storageKey);
  }
}
