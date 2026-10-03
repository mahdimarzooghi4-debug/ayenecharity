import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AdminUserStatus } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { createHash } from "node:crypto";

import { PrismaService } from "../database/prisma.service";
import {
  DEFAULT_SESSION_TTL_HOURS,
  PASSWORD_HASH_ROUNDS,
} from "./auth.constants";
import type { LoginDto } from "./auth.dto";
import type { AuthenticatedAdmin, RequestContext } from "./auth.types";
import { LoginRateLimiterService } from "./login-rate-limiter.service";
import { createSessionToken, hashSessionToken } from "./session-token";

interface LoginResult {
  sessionToken: string;
  expiresAt: Date;
  user: AuthenticatedAdmin;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly rateLimiter: LoginRateLimiterService,
  ) {}

  async login(dto: LoginDto, context: RequestContext): Promise<LoginResult> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    this.rateLimiter.assertAllowed(context.ipAddress, normalizedEmail);

    const user = await this.prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
    });

    const passwordMatches = user
      ? await compare(dto.password, user.passwordHash)
      : await this.performTimingPadding(dto.password);

    if (!user || user.status !== AdminUserStatus.ACTIVE || !passwordMatches) {
      this.rateLimiter.recordFailure(context.ipAddress, normalizedEmail);
      await this.auditFailedLogin(normalizedEmail, context);
      throw new UnauthorizedException("Invalid email or password.");
    }

    this.rateLimiter.clearIdentity(normalizedEmail);

    const sessionToken = createSessionToken();
    const expiresAt = new Date(Date.now() + this.getSessionTtlMs());
    const tokenHash = hashSessionToken(sessionToken, this.getSessionSecret());

    await this.prisma.$transaction([
      this.prisma.adminSession.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      }),
      this.prisma.adminUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: "AUTH_LOGIN_SUCCESS",
          entityType: "AdminUser",
          entityId: user.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      }),
    ]);

    return {
      sessionToken,
      expiresAt,
      user: this.toAuthenticatedAdmin(user),
    };
  }

  async authenticateSession(sessionToken: string): Promise<AuthenticatedAdmin> {
    const tokenHash = hashSessionToken(sessionToken, this.getSessionSecret());
    const session = await this.prisma.adminSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      session.user.status !== AdminUserStatus.ACTIVE
    ) {
      throw new UnauthorizedException("Session is invalid or expired.");
    }

    return this.toAuthenticatedAdmin(session.user);
  }

  async logout(sessionToken: string | undefined, context: RequestContext): Promise<void> {
    if (!sessionToken) {
      return;
    }

    const tokenHash = hashSessionToken(sessionToken, this.getSessionSecret());
    const session = await this.prisma.adminSession.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, revokedAt: true },
    });

    if (!session || session.revokedAt) {
      return;
    }

    await this.prisma.$transaction([
      this.prisma.adminSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: session.userId,
          action: "AUTH_LOGOUT",
          entityType: "AdminUser",
          entityId: session.userId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      }),
    ]);
  }

  getSessionTtlMs(): number {
    const configured = Number(this.config.get<string>("SESSION_TTL_HOURS"));
    const hours =
      Number.isFinite(configured) && configured >= 1 && configured <= 168
        ? configured
        : DEFAULT_SESSION_TTL_HOURS;

    return hours * 60 * 60 * 1000;
  }

  private getSessionSecret(): string {
    const secret = this.config.get<string>("SESSION_SECRET");

    if (!secret || secret.length < 32) {
      throw new InternalServerErrorException(
        "SESSION_SECRET must contain at least 32 characters.",
      );
    }

    return secret;
  }

  private async performTimingPadding(password: string): Promise<boolean> {
    await hash(password, PASSWORD_HASH_ROUNDS);
    return false;
  }

  private async auditFailedLogin(
    normalizedEmail: string,
    context: RequestContext,
  ): Promise<void> {
    const emailHash = createHash("sha256").update(normalizedEmail).digest("hex");

    await this.prisma.auditLog.create({
      data: {
        action: "AUTH_LOGIN_FAILED",
        entityType: "AdminUser",
        newValue: { emailHash },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });
  }

  private toAuthenticatedAdmin(user: {
    id: string;
    email: string;
    fullName: string;
    role: AuthenticatedAdmin["role"];
  }): AuthenticatedAdmin {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }
}
