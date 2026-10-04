import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { MediaModule } from "../media/media.module";
import { ContentController } from "./content.controller";
import { ContentService } from "./content.service";

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
