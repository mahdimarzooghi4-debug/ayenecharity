import { Injectable } from "@nestjs/common";
import { ContributionStatus, CooperationRequestStatus, ProjectStatus } from "@prisma/client";

import type { AuthenticatedAdmin } from "../auth/auth.types";
import { hasPermissions, Permission } from "../auth/permissions";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(user: AuthenticatedAdmin) {
    const canViewProjects = hasPermissions(user.role, [Permission.PROJECTS_VIEW]);
    const canViewContributions = hasPermissions(user.role, [Permission.CONTRIBUTIONS_VIEW]);
    const canViewRequests = hasPermissions(user.role, [Permission.REQUESTS_VIEW]);

    const [
      activeProjects,
      contributions,
      pendingReceipts,
      cooperationRequests,
      latestContributions,
      reviewQueue,
      recentRequests,
    ] = await Promise.all([
      canViewProjects
        ? this.prisma.project.count({ where: { status: ProjectStatus.ACTIVE } })
        : Promise.resolve(null),
      canViewContributions ? this.prisma.contribution.count() : Promise.resolve(null),
      canViewContributions
        ? this.prisma.contribution.count({ where: { status: ContributionStatus.PENDING } })
        : Promise.resolve(null),
      canViewRequests
        ? this.prisma.cooperationRequest.count({
            where: { status: { not: CooperationRequestStatus.CLOSED } },
          })
        : Promise.resolve(null),
      canViewContributions
        ? this.prisma.contribution.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              contributorName: true,
              declaredAmountRial: true,
              status: true,
              createdAt: true,
              project: { select: { title: true } },
            },
          })
        : Promise.resolve([]),
      canViewContributions
        ? this.prisma.contribution.findMany({
            where: { status: ContributionStatus.PENDING },
            take: 5,
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              contributorName: true,
              declaredAmountRial: true,
              createdAt: true,
              project: { select: { title: true } },
            },
          })
        : Promise.resolve([]),
      canViewRequests
        ? this.prisma.cooperationRequest.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              fullName: true,
              organizationOrProjectName: true,
              requestType: true,
              status: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

    return {
      metrics: {
        activeProjects,
        contributions,
        pendingReceipts,
        cooperationRequests,
      },
      latestContributions: latestContributions.map((item) => ({
        ...item,
        declaredAmountRial: item.declaredAmountRial.toString(),
      })),
      reviewQueue: reviewQueue.map((item) => ({
        ...item,
        declaredAmountRial: item.declaredAmountRial.toString(),
      })),
      recentRequests,
    };
  }
}
