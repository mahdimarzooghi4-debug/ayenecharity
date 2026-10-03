import { Module } from "@nestjs/common";

import { MediaModule } from "../media/media.module";
import { PublicController } from "./public.controller";
import { PublicService } from "./public.service";

@Module({
  imports: [MediaModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
