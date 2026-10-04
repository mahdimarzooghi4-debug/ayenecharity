import { Module } from "@nestjs/common";

import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { MediaModule } from "./media/media.module";

@Module({
  imports: [MediaModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
