import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { MediaModule } from "../media/media.module";
import { TransparencyController } from "./transparency.controller";
import { TransparencyService } from "./transparency.service";

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [TransparencyController],
  providers: [TransparencyService],
  exports: [TransparencyService],
})
export class TransparencyModule {}
