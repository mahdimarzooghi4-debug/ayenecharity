import { Module } from "@nestjs/common";

import { MediaModule } from "../media/media.module";
import { AdminContributionsController } from "./admin-contributions.controller";
import { AdminContributionsService } from "./admin-contributions.service";
import { ContributionRateLimitGuard } from "./contribution-rate-limit.guard";
import { ContributionsController } from "./contributions.controller";
import { ContributionsService } from "./contributions.service";

@Module({
  imports: [MediaModule],
  controllers: [
    ContributionsController,
    AdminContributionsController,
  ],
  providers: [
    ContributionsService,
    AdminContributionsService,
    ContributionRateLimitGuard,
  ],
})
export class ContributionsModule {}
