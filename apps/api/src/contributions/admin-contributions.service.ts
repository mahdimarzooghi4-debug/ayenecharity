import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ContributionStatus,
  Prisma,
} from "@prisma/client";

import type {
  AuthenticatedAdmin,
  RequestContext,
} from "../auth/auth.types";
import { hasPermissions, Permission } from "../auth/permissions";
import { PrismaService } from "../database/prisma.service";
import { MediaService } from "../media/media.service";
import type {
  AdminContributionListQueryDto,
  ReviewContributionDto,
} from "./admin-contribution.dto";

@Injectable()
export class AdminContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async list(
    query: AdminContributionListQueryDto,
    actor: AuthenticatedAdmin,
  ) {
    const search = query.search?.trim();
    const createdAt: Prisma.DateTimeFilter | undefined =
      query.from || query.to
        ? {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          }
        : undefined;

    const where: Prisma.ContributionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(search
        ? {
            OR: [
              {
                contributorName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                contributorPhone: {
                  contains: search,
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
    const orderBy: Prisma.ContributionOrderByWithRelationInput = {
      [query.sort]: query.order,
    };

    const [total, items, projects, pendingCount] =
      await this.prisma.$transaction([
        this.prisma.contribution.count({ where }),
        this.prisma.contribution.findMany({
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
            receipt: {
              select: {
                originalName: true,
                mimeType: true,
                sizeBytes: true,
              },
            },
            reviewedBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        }),
        this.prisma.project.findMany({
          where: {
            contributions: {
              some: {},
            },
          },
          select: {
            id: true,
            title: true,
          },
          orderBy: {
            title: "asc",
          },
        }),
        this.prisma.contribution.count({
          where: {
            status: ContributionStatus.PENDING,
          },
        }),
      ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      pendingCount,
      projects,
      capabilities: {
        review: hasPermissions(actor.role, [
          Permission.CONTRIBUTIONS_REVIEW,
        ]),
      },
    };
  }

  async getReceiptAccessUrl(
    id: string,
    actor: AuthenticatedAdmin,
  ) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id },
      select: {
        receiptAssetId: true,
      },
    });

    if (!contribution) {
      throw new NotFoundException({
        code: "CONTRIBUTION_NOT_FOUND",
        message: "Contribution was not found.",
      });
    }

    return this.media.getAdminAccessUrl(
      contribution.receiptAssetId,
      actor,
    );
  }

  async review(
    id: string,
    dto: ReviewContributionDto,
    actor: AuthenticatedAdmin,
    context: RequestContext = {},
  ) {
    const requiredPermission =
      dto.decision === "APPROVE"
        ? Permission.CONTRIBUTIONS_APPROVE
        : Permission.CONTRIBUTIONS_REJECT;

    if (!hasPermissions(actor.role, [requiredPermission])) {
      throw new ForbiddenException(
        "Insufficient permissions to review this contribution.",
      );
    }

    const current = await this.prisma.contribution.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        version: true,
      },
    });

    if (!current) {
      throw new NotFoundException({
        code: "CONTRIBUTION_NOT_FOUND",
        message: "Contribution was not found.",
      });
    }

    if (current.status !== ContributionStatus.PENDING) {
      throw new ConflictException({
        code: "CONTRIBUTION_ALREADY_REVIEWED",
        message: "Contribution has already been reviewed.",
      });
    }

    if (current.version !== dto.version) {
      throw new ConflictException({
        code: "CONTRIBUTION_VERSION_CONFLICT",
        message: "Contribution changed after it was loaded.",
      });
    }

    const rejectionReason = dto.rejectionReason?.trim() || null;

    if (dto.decision === "REJECT" && !rejectionReason) {
      throw new BadRequestException({
        code: "REJECTION_REASON_REQUIRED",
        message: "A rejection reason is required.",
      });
    }

    const nextStatus =
      dto.decision === "APPROVE"
        ? ContributionStatus.APPROVED
        : ContributionStatus.REJECTED;
    const reviewedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.contribution.updateMany({
        where: {
          id,
          status: ContributionStatus.PENDING,
          version: dto.version,
        },
        data: {
          status: nextStatus,
          rejectionReason:
            nextStatus === ContributionStatus.REJECTED
              ? rejectionReason
              : null,
          reviewedById: actor.id,
          reviewedAt,
          version: {
            increment: 1,
          },
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException({
          code: "CONTRIBUTION_VERSION_CONFLICT",
          message: "Contribution changed while it was being reviewed.",
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action:
            nextStatus === ContributionStatus.APPROVED
              ? "CONTRIBUTION_APPROVED"
              : "CONTRIBUTION_REJECTED",
          entityType: "Contribution",
          entityId: id,
          previousValue: {
            status: current.status,
            version: current.version,
          },
          newValue: {
            status: nextStatus,
            version: current.version + 1,
            rejectionReason:
              nextStatus === ContributionStatus.REJECTED
                ? rejectionReason
                : null,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
    });

    return this.getById(id);
  }

  private async getById(id: string) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        receipt: {
          select: {
            originalName: true,
            mimeType: true,
            sizeBytes: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!contribution) {
      throw new NotFoundException({
        code: "CONTRIBUTION_NOT_FOUND",
        message: "Contribution was not found.",
      });
    }

    return this.toResponse(contribution);
  }

  private toResponse(contribution: {
    id: string;
    contributorName: string;
    contributorPhone: string;
    contributorEmail: string | null;
    declaredAmountRial: bigint;
    contributorNote: string | null;
    status: ContributionStatus;
    rejectionReason: string | null;
    reviewedAt: Date | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    project: {
      id: string;
      title: string;
    };
    receipt: {
      originalName: string;
      mimeType: string;
      sizeBytes: bigint;
    };
    reviewedBy: {
      id: string;
      fullName: string;
    } | null;
  }) {
    return {
      id: contribution.id,
      contributorName: contribution.contributorName,
      contributorPhone: contribution.contributorPhone,
      contributorEmail: contribution.contributorEmail,
      declaredAmountRial: contribution.declaredAmountRial.toString(),
      contributorNote: contribution.contributorNote,
      status: contribution.status,
      rejectionReason: contribution.rejectionReason,
      reviewedAt: contribution.reviewedAt,
      reviewedBy: contribution.reviewedBy,
      version: contribution.version,
      createdAt: contribution.createdAt,
      updatedAt: contribution.updatedAt,
      project: contribution.project,
      receipt: {
        originalName: contribution.receipt.originalName,
        mimeType: contribution.receipt.mimeType,
        sizeBytes: contribution.receipt.sizeBytes.toString(),
      },
    };
  }
}
