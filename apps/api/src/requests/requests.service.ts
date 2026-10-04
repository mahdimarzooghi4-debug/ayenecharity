import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CooperationRequestStatus,
  Prisma,
} from "@prisma/client";

import type {
  AuthenticatedAdmin,
  RequestContext,
} from "../auth/auth.types";
import { hasPermissions, Permission } from "../auth/permissions";
import { PrismaService } from "../database/prisma.service";
import type {
  AdminRequestListQueryDto,
  CreateCooperationRequestDto,
  UpdateCooperationRequestDto,
} from "./request.dto";

const STATUS_TRANSITIONS: Record<
  CooperationRequestStatus,
  readonly CooperationRequestStatus[]
> = {
  [CooperationRequestStatus.NEW]: [
    CooperationRequestStatus.IN_REVIEW,
  ],
  [CooperationRequestStatus.IN_REVIEW]: [
    CooperationRequestStatus.RESPONDED,
  ],
  [CooperationRequestStatus.RESPONDED]: [
    CooperationRequestStatus.CLOSED,
  ],
  [CooperationRequestStatus.CLOSED]: [],
};

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(dto: CreateCooperationRequestDto) {
    const request = await this.prisma.cooperationRequest.create({
      data: {
        fullName: dto.fullName.trim(),
        organizationOrProjectName:
          dto.organizationOrProjectName?.trim() || null,
        phone: dto.phone,
        email: dto.email?.trim().toLowerCase() || null,
        requestType: dto.requestType,
        message: dto.message.trim(),
        status: CooperationRequestStatus.NEW,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      id: request.id,
      status: request.status,
      submittedAt: request.createdAt,
    };
  }

  async list(
    query: AdminRequestListQueryDto,
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

    const where: Prisma.CooperationRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.requestType
        ? { requestType: query.requestType }
        : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(search
        ? {
            OR: [
              {
                fullName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                organizationOrProjectName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                phone: {
                  contains: search,
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.pageSize;

    const [total, items, requestTypes, newCount] =
      await this.prisma.$transaction([
        this.prisma.cooperationRequest.count({ where }),
        this.prisma.cooperationRequest.findMany({
          where,
          skip,
          take: query.pageSize,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.cooperationRequest.findMany({
          select: { requestType: true },
          distinct: ["requestType"],
          orderBy: { requestType: "asc" },
        }),
        this.prisma.cooperationRequest.count({
          where: { status: CooperationRequestStatus.NEW },
        }),
      ]);

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      requestTypes: requestTypes.map((item) => item.requestType),
      newCount,
      capabilities: {
        updateStatus: hasPermissions(actor.role, [
          Permission.REQUESTS_UPDATE_STATUS,
        ]),
        addInternalNote: hasPermissions(actor.role, [
          Permission.REQUESTS_ADD_INTERNAL_NOTE,
        ]),
      },
    };
  }

  async getAdminById(id: string) {
    const request = await this.prisma.cooperationRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException({
        code: "COOPERATION_REQUEST_NOT_FOUND",
        message: "Cooperation request was not found.",
      });
    }

    return request;
  }

  async update(
    id: string,
    dto: UpdateCooperationRequestDto,
    actor: AuthenticatedAdmin,
    context: RequestContext = {},
  ) {
    const current = await this.prisma.cooperationRequest.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException({
        code: "COOPERATION_REQUEST_NOT_FOUND",
        message: "Cooperation request was not found.",
      });
    }

    const statusChanged =
      dto.status !== undefined && dto.status !== current.status;
    const noteChanged =
      dto.internalNote !== undefined &&
      dto.internalNote !== current.internalNote;

    if (statusChanged) {
      if (
        !hasPermissions(actor.role, [
          Permission.REQUESTS_UPDATE_STATUS,
        ])
      ) {
        throw new ForbiddenException(
          "Insufficient permissions to change request status.",
        );
      }

      const allowed = STATUS_TRANSITIONS[current.status];
      if (!allowed.includes(dto.status!)) {
        throw new BadRequestException({
          code: "INVALID_REQUEST_STATUS_TRANSITION",
          message: "Request status transition is not allowed.",
        });
      }
    }

    if (noteChanged) {
      if (
        !hasPermissions(actor.role, [
          Permission.REQUESTS_ADD_INTERNAL_NOTE,
        ])
      ) {
        throw new ForbiddenException(
          "Insufficient permissions to edit internal notes.",
        );
      }
    }

    if (!statusChanged && !noteChanged) {
      return current;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const request = await tx.cooperationRequest.update({
        where: { id },
        data: {
          ...(statusChanged ? { status: dto.status } : {}),
          ...(noteChanged
            ? { internalNote: dto.internalNote ?? null }
            : {}),
        },
      });

      if (statusChanged) {
        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: "COOPERATION_REQUEST_STATUS_CHANGED",
            entityType: "CooperationRequest",
            entityId: id,
            previousValue: {
              status: current.status,
            },
            newValue: {
              status: dto.status,
            },
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
          },
        });
      }

      return request;
    });

    return updated;
  }
}
