import { Module } from "@nestjs/common";

import { RequestRateLimitGuard } from "./request-rate-limit.guard";
import {
  AdminRequestsController,
  PublicRequestsController,
} from "./requests.controller";
import { RequestsService } from "./requests.service";

@Module({
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
