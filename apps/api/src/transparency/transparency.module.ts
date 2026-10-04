import { Module } from "@nestjs/common";

import { MediaModule } from "../media/media.module";
import { TransparencyController } from "./transparency.controller";
import { TransparencyService } from "./transparency.service";

@Module({
  imports: [MediaModule],
  controllers: [TransparencyController],
  providers: [TransparencyService],
  exports: [TransparencyService],
})
export class TransparencyModule {}
