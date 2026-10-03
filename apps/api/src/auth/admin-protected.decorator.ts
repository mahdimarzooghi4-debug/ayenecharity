import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";

import { REQUIRED_PERMISSIONS_KEY } from "./auth.constants";
import { Permission } from "./permissions";
import { PermissionsGuard } from "./permissions.guard";
import { SessionAuthGuard } from "./session-auth.guard";

export function AdminProtected(...permissions: Permission[]): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions),
    UseGuards(SessionAuthGuard, PermissionsGuard),
  );
}
