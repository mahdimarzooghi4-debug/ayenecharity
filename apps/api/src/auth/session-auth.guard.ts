import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

import { AuthService } from "./auth.service";
import { ADMIN_SESSION_COOKIE } from "./auth.constants";
import type { AdminHttpRequest } from "./auth.types";
import { readCookie } from "./session-token";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminHttpRequest>();
    const token = readCookie(request.headers.cookie, ADMIN_SESSION_COOKIE);

    if (!token) {
      throw new UnauthorizedException("Authentication required.");
    }

    request.adminUser = await this.authService.authenticateSession(token);
    return true;
  }
}
