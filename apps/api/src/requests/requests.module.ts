import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { RequestRateLimitGuard } from "./request-rate-limit.guard";
import {
  AdminRequestsController,
  PublicRequestsController,
} from "./requests.controller";
import { RequestsService } from "./requests.service";

@Module({
  imports: [AuthModule],
  controllers: [
    PublicRequestsController,
    AdminRequestsController,
  ],
  providers: [
    RequestsService,
    RequestRateLimitGuard,
  ],
})
export class RequestsModule {}
