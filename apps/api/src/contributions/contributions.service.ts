import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContributionStatus, ProjectStatus } from "@prisma/client";

import { PrismaService } from "../database/prisma.service";
import { MediaService } from "../media/media.service";
import type { UploadedMemoryFile } from "../media/media.types";
import {
  InvalidRialAmountError,
  parsePositiveRialAmount,
} from "./contribution.domain";
import type { CreateContributionDto } from "./contribution.dto";

export interface PublicContributionResponse {
  id: string;
  status: ContributionStatus;
  submittedAt: Date;
}

@Injectable()
export class ContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async submit(
    dto: CreateContributionDto,
    receiptFile: UploadedMemoryFile | undefined,
  ): Promise<PublicContributionResponse> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: dto.projectId,
        status: ProjectStatus.ACTIVE,
        visibility: true,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      throw new NotFoundException({
        code: "PROJECT_NOT_ACCEPTING_CONTRIBUTIONS",
        message: "Project is not available for public contributions.",
      });
    }

    let amountRial: bigint;
    try {
      amountRial = parsePositiveRialAmount(dto.amountRial);
    } catch (error) {
      if (error instanceof InvalidRialAmountError) {
        throw new BadRequestException({
          code: "INVALID_CONTRIBUTION_AMOUNT",
          message: error.message,
        });
      }
      throw error;
    }

    const receipt = await this.media.storeReceipt({
      projectId: project.id,
      file: receiptFile,
    });

    try {
      const contribution = await this.prisma.contribution.create({
        data: {
          projectId: project.id,
          contributorName: dto.contributorName.trim(),
          contributorPhone: dto.contributorPhone,
          declaredAmountRial: amountRial,
          receiptAssetId: receipt.id,
          contributorNote: dto.contributorNote?.trim() || null,
          status: ContributionStatus.PENDING,
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      });

      return {
        id: contribution.id,
        status: contribution.status,
        submittedAt: contribution.createdAt,
      };
    } catch (error) {
      await this.media.discardUnreferencedReceipt(receipt.id).catch(() => undefined);
      throw error;
    }
  }
}
