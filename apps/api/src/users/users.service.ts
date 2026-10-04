import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AdminRole,
  AdminUserStatus,
  Prisma,
} from "@prisma/client";
import { hash } from "bcryptjs";

import { PASSWORD_HASH_ROUNDS } from "../auth/auth.constants";
import type {
  AuthenticatedAdmin,
  RequestContext,
} from "../auth/auth.types";
import { PrismaService } from "../database/prisma.service";
import type {
  CreateAdminUserDto,
  UpdateAdminUserDto,
  UpdateAdminUserStatusDto,
} from "./users.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const items = await this.prisma.adminUser.findMany({
      orderBy: [
        { status: "asc" },
        { createdAt: "asc" },
      ],
      select: this.publicSelect(),
    });

    return { items };
  }

  async create(
    dto: CreateAdminUserDto,
    actor: AuthenticatedAdmin,
    context: RequestContext = {},
  ) {
    const passwordHash = await hash(
      dto.initialPassword,
      PASSWORD_HASH_ROUNDS,
    );

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.adminUser.create({
          data: {
            fullName: dto.fullName.trim(),
            email: dto.email.trim().toLowerCase(),
            passwordHash,
            role: dto.role,
            status: dto.status,
          },
          select: this.publicSelect(),
        });

        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: "ADMIN_USER_CREATED",
            entityType: "AdminUser",
            entityId: created.id,
            newValue: {
              email: created.email,
              fullName: created.fullName,
              role: created.role,
              status: created.status,
            },
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
          },
        });

        return created;
      });

      return user;
    } catch (error) {
      this.rethrowEmailConflict(error);
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateAdminUserDto,
    actor: AuthenticatedAdmin,
    context: RequestContext = {},
  ) {
    const current = await this.requireUser(id);

    if (
      id === actor.id &&
      dto.role !== undefined &&
      dto.role !== current.role
    ) {
      throw new BadRequestException({
        code: "SELF_ROLE_CHANGE_NOT_ALLOWED",
        message: "You cannot change your own role.",
      });
    }

    if (
      current.role === AdminRole.SUPER_ADMIN &&
      dto.role !== undefined &&
      dto.role !== AdminRole.SUPER_ADMIN
    ) {
      await this.assertAnotherActiveSuperAdmin(current.id);
    }

    const roleChanged =
      dto.role !== undefined && dto.role !== current.role;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const user = await tx.adminUser.update({
          where: { id },
          data: {
            ...(dto.fullName !== undefined
              ? { fullName: dto.fullName.trim() }
              : {}),
            ...(dto.email !== undefined
              ? { email: dto.email.trim().toLowerCase() }
              : {}),
            ...(dto.role !== undefined ? { role: dto.role } : {}),
          },
          select: this.publicSelect(),
        });

        if (roleChanged) {
          await tx.adminSession.updateMany({
            where: {
              userId: id,
              revokedAt: null,
            },
            data: { revokedAt: new Date() },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: roleChanged
              ? "ADMIN_USER_ROLE_CHANGED"
              : "ADMIN_USER_UPDATED",
            entityType: "AdminUser",
            entityId: id,
            previousValue: {
              email: current.email,
              fullName: current.fullName,
              role: current.role,
              status: current.status,
            },
            newValue: {
              email: user.email,
              fullName: user.fullName,
              role: user.role,
              status: user.status,
            },
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
          },
        });

        return user;
      });

      return updated;
    } catch (error) {
      this.rethrowEmailConflict(error);
      throw error;
    }
  }

  async updateStatus(
    id: string,
    dto: UpdateAdminUserStatusDto,
    actor: AuthenticatedAdmin,
    context: RequestContext = {},
  ) {
    const current = await this.requireUser(id);

    if (id === actor.id && dto.status === AdminUserStatus.DISABLED) {
      throw new BadRequestException({
        code: "SELF_DISABLE_NOT_ALLOWED",
        message: "You cannot disable your own account.",
      });
    }

    if (
      current.role === AdminRole.SUPER_ADMIN &&
      current.status === AdminUserStatus.ACTIVE &&
      dto.status === AdminUserStatus.DISABLED
    ) {
      await this.assertAnotherActiveSuperAdmin(current.id);
    }

    if (dto.status === current.status) {
      return this.toResponse(current);
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.adminUser.update({
        where: { id },
        data: { status: dto.status },
        select: this.publicSelect(),
      });

      if (dto.status === AdminUserStatus.DISABLED) {
        await tx.adminSession.updateMany({
          where: {
            userId: id,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action:
            dto.status === AdminUserStatus.DISABLED
              ? "ADMIN_USER_DISABLED"
              : "ADMIN_USER_ACTIVATED",
          entityType: "AdminUser",
          entityId: id,
          previousValue: { status: current.status },
          newValue: { status: user.status },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });

      return user;
    });
  }

  private async requireUser(id: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException({
        code: "ADMIN_USER_NOT_FOUND",
        message: "Admin user was not found.",
      });
    }

    return user;
  }

  private async assertAnotherActiveSuperAdmin(
    excludedId: string,
  ): Promise<void> {
    const count = await this.prisma.adminUser.count({
      where: {
        id: { not: excludedId },
        role: AdminRole.SUPER_ADMIN,
        status: AdminUserStatus.ACTIVE,
      },
    });

    if (count < 1) {
      throw new BadRequestException({
        code: "LAST_ACTIVE_SUPER_ADMIN",
        message: "At least one active Super Admin must remain.",
      });
    }
  }

  private rethrowEmailConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException({
        code: "ADMIN_EMAIL_CONFLICT",
        message: "Admin user email must be unique.",
      });
    }
  }

  private publicSelect() {
    return {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    } as const;
  }

  private toResponse(user: {
    id: string;
    email: string;
    fullName: string;
    role: AdminRole;
    status: AdminUserStatus;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
