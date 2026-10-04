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
  PublishStatus,
} from "@prisma/client";

import type {
  AuthenticatedAdmin,
  RequestContext,
} from "../auth/auth.types";
import { hasPermissions, Permission } from "../auth/permissions";
import { PrismaService } from "../database/prisma.service";
import { ObjectStorageService } from "../media/object-storage.service";
import type {
  CreateTransparencyDocumentDto,
  TransparencyListQueryDto,
  UpdateTransparencyDocumentDto,
} from "./transparency.dto";

@Injectable()
export class TransparencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
  ) {}

  async list(
    query: TransparencyListQueryDto,
    actor: AuthenticatedAdmin,
  ) {
    const search = query.search?.trim();
    const where: Prisma.TransparencyDocumentWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.publishStatus
        ? { publishStatus: query.publishStatus }
        : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                project: {
                  title: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.pageSize;
    const orderBy: Prisma.TransparencyDocumentOrderByWithRelationInput = {
      [query.sort]: query.order,
    };

    const [total, items, projects] = await this.prisma.$transaction([
      this.prisma.transparencyDocument.count({ where }),
      this.prisma.transparencyDocument.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy,
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
          file: {
            select: {
              id: true,
              originalName: true,
              mimeType: true,
              sizeBytes: true,
              visibility: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      }),
      this.prisma.project.findMany({
        select: {
          id: true,
          title: true,
        },
        orderBy: {
          title: "asc",
        },
      }),
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      projects,
      capabilities: {
        create: hasPermissions(actor.role, [
          Permission.TRANSPARENCY_CREATE,
        ]),
        update: hasPermissions(actor.role, [
          Permission.TRANSPARENCY_UPDATE,
        ]),
        publish: hasPermissions(actor.role, [
          Permission.TRANSPARENCY_PUBLISH,
        ]),
        delete: hasPermissions(actor.role, [
          Permission.TRANSPARENCY_DELETE,
        ]),
      },
    };
  }

  async getById(id: string) {
    const document = await this.prisma.transparencyDocument.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        file: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            visibility: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException({
        code: "TRANSPARENCY_DOCUMENT_NOT_FOUND",
        message: "Transparency document was not found.",
      });
    }

    return this.toResponse(document);
  }

  async create(
    dto: CreateTransparencyDocumentDto,
    actor: AuthenticatedAdmin,
  ) {
    if (dto.projectId) {
      await this.assertProject(dto.projectId);
    }

    if (dto.fileAssetId) {
      await this.assertDocumentFile(dto.fileAssetId);
    }

    const document = await this.prisma.transparencyDocument.create({
      data: {
        title: dto.title.trim(),
        type: dto.type,
        description: this.cleanOptionalText(dto.description),
        projectId: dto.projectId,
        fileAssetId: dto.fileAssetId,
        documentDate: dto.documentDate
          ? new Date(dto.documentDate)
          : null,
        publishStatus: PublishStatus.DRAFT,
        createdById: actor.id,
        updatedById: actor.id,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "TRANSPARENCY_DOCUMENT_CREATED",
        entityType: "TransparencyDocument",
        entityId: document.id,
        newValue: {
          type: document.type,
          publishStatus: document.publishStatus,
          projectId: document.projectId,
        },
      },
    });

    return this.getById(document.id);
  }

  async update(
    id: string,
    dto: UpdateTransparencyDocumentDto,
    actor: AuthenticatedAdmin,
  ) {
    const current = await this.requireDocument(id);

    if (dto.projectId) {
      await this.assertProject(dto.projectId);
    }

    if (dto.fileAssetId) {
      await this.assertDocumentFile(dto.fileAssetId, id);
    }

    const candidate = {
      title: dto.title?.trim() ?? current.title,
      fileAssetId:
        dto.fileAssetId !== undefined
          ? dto.fileAssetId
          : current.fileAssetId,
      documentDate:
        dto.documentDate !== undefined
          ? dto.documentDate
            ? new Date(dto.documentDate)
            : null
          : current.documentDate,
    };

    if (current.publishStatus === PublishStatus.PUBLISHED) {
      this.assertPublishable(candidate);
    }

    const previousFileAssetId = current.fileAssetId;

    const updated = await this.prisma.$transaction(async (tx) => {
      const document = await tx.transparencyDocument.update({
        where: { id },
        data: {
          ...(dto.title !== undefined
            ? { title: dto.title.trim() }
            : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.description !== undefined
            ? {
                description: this.cleanOptionalText(
                  dto.description,
                ),
              }
            : {}),
          ...(dto.projectId !== undefined
            ? { projectId: dto.projectId }
            : {}),
          ...(dto.fileAssetId !== undefined
            ? { fileAssetId: dto.fileAssetId }
            : {}),
          ...(dto.documentDate !== undefined
            ? {
                documentDate: dto.documentDate
                  ? new Date(dto.documentDate)
                  : null,
              }
            : {}),
          updatedById: actor.id,
        },
      });

      if (
        current.publishStatus === PublishStatus.PUBLISHED &&
        dto.fileAssetId !== undefined &&
        dto.fileAssetId !== previousFileAssetId
      ) {
        if (dto.fileAssetId) {
          await tx.mediaAsset.update({
            where: { id: dto.fileAssetId },
            data: { visibility: MediaVisibility.PUBLIC },
          });
        }

        if (previousFileAssetId) {
          await tx.mediaAsset.update({
            where: { id: previousFileAssetId },
            data: { visibility: MediaVisibility.PRIVATE },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "TRANSPARENCY_DOCUMENT_UPDATED",
          entityType: "TransparencyDocument",
          entityId: id,
        },
      });

      return document;
    });

    return this.getById(updated.id);
  }

  async publish(
    id: string,
    actor: AuthenticatedAdmin,
    context: RequestContext = {},
  ) {
    const current = await this.requireDocument(id);

    if (current.publishStatus === PublishStatus.PUBLISHED) {
      return this.getById(id);
    }

    this.assertPublishable(current);
    await this.assertDocumentFile(current.fileAssetId!, id);

    const publishedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.mediaAsset.update({
        where: { id: current.fileAssetId! },
        data: {
          visibility: MediaVisibility.PUBLIC,
        },
      });

      await tx.transparencyDocument.update({
        where: { id },
        data: {
          publishStatus: PublishStatus.PUBLISHED,
          publishedAt,
          updatedById: actor.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "TRANSPARENCY_DOCUMENT_PUBLISHED",
          entityType: "TransparencyDocument",
          entityId: id,
          previousValue: {
            publishStatus: current.publishStatus,
          },
          newValue: {
            publishStatus: PublishStatus.PUBLISHED,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
    });

    return this.getById(id);
  }

  async unpublish(
    id: string,
    actor: AuthenticatedAdmin,
    context: RequestContext = {},
  ) {
    const current = await this.requireDocument(id);

    if (current.publishStatus === PublishStatus.DRAFT) {
      return this.getById(id);
    }

    await this.prisma.$transaction(async (tx) => {
      if (current.fileAssetId) {
        await tx.mediaAsset.update({
          where: { id: current.fileAssetId },
          data: {
            visibility: MediaVisibility.PRIVATE,
          },
        });
      }

      await tx.transparencyDocument.update({
        where: { id },
        data: {
          publishStatus: PublishStatus.DRAFT,
          publishedAt: null,
          updatedById: actor.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "TRANSPARENCY_DOCUMENT_UNPUBLISHED",
          entityType: "TransparencyDocument",
          entityId: id,
          previousValue: {
            publishStatus: current.publishStatus,
          },
          newValue: {
            publishStatus: PublishStatus.DRAFT,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
    });

    return this.getById(id);
  }

  async remove(
    id: string,
    actor: AuthenticatedAdmin,
  ): Promise<void> {
    const current = await this.requireDocument(id);

    if (current.publishStatus === PublishStatus.PUBLISHED) {
      throw new ConflictException({
        code: "PUBLISHED_DOCUMENT_CANNOT_BE_DELETED",
        message: "Unpublish the document before deleting it.",
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.transparencyDocument.delete({
        where: { id },
      });

      if (current.fileAssetId) {
        await tx.mediaAsset.update({
          where: { id: current.fileAssetId },
          data: {
            visibility: MediaVisibility.PRIVATE,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "TRANSPARENCY_DOCUMENT_DELETED",
          entityType: "TransparencyDocument",
          entityId: id,
          previousValue: {
            type: current.type,
            publishStatus: current.publishStatus,
            projectId: current.projectId,
          },
        },
      });
    });
  }

  private async requireDocument(id: string) {
    const document = await this.prisma.transparencyDocument.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException({
        code: "TRANSPARENCY_DOCUMENT_NOT_FOUND",
        message: "Transparency document was not found.",
      });
    }

    return document;
  }

  private async assertProject(id: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!project) {
      throw new BadRequestException({
        code: "INVALID_TRANSPARENCY_PROJECT",
        message: "projectId does not reference an existing project.",
      });
    }
  }

  private async assertDocumentFile(
    id: string,
    currentDocumentId?: string,
  ): Promise<void> {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id },
      select: {
        purpose: true,
        documentFor: {
          select: {
            id: true,
          },
        },
      },
    });

    if (
      !asset ||
      asset.purpose !== MediaPurpose.TRANSPARENCY_DOCUMENT
    ) {
      throw new BadRequestException({
        code: "INVALID_TRANSPARENCY_FILE",
        message:
          "fileAssetId must reference a TRANSPARENCY_DOCUMENT asset.",
      });
    }

    const usedElsewhere = asset.documentFor.some(
      (document) => document.id !== currentDocumentId,
    );

    if (usedElsewhere) {
      throw new ConflictException({
        code: "TRANSPARENCY_FILE_ALREADY_USED",
        message: "This file is already attached to another document.",
      });
    }
  }

  private assertPublishable(document: {
    title: string;
    fileAssetId: string | null;
    documentDate: Date | null;
  }): void {
    const fieldErrors: Record<string, string[]> = {};

    if (document.title.trim().length < 2) {
      fieldErrors.title = ["Title is required before publishing."];
    }

    if (!document.fileAssetId) {
      fieldErrors.fileAssetId = [
        "A document file is required before publishing.",
      ];
    }

    if (!document.documentDate) {
      fieldErrors.documentDate = [
        "Document date is required before publishing.",
      ];
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw new BadRequestException({
        code: "TRANSPARENCY_DOCUMENT_NOT_PUBLISHABLE",
        message:
          "Transparency document is missing required publish data.",
        fieldErrors,
      });
    }
  }

  private cleanOptionalText(
    value: string | undefined,
  ): string | null {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private toResponse(document: {
    id: string;
    title: string;
    type: import("@prisma/client").TransparencyDocumentType;
    description: string | null;
    projectId: string | null;
    fileAssetId: string | null;
    documentDate: Date | null;
    publishStatus: PublishStatus;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    project: {
      id: string;
      title: string;
    } | null;
    file: {
      id: string;
      originalName: string;
      mimeType: string;
      sizeBytes: bigint;
      visibility: MediaVisibility;
    } | null;
    createdBy: {
      id: string;
      fullName: string;
    };
    updatedBy: {
      id: string;
      fullName: string;
    } | null;
  }) {
    return {
      id: document.id,
      title: document.title,
      type: document.type,
      description: document.description,
      projectId: document.projectId,
      project: document.project,
      fileAssetId: document.fileAssetId,
      file: document.file
        ? {
            id: document.file.id,
            originalName: document.file.originalName,
            mimeType: document.file.mimeType,
            sizeBytes: document.file.sizeBytes.toString(),
            visibility: document.file.visibility,
            publicUrl:
              document.file.visibility === MediaVisibility.PUBLIC
                ? this.storage.publicUrl(
                    this.requireStorageKeyPlaceholder(),
                  )
                : null,
          }
        : null,
      documentDate: document.documentDate,
      publishStatus: document.publishStatus,
      publishedAt: document.publishedAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      createdBy: document.createdBy,
      updatedBy: document.updatedBy,
    };
  }

  private requireStorageKeyPlaceholder(): string {
    return "";
  }
}
