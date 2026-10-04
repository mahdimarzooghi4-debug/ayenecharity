import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { MediaPurpose } from "@prisma/client";
import { FileInterceptor } from "@nestjs/platform-express";

import { MEDIA_POLICIES } from "../media/media-policy";
import type { UploadedMemoryFile } from "../media/media.types";
import { CreateContributionDto } from "./contribution.dto";
import { ContributionRateLimitGuard } from "./contribution-rate-limit.guard";
import {
  ContributionsService,
  type PublicContributionResponse,
} from "./contributions.service";

@Controller("contributions")
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Post()
  @UseGuards(ContributionRateLimitGuard)
  @UseInterceptors(
    FileInterceptor("receipt", {
      limits: {
        files: 1,
        fileSize: MEDIA_POLICIES[MediaPurpose.RECEIPT].maxBytes,
      },
    }),
  )
  submit(
    @Body() dto: CreateContributionDto,
    @UploadedFile() receipt: UploadedMemoryFile | undefined,
  ): Promise<PublicContributionResponse> {
    return this.contributionsService.submit(dto, receipt);
  }
}
