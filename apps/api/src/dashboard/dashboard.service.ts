import { Injectable } from "@nestjs/common";
import { ContributionStatus, CooperationRequestStatus, ProjectStatus } from "@prisma/client";

import { PrismaService } from "../database/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [
      activeProjects,
      contributions,
      pendingReceipts,
      cooperationRequests,
      latestContributions,
      reviewQueue,
      recentRequests,
    ] = await this.prisma.$transaction([
      this.prisma.project.count({ where: { status: ProjectStatus.ACTIVE } }),
      this.prisma.contribution.count(),
      this.prisma.contribution.count({ where: { status: ContributionStatus.PENDING } }),
      this.prisma.cooperationRequest.count({
        where: { status: { not: CooperationRequestStatus.CLOSED } },
      }),
      this.prisma.contribution.findMany({
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
      }),
      this.prisma.contribution.findMany({
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
      }),
      this.prisma.cooperationRequest.findMany({
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
      }),
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
