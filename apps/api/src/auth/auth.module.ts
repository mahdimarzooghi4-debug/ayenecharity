import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { LoginRateLimiterService } from "./login-rate-limiter.service";
import { PermissionsGuard } from "./permissions.guard";
import { SessionAuthGuard } from "./session-auth.guard";

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    LoginRateLimiterService,
    SessionAuthGuard,
    PermissionsGuard,
  ],
  exports: [AuthService, SessionAuthGuard, PermissionsGuard],
})
export class AuthModule {}
