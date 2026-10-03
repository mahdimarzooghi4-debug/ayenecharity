import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { MediaModule } from "../media/media.module";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
