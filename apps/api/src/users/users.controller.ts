import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from "@nestjs/common";

import { AdminProtected } from "../auth/admin-protected.decorator";
import type { AdminHttpRequest, RequestContext } from "../auth/auth.types";
import { Permission } from "../auth/permissions";
import {
  CreateAdminUserDto,
  UpdateAdminUserDto,
  UpdateAdminUserStatusDto,
} from "./users.dto";
import { UsersService } from "./users.service";

@Controller("admin/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @AdminProtected(Permission.USERS_VIEW)
  list() {
    return this.usersService.list();
  }

  @Post()
  @AdminProtected(Permission.USERS_CREATE)
  create(
    @Body() dto: CreateAdminUserDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.usersService.create(
      dto,
      request.adminUser!,
      this.requestContext(request),
    );
  }

  @Patch(":id")
  @AdminProtected(Permission.USERS_UPDATE)
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAdminUserDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.usersService.update(
      id,
      dto,
      request.adminUser!,
      this.requestContext(request),
    );
  }

  @Patch(":id/status")
  @AdminProtected(Permission.USERS_DEACTIVATE)
  updateStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAdminUserStatusDto,
    @Req() request: AdminHttpRequest,
  ) {
    return this.usersService.updateStatus(
      id,
      dto,
      request.adminUser!,
      this.requestContext(request),
    );
  }

  private requestContext(request: AdminHttpRequest): RequestContext {
    const userAgent = request.headers["user-agent"];

    return {
      ipAddress: request.ip ?? request.socket?.remoteAddress,
      userAgent:
        typeof userAgent === "string"
          ? userAgent
          : Array.isArray(userAgent)
            ? userAgent[0]
            : undefined,
    };
  }
}
