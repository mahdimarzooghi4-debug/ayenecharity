import { Module } from "@nestjs/common";

import { MediaModule } from "../media/media.module";
import { ContributionRateLimitGuard } from "./contribution-rate-limit.guard";
import { ContributionsController } from "./contributions.controller";
import { ContributionsService } from "./contributions.service";

@Module({
  imports: [MediaModule],
  controllers: [ContributionsController],
  providers: [ContributionsService, ContributionRateLimitGuard],
})
export class ContributionsModule {}
