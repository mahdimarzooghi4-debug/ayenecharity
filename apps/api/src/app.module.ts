import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { ContentModule } from "./content/content.module";

import { AuthModule } from "./auth/auth.module";
import { ContributionsModule } from "./contributions/contributions.module";
import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health.controller";
import { DashboardModule } from "./dashboard/dashboard.module";
import { MediaModule } from "./media/media.module";
import { ProjectsModule } from "./projects/projects.module";
import { PublicModule } from "./public/public.module";
import { RequestsModule } from "./requests/requests.module";
import { TransparencyModule } from "./transparency/transparency.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    DatabaseModule,
    AuthModule,
    ContributionsModule,
    ContentModule,
    MediaModule,
    ProjectsModule,
    DashboardModule,
    PublicModule,
    RequestsModule,
    TransparencyModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
