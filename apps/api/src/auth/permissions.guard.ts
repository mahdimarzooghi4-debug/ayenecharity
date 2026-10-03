import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { REQUIRED_PERMISSIONS_KEY } from "./auth.constants";
import type { AdminHttpRequest } from "./auth.types";
import { hasPermissions, Permission } from "./permissions";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AdminHttpRequest>();
    const user = request.adminUser;

    if (!user || !hasPermissions(user.role, required)) {
      throw new ForbiddenException("Insufficient permissions.");
    }

    return true;
  }
}
