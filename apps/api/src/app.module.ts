import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health.controller";
import { DashboardModule } from "./dashboard/dashboard.module";
import { MediaModule } from "./media/media.module";
import { ProjectsModule } from "./projects/projects.module";
import { PublicModule } from "./public/public.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    DatabaseModule,
    AuthModule,
    MediaModule,
    ProjectsModule,
    DashboardModule,
    PublicModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
