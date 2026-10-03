import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  MediaPurpose,
  MediaVisibility,
  Prisma,
  ProjectStatus,
} from "@prisma/client";
import { randomUUID } from "node:crypto";

import type { AuthenticatedAdmin } from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";
import { ObjectStorageService } from "../media/object-storage.service";
import type {
  ChangeProjectStateDto,
  CreateProjectDto,
  ProjectListQueryDto,
  UpdateProjectDto,
} from "./project.dto";
import {
  assertProjectPublishable,
  normalizeProjectSlug,
  ProjectPublishValidationError,
  resolveVisibilityForState,
} from "./projects.domain";

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
  ) {}

  async list(query: ProjectListQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.ProjectWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(typeof query.visibility === "boolean" ? { visibility: query.visibility } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
              { shortDescription: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const orderBy: Prisma.ProjectOrderByWithRelationInput = {
      [query.sort]: query.order,
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy,
        include: {
          mainImage: {
            select: {
              storageKey: true,
              visibility: true,
            },
          },
          _count: {
            select: {
              contributions: true,
            },
          },
        },
      }),
    ]);

    return {
      items: items.map((item) => this.toProjectResponse(item)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async getById(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        mainImage: {
          select: {
            storageKey: true,
            visibility: true,
          },
        },
        _count: {
          select: {
            contributions: true,
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

    return this.toProjectResponse(project);
  }

  async create(dto: CreateProjectDto, actor: AuthenticatedAdmin) {
    const id = randomUUID();
    const slug = dto.slug
      ? normalizeProjectSlug(dto.slug)
      : "draft-" + id.slice(0, 8);

    if (dto.mainImageAssetId) {
      await this.assertProjectImage(dto.mainImageAssetId);
    }

    try {
      const project = await this.prisma.project.create({
        data: {
          id,
          slug,
          title: dto.title.trim(),
          shortDescription: this.cleanOptionalText(dto.shortDescription),
          description: this.cleanOptionalText(dto.description),
          mainImageAssetId: dto.mainImageAssetId,
          displayOrder: dto.displayOrder ?? 0,
          status: ProjectStatus.DRAFT,
          visibility: false,
        },
      });

      await this.prisma.auditLog.create({
        data: {
          actorId: actor.id,
          action: "PROJECT_CREATED",
          entityType: "Project",
          entityId: project.id,
          newValue: {
            title: project.title,
            slug: project.slug,
            status: project.status,
            visibility: project.visibility,
          },
        },
      });

      return this.getById(project.id);
    } catch (error) {
      this.rethrowUniqueConstraint(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateProjectDto, actor: AuthenticatedAdmin) {
    const current = await this.requireProject(id);

    if (dto.mainImageAssetId) {
      await this.assertProjectImage(dto.mainImageAssetId);
    }

    if (current.status === ProjectStatus.ACTIVE) {
      const candidate = {
        title: dto.title?.trim() ?? current.title,
        slug:
          dto.slug !== undefined ? normalizeProjectSlug(dto.slug) : current.slug,
        shortDescription:
          dto.shortDescription !== undefined
            ? this.cleanOptionalText(dto.shortDescription)
            : current.shortDescription,
        description:
          dto.description !== undefined
            ? this.cleanOptionalText(dto.description)
            : current.description,
        mainImageAssetId:
          dto.mainImageAssetId !== undefined
            ? dto.mainImageAssetId
            : current.mainImageAssetId,
      };
      this.assertPublishableOrThrow(candidate);
    }

    try {
      const project = await this.prisma.project.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.slug !== undefined
            ? { slug: normalizeProjectSlug(dto.slug) }
            : {}),
          ...(dto.shortDescription !== undefined
            ? { shortDescription: this.cleanOptionalText(dto.shortDescription) }
            : {}),
          ...(dto.description !== undefined
            ? { description: this.cleanOptionalText(dto.description) }
            : {}),
          ...(dto.mainImageAssetId !== undefined
            ? { mainImageAssetId: dto.mainImageAssetId }
            : {}),
          ...(dto.displayOrder !== undefined
            ? { displayOrder: dto.displayOrder }
            : {}),
        },
      });

      await this.prisma.auditLog.create({
        data: {
          actorId: actor.id,
          action: "PROJECT_UPDATED",
          entityType: "Project",
          entityId: project.id,
        },
      });

      return this.getById(project.id);
    } catch (error) {
      this.rethrowUniqueConstraint(error);
      throw error;
    }
  }

  async changeState(
    id: string,
    dto: ChangeProjectStateDto,
    actor: AuthenticatedAdmin,
  ) {
    const current = await this.requireProject(id);
    const visibility = resolveVisibilityForState(
      dto.status,
      dto.visibility,
      current.visibility,
    );

    if (dto.status === ProjectStatus.ACTIVE || visibility) {
      this.assertPublishableOrThrow(current);
    }

    const publishedAt =
      dto.status === ProjectStatus.ACTIVE
        ? current.publishedAt ?? new Date()
        : current.publishedAt;

    const updated = await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.update({
        where: { id },
        data: {
          status: dto.status,
          visibility,
          publishedAt,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "PROJECT_STATE_CHANGED",
          entityType: "Project",
          entityId: id,
          previousValue: {
            status: current.status,
            visibility: current.visibility,
          },
          newValue: {
            status: project.status,
            visibility: project.visibility,
          },
        },
      });

      return project;
    });

    return this.getById(updated.id);
  }

  private async requireProject(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new NotFoundException({
        code: "PROJECT_NOT_FOUND",
        message: "Project was not found.",
      });
    }

    return project;
  }

  private async assertProjectImage(id: string): Promise<void> {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id },
      select: {
        purpose: true,
        visibility: true,
      },
    });

    if (
      !asset ||
      asset.purpose !== MediaPurpose.PROJECT_IMAGE ||
      asset.visibility !== MediaVisibility.PUBLIC
    ) {
      throw new BadRequestException({
        code: "INVALID_PROJECT_IMAGE",
        message: "mainImageAssetId must reference a public PROJECT_IMAGE asset.",
      });
    }
  }

  private assertPublishableOrThrow(project: {
    title: string;
    slug: string;
    shortDescription: string | null;
    description: string | null;
    mainImageAssetId: string | null;
  }): void {
    try {
      assertProjectPublishable(project);
    } catch (error) {
      if (error instanceof ProjectPublishValidationError) {
        throw new BadRequestException({
          code: "PROJECT_NOT_PUBLISHABLE",
          message: "Project is missing required public content.",
          fieldErrors: Object.fromEntries(
            error.missingFields.map((field) => [field, ["Required before activation."]]),
          ),
        });
      }

      throw error;
    }
  }

  private cleanOptionalText(value: string | undefined): string | null {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private rethrowUniqueConstraint(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException({
        code: "PROJECT_SLUG_CONFLICT",
        message: "Project slug must be unique.",
      });
    }
  }

  private toProjectResponse(project: {
    id: string;
    slug: string;
    title: string;
    shortDescription: string | null;
    description: string | null;
    mainImageAssetId: string | null;
    status: ProjectStatus;
    visibility: boolean;
    displayOrder: number;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    mainImage: {
      storageKey: string;
      visibility: MediaVisibility;
    } | null;
    _count: {
      contributions: number;
    };
  }) {
    return {
      id: project.id,
      slug: project.slug,
      title: project.title,
      shortDescription: project.shortDescription,
      description: project.description,
      mainImageAssetId: project.mainImageAssetId,
      mainImageUrl:
        project.mainImage?.visibility === MediaVisibility.PUBLIC
          ? this.storage.publicUrl(project.mainImage.storageKey)
          : null,
      status: project.status,
      visibility: project.visibility,
      displayOrder: project.displayOrder,
      contributionCount: project._count.contributions,
      publishedAt: project.publishedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
